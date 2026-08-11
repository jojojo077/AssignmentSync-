using AMS.Api.Middleware;
using AMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AMS.Api.Controllers;

[ApiController]
[Route("api/canvas")]
[RequireAuth]
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
