using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AMS.Api.Tests;

/// <summary>
/// Spins up the real app in-memory (no real network port) via
/// WebApplicationFactory, then hits it with a real HttpClient. This mirrors
/// the Supertest-against-Express pattern from the original Node scaffold.
/// </summary>
public class HealthControllerTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetHealth_ReturnsOkWithStatus()
    {
        var response = await _client.GetAsync("/api/health");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();

        Assert.Equal("ok", body?.Status);
        Assert.NotNull(body?.Timestamp);
    }

    [Fact]
    public async Task UnknownRoute_Returns404()
    {
        var response = await _client.GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private record HealthResponse(string Status, double UptimeSeconds, string Timestamp);
}
