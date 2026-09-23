using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AMS.Api.Middleware;

/// <summary>
/// Placeholder auth guard — checks for a Bearer header but does not yet
/// verify a real token. Wire this up to real JWT validation once
/// AuthController actually issues tokens (add the
/// Microsoft.AspNetCore.Authentication.JwtBearer package and switch this
/// to a standard [Authorize] attribute + AddJwtBearer() in Program.cs).
/// Left as a simple attribute so it's obvious where real auth plugs in.
/// </summary>
public class RequireAuthAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.HttpContext.Items["AuthenticatedEmail"] is not string)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                error = new { message = "Missing or malformed Authorization header" },
            });
        }

    }
}
