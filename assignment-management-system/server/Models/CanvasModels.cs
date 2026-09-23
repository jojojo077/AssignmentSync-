using System.Text.Json.Serialization;

namespace AMS.Api.Models;

/// <summary>Subset of Canvas's course object we actually use.</summary>
public class CanvasCourse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("course_code")]
    public string? CourseCode { get; set; }
}

public class CanvasSubmission
{
    [JsonPropertyName("workflow_state")]
    public string? WorkflowState { get; set; }

    [JsonPropertyName("submitted_at")]
    public DateTimeOffset? SubmittedAt { get; set; }
}

/// <summary>Subset of Canvas's assignment object we actually use.</summary>
public class CanvasAssignment
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("due_at")]
    public DateTimeOffset? DueAt { get; set; }

    [JsonPropertyName("points_possible")]
    public double? PointsPossible { get; set; }

    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; set; }

    public CanvasSubmission? Submission { get; set; }
}

/// <summary>
/// One course plus its assignments — the shape the dashboard renders,
/// mirroring what the previous Node service returned from
/// getAllUpcomingAssignments().
/// </summary>
public class CourseWithAssignments
{
    public long CourseId { get; set; }

    public string CourseName { get; set; } = string.Empty;

    public IReadOnlyList<CanvasAssignment> Assignments { get; set; } = [];
}

public class CourseProgressSummary
{
    public long CourseId { get; set; }
    public string CourseName { get; set; }
    public int CompletedCount { get; set; }
    public int OverdueCount { get; set; }
    public int UncompletedCount { get; set; }
    public int TotalCount { get; set; }
    public List<AssignmentWithStatus> Assignments { get; set; } = [];
}
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AssignmentStatus { Completed, Overdue, Uncompleted }

public class AssignmentWithStatus
{
    public CanvasAssignment Assignment { get; set; } = null!;
    public AssignmentStatus Status { get; set; }
}

/// <summary>Author metadata on Canvas announcements.</summary>
public class CanvasAuthor
{
    [JsonPropertyName("display_name")]
    public string? DisplayName { get; set; }

    [JsonPropertyName("avatar_image_url")]
    public string? AvatarImageUrl { get; set; }
}

/// <summary>Subset of Canvas's announcement / discussion topic object.</summary>
public class CanvasAnnouncement
{
    public long Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("posted_at")]
    public DateTimeOffset? PostedAt { get; set; }

    [JsonPropertyName("context_code")]
    public string? ContextCode { get; set; }

    [JsonPropertyName("user_name")]
    public string? UserName { get; set; }

    public CanvasAuthor? Author { get; set; }

    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; set; }

    [JsonPropertyName("read_state")]
    public string? ReadState { get; set; }

    public long? CourseId { get; set; }

    public string? CourseName { get; set; }
}

/// <summary>Canvas user profile representation.</summary>
public class CanvasUserProfile
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}

/// <summary>Payload sent by the client to create a calendar event.</summary>
public class CreateCalendarEventRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("due_at")]
    public DateTimeOffset? DueAt { get; set; }

    [JsonPropertyName("courseId")]
    public long? CourseId { get; set; }

    [JsonPropertyName("courseName")]
    public string? CourseName { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

/// <summary>Subset of Canvas's Calendar Event object.</summary>
public class CanvasCalendarEvent
{
    public long Id { get; set; }

    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("start_at")]
    public DateTimeOffset? StartAt { get; set; }

    [JsonPropertyName("end_at")]
    public DateTimeOffset? EndAt { get; set; }

    public string? Description { get; set; }

    [JsonPropertyName("context_code")]
    public string? ContextCode { get; set; }

    [JsonPropertyName("workflow_state")]
    public string? WorkflowState { get; set; }

    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; set; }

    // Client-convenience fields
    [JsonPropertyName("courseId")]
    public long? CourseId { get; set; }

    [JsonPropertyName("courseName")]
    public string? CourseName { get; set; }

    [JsonPropertyName("isCustom")]
    public bool IsCustom { get; set; } = true;
}


