using System.Net.Http.Headers;
using System.Net.Http.Json;
using AMS.Api.Config;
using AMS.Api.Middleware;
using AMS.Api.Models;
using Microsoft.Extensions.Options;

using System.Globalization;
using System.Reflection.Metadata;
using System.Text.Json;
using System.Threading.Tasks;


namespace AMS.Api.Services;

/// <summary>
/// Thin wrapper around the Canvas LMS REST API.
/// Docs: https://canvas.instructure.com/doc/api/ (also linked from
/// https://instructure.github.io/)
///
/// Registered as a typed HttpClient (see Program.cs), so a fresh HttpClient
/// is injected per instance and configured once here in the constructor.
///
/// Auth model right now: a single access token from configuration (fine for
/// local dev against your own Canvas account). Before this ships to real
/// users, swap to Canvas's OAuth2 authorization-code flow so each student
/// authorises their own account and we store per-user tokens instead of one
/// shared token.
/// </summary>
public class CanvasService : ICanvasService
{
    private readonly HttpClient _http;
    private readonly bool _configured;

    public CanvasService(HttpClient http, IOptions<CanvasOptions> options)
    {
        _http = http;
        var canvas = options.Value;
        _configured = canvas.IsConfigured;

        if (_configured)
        {
            _http.BaseAddress = new Uri($"{canvas.BaseUrl.TrimEnd('/')}/api/v1/");
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", canvas.AccessToken);
            _http.DefaultRequestHeaders.UserAgent.ParseAdd("AssignmentManagementSystem/1.0");
        }
    }

    private void EnsureConfigured()
    {
        if (!_configured)
        {
            throw new ApiException(500,
                "Canvas API is not configured. Set Canvas:BaseUrl and Canvas:AccessToken " +
                "(appsettings.json, env vars, or dotnet user-secrets).");
        }
    }

    public async Task<IReadOnlyList<CanvasCourse>> GetCoursesAsync()
    {
        EnsureConfigured();

        return await GetJsonOrThrowAsync<List<CanvasCourse>>(
            "courses?enrollment_state=active&per_page=100") ?? [];
    }

    public async Task<IReadOnlyList<CanvasCourse>> GetAllCoursesAsync()
    {
        EnsureConfigured();
        return await GetJsonOrThrowAsync<List<CanvasCourse>>(
            "courses?&per_page=100") ?? [];
    }

    public async Task<IReadOnlyList<CanvasAssignment>> GetAssignmentsForCourseAsync(long courseId)
    {
        EnsureConfigured();

        return await GetJsonOrThrowAsync<List<CanvasAssignment>>(
            $"courses/{courseId}/assignments?per_page=100&order_by=due_at&include[]=submission") ?? [];
    }

    public enum AssignmentStatus { Completed, Overdue, Uncompleted }

    public static AssignmentStatus Categorize(CanvasAssignment assignment, DateTimeOffset now)
    {
        bool isCompleted = assignment.Submission?.WorkflowState is "submitted" or "graded" or "pending_review";
        if (isCompleted) return AssignmentStatus.Completed;

        return assignment.DueAt is not null && assignment.DueAt < now 
            ? AssignmentStatus.Overdue : AssignmentStatus.Uncompleted;
    }

    /// <summary>
    /// GetFromJsonAsync's built-in error handling throws away the response
    /// body on a non-success status, so all you ever see is "403 Forbidden"
    /// with no explanation. Canvas usually puts a specific reason in the
    /// body (e.g. "Invalid access token", "insufficient scope") - this reads
    /// it and puts it in the exception message instead of discarding it.
    /// </summary>
    private async Task<T?> GetJsonOrThrowAsync<T>(string requestUri)
    {
        var response = await _http.GetAsync(requestUri);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new ApiException((int)response.StatusCode,
                $"Canvas API request to '{requestUri}' failed with {(int)response.StatusCode} " +
                $"{response.ReasonPhrase}: {body}");
        }

        return await response.Content.ReadFromJsonAsync<T>();
    }

    /// <summary>
    /// Fetch active courses, then fan out to fetch each course's assignments
    /// in parallel, and flatten into one list. Feeds the "aggregate workload
    /// across all papers" dashboard requirement.
    /// </summary>
    public async Task<IReadOnlyList<CourseWithAssignments>> GetAllUpcomingAssignmentsAsync()
    {
        var courses = await GetCoursesAsync();

        var assignmentTasks = courses.Select(async course =>
        {
            try
            {
                return await GetAssignmentsForCourseAsync(course.Id);
            }
            catch
            {
                return (IReadOnlyList<CanvasAssignment>)[];
            }
        });

        var assignmentLists = await Task.WhenAll(assignmentTasks);

        return courses.Select((course, i) => new CourseWithAssignments
        {
            CourseId = course.Id,
            CourseName = course.Name,
            Assignments = assignmentLists[i],
        }).ToList();
    }

    /// <summary>
    /// Fetch recent announcements across all active courses.
    /// Uses Canvas's announcements endpoint with context_codes for enrolled courses.
    /// </summary>
    public async Task<IReadOnlyList<CanvasAnnouncement>> GetRecentAnnouncementsAsync()
    {
        EnsureConfigured();

        var courses = await GetCoursesAsync();
        if (courses.Count == 0)
        {
            return [];
        }

        var courseMap = courses.ToDictionary(c => $"course_{c.Id}", c => c);
        var queryParams = string.Join("&", courses.Select(c => $"context_codes[]=course_{c.Id}"));

        try
        {
            var announcements = await GetJsonOrThrowAsync<List<CanvasAnnouncement>>(
                $"announcements?{queryParams}&per_page=30") ?? [];

            foreach (var announcement in announcements)
            {
                if (!string.IsNullOrEmpty(announcement.ContextCode) &&
                    courseMap.TryGetValue(announcement.ContextCode, out var matchedCourse))
                {
                    announcement.CourseId = matchedCourse.Id;
                    announcement.CourseName = matchedCourse.Name;
                }

                // If user_name is null, fallback to author display name
                if (string.IsNullOrEmpty(announcement.UserName) && announcement.Author?.DisplayName != null)
                {
                    announcement.UserName = announcement.Author.DisplayName;
                }
            }

            return announcements
                .OrderByDescending(a => a.PostedAt ?? DateTimeOffset.MinValue)
                .ToList();
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception)
        {
            return [];
        }
    }

    /// <summary>
    /// Creates a calendar event directly in Canvas LMS via POST /api/v1/calendar_events.
    /// If creating in a course calendar is forbidden (student token), falls back to the user's personal calendar.
    /// </summary>
    public async Task<CanvasCalendarEvent> CreateCalendarEventAsync(CreateCalendarEventRequest request)
    {
        EnsureConfigured();

        string? contextCode = null;

        if (request.CourseId.HasValue && request.CourseId.Value != 99999)
        {
            contextCode = $"course_{request.CourseId.Value}";
        }
        else
        {
            try
            {
                var user = await GetJsonOrThrowAsync<CanvasUserProfile>("users/self");
                if (user != null && user.Id > 0)
                {
                    contextCode = $"user_{user.Id}";
                }
            }
            catch
            {
                // Canvas will default to current user if context_code is not specified
            }
        }

        var payload = new Dictionary<string, object?>
        {
            ["calendar_event"] = new Dictionary<string, object?>
            {
                ["title"] = request.Name,
                ["start_at"] = request.DueAt?.ToString("o"),
                ["end_at"] = request.DueAt?.AddHours(1).ToString("o") ?? request.DueAt?.ToString("o"),
                ["description"] = request.Description ?? "",
                ["context_code"] = contextCode
            }
        };

        var response = await _http.PostAsJsonAsync("calendar_events", payload);

        // If course context returned 401 or 403 (student not permitted to post course-wide event), fall back to personal calendar
        if (!response.IsSuccessStatusCode &&
            (response.StatusCode == System.Net.HttpStatusCode.Unauthorized || response.StatusCode == System.Net.HttpStatusCode.Forbidden) &&
            contextCode != null && contextCode.StartsWith("course_"))
        {
            string? userContext = null;
            try
            {
                var user = await GetJsonOrThrowAsync<CanvasUserProfile>("users/self");
                if (user != null && user.Id > 0)
                {
                    userContext = $"user_{user.Id}";
                }
            }
            catch { }

            var fallbackPayload = new Dictionary<string, object?>
            {
                ["calendar_event"] = new Dictionary<string, object?>
                {
                    ["title"] = request.Name,
                    ["start_at"] = request.DueAt?.ToString("o"),
                    ["end_at"] = request.DueAt?.AddHours(1).ToString("o") ?? request.DueAt?.ToString("o"),
                    ["description"] = request.Description ?? "",
                    ["context_code"] = userContext
                }
            };

            response = await _http.PostAsJsonAsync("calendar_events", fallbackPayload);
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new ApiException((int)response.StatusCode, $"Failed to create calendar event in Canvas: {errorBody}");
        }

        var createdEvent = await response.Content.ReadFromJsonAsync<CanvasCalendarEvent>();
        if (createdEvent == null)
        {
            throw new ApiException(500, "Canvas returned empty response for created calendar event.");
        }

        createdEvent.CourseId = request.CourseId ?? 99999;
        createdEvent.CourseName = !string.IsNullOrWhiteSpace(request.CourseName) ? request.CourseName : "Personal Event";
        createdEvent.IsCustom = true;

        return createdEvent;
    }

    /// <summary>
    /// Deletes a calendar event in Canvas LMS via DELETE /api/v1/calendar_events/{eventId}.
    /// Treats 404 as success (since the event is already deleted on Canvas).
    /// </summary>
    public async Task<bool> DeleteCalendarEventAsync(long eventId)
    {
        EnsureConfigured();

        var response = await _http.DeleteAsync($"calendar_events/{eventId}");
        return response.IsSuccessStatusCode || response.StatusCode == System.Net.HttpStatusCode.NotFound;
    }

    /// <summary>
    /// Fetches calendar events for the student across all enrolled courses and personal calendar.
    /// Excludes any events with workflow_state == 'deleted'.
    /// </summary>
    public async Task<IReadOnlyList<CanvasCalendarEvent>> GetCalendarEventsAsync()
    {
        EnsureConfigured();

        try
        {
            var events = await GetJsonOrThrowAsync<List<CanvasCalendarEvent>>(
                "calendar_events?type=event&all_events=true&per_page=100") ?? [];

            // Filter out any deleted events
            events = events
                .Where(ev => !string.Equals(ev.WorkflowState, "deleted", StringComparison.OrdinalIgnoreCase))
                .ToList();

            foreach (var ev in events)
            {
                ev.IsCustom = true;
                if (ev.ContextCode != null && ev.ContextCode.StartsWith("course_") &&
                    long.TryParse(ev.ContextCode.Replace("course_", ""), out var cId))
                {
                    ev.CourseId = cId;
                }
                else
                {
                    ev.CourseId = 99999;
                    ev.CourseName = "Personal Event";
                }
            }

            return events;
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception)
        {
            return [];
        }
    }

    public async Task<IReadOnlyList<CourseWithAssignments>> SearchAssignmentsByCourseCodeAsync(string courseCode)
    {
        if (string.IsNullOrWhiteSpace(courseCode))
        {
            throw new ApiException(400, "Course code is required.");
        }

        EnsureConfigured();

        var courses = await GetAllCoursesAsync();

        var matches =
            courses.Where(c => c.CourseCode != null && c.CourseCode.Contains(courseCode, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var assignmentTasks = matches.Select(async course =>
        {
            try
            {
                return await GetAssignmentsForCourseAsync(course.Id);
            }
            catch
            {
                return (IReadOnlyList<CanvasAssignment>)[];
            }
        });

        var assignmentLists = await Task.WhenAll(assignmentTasks);

        return matches.Select((course,i) => new CourseWithAssignments
        {
            CourseId = course.Id,
            CourseName = course.Name,
            Assignments = assignmentLists[i],
        }).ToList();

    }
    
}