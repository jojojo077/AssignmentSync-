using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace AMS.Api.Tests;

public class CanvasControllerTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetCourses_WithoutAuthHeader_StillReachesController()
    {
        // The [RequireAuth] guard was removed for now (see CanvasController) since
        // there's no login flow yet to issue a token. This should reach the
        // controller and fail on missing Canvas config, not on missing auth.
        var response = await _client.GetAsync("/api/canvas/courses");

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetCourses_WithNoCanvasConfig_Returns500WithMessage()
    {
        using var clientWithoutConfig = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((ctx, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Canvas:BaseUrl"] = "",
                    ["Canvas:AccessToken"] = "",
                });
            });
        }).CreateClient();

        var response = await clientWithoutConfig.GetAsync("/api/canvas/courses");

        // When Canvas:BaseUrl/AccessToken is empty,
        // CanvasService.EnsureConfigured() should reject the call cleanly
        // rather than throwing a raw HttpRequestException.
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Canvas API is not configured", body);
    }

    [Fact]
    public async Task GetAnnouncements_WithoutAuthHeader_StillReachesController()
    {
        var response = await _client.GetAsync("/api/canvas/announcements");

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.NotFound, response.StatusCode);
    }
}
