using AMS.Api.Models;
using AMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AMS.Api.Controllers;

// [ApiController] gives automatic 400 responses for invalid models using the
// [Required]/[EmailAddress] attributes on the request models.

[ApiController]
[Route("api/auth")]
public class AuthController(UserFileStore userStore, AuthTokenService tokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = await userStore.RegisterAsync(request);
        if (!user.Succeeded)
        {
            var message = user.Error == "canvas-token-already-assigned"
                ? "That Canvas access token is already assigned to another user."
                : "An account with that email already exists.";
            return Conflict(new { message });
        }

        return StatusCode(StatusCodes.Status201Created, new
        {
            token = tokenService.Create(user.User!.Email),
            user = new { email = user.User.Email, name = user.User.Name }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await userStore.AuthenticateAndSetCanvasTokenAsync(
            request.Email,
            request.Password,
            request.CanvasAccessToken);
        if (!result.Succeeded)
        {
            if (result.Error == "canvas-token-already-assigned")
            {
                return Conflict(new { message = "That Canvas access token is already assigned to another user." });
            }

            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(new
        {
            token = tokenService.Create(result.User!.Email),
            user = new { email = result.User.Email, name = result.User.Name }
        });
    }

    [HttpPut("canvas-token")]
    public async Task<IActionResult> SetCanvasToken([FromBody] CanvasTokenRequest request)
    {
        var email = HttpContext.Items["AuthenticatedEmail"] as string;
        if (email is null)
        {
            return Unauthorized();
        }

        return await userStore.SetCanvasTokenAsync(email, request.AccessToken)
            ? NoContent()
            : NotFound();
    }
}
