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
