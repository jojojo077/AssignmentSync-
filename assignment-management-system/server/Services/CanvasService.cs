using System.Net.Http.Headers;
using System.Net.Http.Json;
using AMS.Api.Config;
using AMS.Api.Middleware;
using AMS.Api.Models;
using Microsoft.Extensions.Options;

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

    public async Task<IReadOnlyList<CanvasAssignment>> GetAssignmentsForCourseAsync(long courseId)
    {
        EnsureConfigured();

        return await GetJsonOrThrowAsync<List<CanvasAssignment>>(
            $"courses/{courseId}/assignments?per_page=100&order_by=due_at") ?? [];
    }

    /// <summary>
    /// GetFromJsonAsync's built-in error handling throws away the response
    /// body on a non-success status, so all you ever see is "403 Forbidden"
    /// with no explanation. Canvas usually puts a specific reason in the
    /// body (e.g. "Invalid access token", "insufficient scope") — this reads
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
}