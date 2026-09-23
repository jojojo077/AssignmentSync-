using AMS.Api.Config;
using AMS.Api.Middleware;
using AMS.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Controllers ([ApiController] classes in Controllers/)
builder.Services.AddControllers();

// Strongly-typed config sections (appsettings.json / env vars / user-secrets)
builder.Services.Configure<CanvasOptions>(builder.Configuration.GetSection(CanvasOptions.SectionName));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddSingleton<UserFileStore>();
builder.Services.AddSingleton<AuthTokenService>();
builder.Services.AddHttpContextAccessor();

// Typed HttpClient for Canvas — see CanvasService's constructor for where
// BaseAddress/auth header get set from CanvasOptions.
builder.Services.AddHttpClient<ICanvasService, CanvasService>();

var clientOrigin = builder.Configuration["Cors:ClientOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
        policy.WithOrigins(clientOrigin).AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// Keep this first in the pipeline so it catches exceptions from everything
// downstream (CORS, routing, controllers).
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Validate bearer tokens before controllers access user-specific records.
app.Use(async (context, next) =>
{
    var header = context.Request.Headers.Authorization.ToString();
    if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        var tokenService = context.RequestServices.GetRequiredService<AuthTokenService>();
        var email = tokenService.Validate(header[7..].Trim());
        if (email is not null)
        {
            context.Items["AuthenticatedEmail"] = email;
        }
    }

    await next();
});

app.UseCors("Client");
app.MapControllers();

app.Run();

// Exposed so the (not-yet-added) test project can spin this app up via
// WebApplicationFactory<Program> for integration tests.
public partial class Program { }
