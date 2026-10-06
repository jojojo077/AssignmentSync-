// CanvasControllerTests.cs
// Requirements:
//   NFR-04 Authentication and communication must be secure
//          AC: protected resources cannot be accessed without authentication
//
// Every test calls a real /api/canvas endpoint on the in-memory app with no
// bearer token and checks that the request is refused before any Canvas data
// is fetched or any request body is validated.

using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace AMS.Api.Tests;

public class CanvasControllerTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    // TC-84 | NFR-04 | GET /api/canvas/courses without a token returns 401
    [Fact]
    public async Task GetCourses_WithoutAuthHeader_ReturnsUnauthorized()
    {
        // Test Case: Canvas data is never available without a valid user token.
        var response = await _client.GetAsync("/api/canvas/courses");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // TC-85 | NFR-04 | Missing Canvas config still returns 401, not a config error
    [Fact]
    public async Task GetCourses_WithNoCanvasConfigAndNoAuth_ReturnsUnauthorized()
    {
        // Test Case: Authentication is checked before the Canvas configuration is read.
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

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // TC-86 | NFR-04 | GET /api/canvas/announcements without a token returns 401
    [Fact]
    public async Task GetAnnouncements_WithoutAuthHeader_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/canvas/announcements");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // TC-87 | NFR-04 | GET /api/canvas/events without a token returns 401
    [Fact]
    public async Task GetEvents_WithoutAuthHeader_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/canvas/events");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // TC-88 | NFR-04 | POST /api/canvas/events without a token returns 401
    [Fact]
    public async Task CreateEvent_WithoutAuthHeader_ReturnsUnauthorized()
    {
        // Test Case: Authentication is checked before Canvas mutation validation.
        var response = await _client.PostAsJsonAsync("/api/canvas/events", new { name = "" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
