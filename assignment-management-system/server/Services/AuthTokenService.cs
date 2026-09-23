using System.Security.Cryptography;
using System.Text;

namespace AMS.Api.Services;

/// <summary>
/// Creates and validates signed bearer tokens that contain only a user email and expiry.
/// </summary>
public sealed class AuthTokenService
{
    private readonly byte[] _secret;
    private readonly int _expiresInDays;

    /// <summary>
    /// Loads the signing secret and token lifetime from configuration.
    /// </summary>
    public AuthTokenService(IConfiguration configuration)
    {
        var configuredSecret = configuration["Jwt:Secret"];
        _secret = Encoding.UTF8.GetBytes(string.IsNullOrWhiteSpace(configuredSecret)
            ? "local-development-secret-change-me"
            : configuredSecret);
        _expiresInDays = int.TryParse(configuration["Jwt:ExpiresInDays"], out var days) ? days : 7;
    }

    /// <summary>
    /// Issues a signed token for one normalized email address.
    /// </summary>
    public string Create(string email)
    {
        var expires = DateTimeOffset.UtcNow.AddDays(_expiresInDays).ToUnixTimeSeconds();
        var payload = $"{UserFileStore.NormalizeEmail(email)}|{expires}";
        return $"{Base64Url(payload)}.{Base64Url(Sign(payload))}";
    }

    /// <summary>
    /// Returns the email only when the signature and expiry are valid.
    /// </summary>
    public string? Validate(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 2)
        {
            return null;
        }

        var payload = DecodeBase64Url(parts[0]);
        var expectedSignature = Base64Url(Sign(payload));
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(parts[1]), Encoding.UTF8.GetBytes(expectedSignature)))
        {
            return null;
        }

        var payloadParts = payload.Split('|');
        return payloadParts.Length == 2 &&
               long.TryParse(payloadParts[1], out var expires) &&
               expires > DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            ? payloadParts[0]
            : null;
    }

    /// <summary>
    /// Signs a token payload with HMAC-SHA256.
    /// </summary>
    private byte[] Sign(string payload) => HMACSHA256.HashData(_secret, Encoding.UTF8.GetBytes(payload));

    /// <summary>
    /// Encodes token components without URL-unsafe characters.
    /// </summary>
    private static string Base64Url(string value) => Base64Url(Encoding.UTF8.GetBytes(value));

    /// <summary>
    /// Encodes binary token components without URL-unsafe characters.
    /// </summary>
    private static string Base64Url(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    /// <summary>
    /// Decodes a URL-safe token component.
    /// </summary>
    private static string DecodeBase64Url(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Encoding.UTF8.GetString(Convert.FromBase64String(padded));
    }
}
