using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace AMS.Api.Tests;

public class CanvasControllerTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetCourses_WithoutAuthHeader_ReturnsUnauthorized()
    {
        // Test Case: Canvas data is never available without a valid user token.
        var response = await _client.GetAsync("/api/canvas/courses");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetCourses_WithNoCanvasConfigAndNoAuth_ReturnsUnauthorized()
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

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetAnnouncements_WithoutAuthHeader_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/canvas/announcements");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetEvents_WithoutAuthHeader_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/canvas/events");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateEvent_WithoutAuthHeader_ReturnsUnauthorized()
    {
        // Test Case: Authentication is checked before Canvas mutation validation.
        var response = await _client.PostAsJsonAsync("/api/canvas/events", new { name = "" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
