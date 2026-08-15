using System.Text.Json;

namespace AMS.Api.Middleware;

/// <summary>
/// Sits at the front of the pipeline (see Program.cs) and turns any
/// exception into a consistent JSON error response, the same shape
/// regardless of where in the app it was thrown. Mirrors the
/// errorHandler.js pattern from the original Node scaffold.
/// </summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, IHostEnvironment env, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var statusCode = ex is ApiException apiEx ? apiEx.StatusCode : StatusCodes.Status500InternalServerError;

            if (statusCode >= 500)
            {
                logger.LogError(ex, "Unhandled exception");
            }

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = statusCode;

            var payload = new Dictionary<string, object?>
            {
                ["error"] = new Dictionary<string, object?>
                {
                    ["message"] = ex.Message,
                    ["stack"] = env.IsDevelopment() ? ex.StackTrace : null,
                },
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
    }
}
