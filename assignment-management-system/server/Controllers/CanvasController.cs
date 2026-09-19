using AMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AMS.Api.Controllers;

// TODO: put [RequireAuth] (or [Authorize] once real JWT auth is wired up)
// back on this controller once AuthController actually issues tokens.
// Left open for now — with no login flow yet, the client has no token to
// send, so a guard here just blocks every request with 401.
[ApiController]
[Route("api/canvas")]
public class CanvasController(ICanvasService canvasService) : ControllerBase
{
    [HttpGet("courses")]
    public async Task<IActionResult> GetCourses()
    {
        var courses = await canvasService.GetCoursesAsync();
        return Ok(courses);
    }

    [HttpGet("assignments")]
    public async Task<IActionResult> GetUpcomingAssignments()
    {
        var data = await canvasService.GetAllUpcomingAssignmentsAsync();
        return Ok(data);
    }

    [HttpGet("assignments/search")]
    public async Task<IActionResult> SearchAssignmentsByCourseCode([FromQuery] string courseCode)
    {
        if (string.IsNullOrWhiteSpace(courseCode))
        {
            return BadRequest(new { message = "courseCode query parameter is required." });
        }

        var data = await canvasService.SearchAssignmentsByCourseCodeAsync(courseCode);
        return Ok(data);
    }

    [HttpGet("announcements")]
    public async Task<IActionResult> GetRecentAnnouncements()
    {
        var data = await canvasService.GetRecentAnnouncementsAsync();
        return Ok(data);
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetCalendarEvents()
    {
        var data = await canvasService.GetCalendarEventsAsync();
        return Ok(data);
    }

    [HttpPost("events")]
    public async Task<IActionResult> CreateCalendarEvent([FromBody] Models.CreateCalendarEventRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Event title is required." });
        }

        var created = await canvasService.CreateCalendarEventAsync(request);
        return Ok(created);
    }

    [HttpDelete("events/{id}")]
    public async Task<IActionResult> DeleteCalendarEvent(long id)
    {
        var success = await canvasService.DeleteCalendarEventAsync(id);
        return Ok(new { success, id });
    }
}
