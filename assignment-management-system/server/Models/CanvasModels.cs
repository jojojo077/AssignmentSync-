using System.Text.Json.Serialization;

namespace AMS.Api.Models;

/// <summary>Subset of Canvas's course object we actually use.</summary>
public class CanvasCourse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
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

