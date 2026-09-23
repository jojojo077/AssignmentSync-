using AMS.Api.Middleware;
using AMS.Api.Models;
using AMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AMS.Api.Controllers;

/// <summary>
/// Reads and writes the semester checklist for the authenticated user.
/// </summary>
[ApiController]
[Route("api/progress")]
[RequireAuth]
public class ProgressController(UserFileStore userStore) : ControllerBase
{
    /// <summary>
    /// Returns only the checklist IDs stored on the caller's user record.
    /// </summary>
    [HttpGet("checklist")]
    public async Task<IActionResult> GetChecklist()
    {
        var email = HttpContext.Items["AuthenticatedEmail"] as string;
        var user = email is null ? null : await userStore.FindByEmailAsync(email);
        return user is null ? NotFound() : Ok(user.CompletedAssignmentIds);
    }

    /// <summary>
    /// Replaces only the caller's checklist IDs in the user text file.
    /// </summary>
    [HttpPut("checklist")]
    public async Task<IActionResult> SetChecklist([FromBody] CompletedAssignmentsRequest request)
    {
        var email = HttpContext.Items["AuthenticatedEmail"] as string;
        if (email is null)
        {
            return Unauthorized();
        }

        var saved = await userStore.SetCompletedAssignmentsAsync(email, request.AssignmentIds);
        return saved is null ? NotFound() : Ok(saved);
    }
}
