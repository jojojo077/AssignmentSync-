using System.Security.Cryptography;
using System.Text.Json;
using AMS.Api.Models;

namespace AMS.Api.Services;

/// <summary>
/// Stores authentication and user-specific application data in a gitignored text file.
/// The text file uses JSON so records can be read and updated without fragile string parsing.
/// </summary>
public sealed class UserFileStore
{
    private static readonly SemaphoreSlim FileLock = new(1, 1);
    private readonly string _filePath;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    /// <summary>
    /// Creates the store and chooses the configured file path or a local data file.
    /// </summary>
    public UserFileStore(IConfiguration configuration)
    {
        _filePath = configuration["Auth:DataFilePath"] ?? Path.Combine(AppContext.BaseDirectory, "data", "users.txt");
    }

    /// <summary>
    /// Registers one user and rejects duplicate normalized email addresses.
    /// </summary>
    public async Task<RegisterStoreResult> RegisterAsync(RegisterRequest request)
    {
        await FileLock.WaitAsync();
        try
        {
            var records = await ReadAsync();
            var email = NormalizeEmail(request.Email);
            if (records.Any(record => record.Email == email))
            {
                return RegisterStoreResult.EmailAlreadyExists;
            }

            var canvasToken = request.CanvasAccessToken?.Trim() ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(canvasToken) && records.Any(record =>
                    string.Equals(record.CanvasAccessToken, canvasToken, StringComparison.Ordinal)))
            {
                return RegisterStoreResult.CanvasTokenAlreadyAssigned;
            }

            var record = new UserRecord
            {
                Email = email,
                Name = request.Name.Trim(),
                PasswordHash = HashPassword(request.Password),
                CanvasAccessToken = canvasToken
            };
            records.Add(record);
            await WriteAsync(records);
            return new RegisterStoreResult(record);
        }
        finally
        {
            FileLock.Release();
        }
    }

    /// <summary>
    /// Finds one record by normalized email and verifies its password.
    /// </summary>
    public async Task<UserRecord?> AuthenticateAsync(string email, string password)
    {
        await FileLock.WaitAsync();
        try
        {
            var record = (await ReadAsync()).FirstOrDefault(item => item.Email == NormalizeEmail(email));
            return record is not null && VerifyPassword(password, record.PasswordHash) ? record : null;
        }
        finally
        {
            FileLock.Release();
        }
    }

    /// <summary>
    /// Authenticates a user and assigns a Canvas token only when no other user owns it.
    /// </summary>
    public async Task<LoginStoreResult> AuthenticateAndSetCanvasTokenAsync(
        string email,
        string password,
        string? canvasAccessToken)
    {
        await FileLock.WaitAsync();
        try
        {
            var records = await ReadAsync();
            var normalizedEmail = NormalizeEmail(email);
            var user = records.FirstOrDefault(item => item.Email == normalizedEmail);
            if (user is null || !VerifyPassword(password, user.PasswordHash))
            {
                return LoginStoreResult.InvalidCredentials;
            }

            var normalizedToken = canvasAccessToken?.Trim() ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(normalizedToken) && records.Any(item =>
                    item.Email != normalizedEmail &&
                    string.Equals(item.CanvasAccessToken, normalizedToken, StringComparison.Ordinal)))
            {
                return LoginStoreResult.CanvasTokenAlreadyAssigned;
            }

            if (!string.IsNullOrWhiteSpace(normalizedToken) && user.CanvasAccessToken != normalizedToken)
            {
                user.CanvasAccessToken = normalizedToken;
                await WriteAsync(records);
            }

            return new LoginStoreResult(user);
        }
        finally
        {
            FileLock.Release();
        }
    }

    /// <summary>
    /// Finds the only user represented by a previously validated token identity.
    /// </summary>
    public async Task<UserRecord?> FindByEmailAsync(string email)
    {
        await FileLock.WaitAsync();
        try
        {
            return (await ReadAsync()).FirstOrDefault(item => item.Email == NormalizeEmail(email));
        }
        finally
        {
            FileLock.Release();
        }
    }

    /// <summary>
    /// Updates only the Canvas token belonging to the selected user.
    /// </summary>
    public async Task<bool> SetCanvasTokenAsync(string email, string token)
    {
        await FileLock.WaitAsync();
        try
        {
            var records = await ReadAsync();
            var record = records.FirstOrDefault(item => item.Email == NormalizeEmail(email));
            if (record is null)
            {
                return false;
            }

            record.CanvasAccessToken = token.Trim();
            await WriteAsync(records);
            return true;
        }
        finally
        {
            FileLock.Release();
        }
    }

    /// <summary>
    /// Returns the Canvas token stored for exactly one authenticated user.
    /// </summary>
    public async Task<string?> GetCanvasTokenAsync(string email)
    {
        var record = await FindByEmailAsync(email);
        return record?.CanvasAccessToken;
    }

    /// <summary>
    /// Replaces the checklist IDs belonging to the selected user only.
    /// </summary>
    public async Task<IReadOnlyList<string>?> SetCompletedAssignmentsAsync(string email, IEnumerable<string> assignmentIds)
    {
        await FileLock.WaitAsync();
        try
        {
            var records = await ReadAsync();
            var record = records.FirstOrDefault(item => item.Email == NormalizeEmail(email));
            if (record is null)
            {
                return null;
            }

            record.CompletedAssignmentIds = assignmentIds.Distinct(StringComparer.Ordinal).ToList();
            await WriteAsync(records);
            return record.CompletedAssignmentIds;
        }
        finally
        {
            FileLock.Release();
        }
    }

    /// <summary>
    /// Returns a stable lookup key for all user operations.
    /// </summary>
    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    /// <summary>
    /// Reads all records, treating a missing file as an empty store.
    /// </summary>
    private async Task<List<UserRecord>> ReadAsync()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        await using var stream = File.OpenRead(_filePath);
        return await JsonSerializer.DeserializeAsync<List<UserRecord>>(stream, _jsonOptions) ?? [];
    }

    /// <summary>
    /// Writes the complete record set and creates the parent directory when needed.
    /// </summary>
    private async Task WriteAsync(List<UserRecord> records)
    {
        var directory = Path.GetDirectoryName(_filePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, records, _jsonOptions);
    }

    /// <summary>
    /// Creates a salted password hash that can be verified without storing the password.
    /// </summary>
    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"100000:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    /// <summary>
    /// Verifies a password against the stored PBKDF2 representation.
    /// </summary>
    private static bool VerifyPassword(string password, string storedHash)
    {
        var parts = storedHash.Split(':');
        if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations))
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[1]);
        var expected = Convert.FromBase64String(parts[2]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}

/// <summary>
/// One user record persisted in the text file.
/// </summary>
public sealed class UserRecord
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string CanvasAccessToken { get; set; } = string.Empty;
    public List<string> CompletedAssignmentIds { get; set; } = [];
}

/// <summary>
/// Result of account creation, including the reason a record was rejected.
/// </summary>
public readonly record struct RegisterStoreResult(UserRecord? User, string? Error = null)
{
    public static RegisterStoreResult EmailAlreadyExists => new(null, "email-already-exists");
    public static RegisterStoreResult CanvasTokenAlreadyAssigned => new(null, "canvas-token-already-assigned");
    public bool Succeeded => User is not null;
}

/// <summary>
/// Result of login and optional Canvas-token assignment.
/// </summary>
public readonly record struct LoginStoreResult(UserRecord? User, string? Error = null)
{
    public static LoginStoreResult InvalidCredentials => new(null, "invalid-credentials");
    public static LoginStoreResult CanvasTokenAlreadyAssigned => new(null, "canvas-token-already-assigned");
    public bool Succeeded => User is not null;
}
