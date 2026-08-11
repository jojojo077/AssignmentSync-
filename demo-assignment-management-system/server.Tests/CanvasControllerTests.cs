using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AMS.Api.Tests;

public class CanvasControllerTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetCourses_WithoutAuthHeader_Returns401()
    {
        var response = await _client.GetAsync("/api/canvas/courses");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetCourses_WithAuthHeaderButNoCanvasConfig_Returns500WithMessage()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "test-token");

        var response = await _client.GetAsync("/api/canvas/courses");

        // appsettings.json in the test host has empty Canvas:BaseUrl/AccessToken,
        // so CanvasService.EnsureConfigured() should reject the call cleanly
        // rather than throwing a raw HttpRequestException.
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Canvas API is not configured", body);
    }
}
