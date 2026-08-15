namespace AMS.Api.Config;

/// <summary>
/// Canvas LMS connection settings, bound from the "Canvas" section of
/// configuration (appsettings.json, environment variables, or user-secrets).
/// See https://instructure.github.io/ for API docs.
/// </summary>
public class CanvasOptions
{
    public const string SectionName = "Canvas";

    /// e.g. https://aut.instructure.com
    public string BaseUrl { get; set; } = string.Empty;

    /// Personal access token for local dev/testing (Canvas > Account > Settings >
    /// New Access Token). Swap for OAuth2 authorization-code flow before this
    /// touches real student accounts, so each student authorises their own account
    /// instead of everyone sharing one token.
    public string AccessToken { get; set; } = string.Empty;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(BaseUrl) && !string.IsNullOrWhiteSpace(AccessToken);
}
