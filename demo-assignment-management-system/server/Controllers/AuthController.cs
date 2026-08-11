using AMS.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace AMS.Api.Controllers;

// TODO: back these with a real user store (e.g. EF Core + a database) and
// BCrypt password hashing + JWT signing (Microsoft.AspNetCore.Authentication.JwtBearer)
// once auth is built. [ApiController] gives automatic 400 responses for
// invalid models (see the [Required]/[EmailAddress] attributes on the DTOs),
// so we don't need to check ModelState.IsValid by hand here.

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        // TODO: hash password, save user, return created user (without password)
        return StatusCode(501, new { message = "Not implemented yet: Register()" });
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // TODO: verify credentials, sign JWT, return { token, user }
        return StatusCode(501, new { message = "Not implemented yet: Login()" });
    }
}
