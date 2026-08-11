namespace AMS.Api.Middleware;

/// <summary>
/// Throw this anywhere in a service or controller to return a specific HTTP
/// status with a clean message, instead of always falling through to 500:
///   throw new ApiException(404, "Assignment not found");
/// </summary>
public class ApiException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
