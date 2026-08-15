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
}
