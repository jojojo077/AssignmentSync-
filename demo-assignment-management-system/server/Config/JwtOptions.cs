namespace AMS.Api.Config;

/// <summary>
/// Auth settings, bound from the "Jwt" section of configuration.
/// Not wired into real token signing/verification yet — see
/// AuthController and Middleware/AuthGuard for the current stub.
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = string.Empty;
    public int ExpiresInDays { get; set; } = 7;
}
