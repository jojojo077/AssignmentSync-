using System.ComponentModel.DataAnnotations;

namespace AMS.Api.Models;

public class RegisterRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Name { get; set; } = string.Empty;

    // Optional Canvas token saved with this user's private record.
    public string? CanvasAccessToken { get; set; }
}

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    // Canvas token to save on this user's record during login.
    public string? CanvasAccessToken { get; set; }
}

// Request used to replace the Canvas token for the authenticated user.
public class CanvasTokenRequest
{
    [Required]
    public string AccessToken { get; set; } = string.Empty;
}

// Request used to save the authenticated user's semester checklist.
public class CompletedAssignmentsRequest
{
    public List<string> AssignmentIds { get; set; } = [];
}
