// HealthControllerTests.cs
// Requirements:
//   NFR-03 Canvas synchronisation should complete reliably with appropriate
//          error handling
//          AC: failed requests are handled appropriately
//
// Smoke checks that the API starts and answers, and that an unknown route
// fails cleanly with 404 instead of an unhandled error.

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

    // TC-90 | NFR-03 | Health endpoint returns 200 with status "ok"
    [Fact]
    public async Task GetHealth_ReturnsOkWithStatus()
    {
        var response = await _client.GetAsync("/api/health");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();

        Assert.Equal("ok", body?.Status);
        Assert.NotNull(body?.Timestamp);
    }

    // TC-91 | NFR-03 | Unknown route returns 404 Not Found
    [Fact]
    public async Task UnknownRoute_Returns404()
    {
        var response = await _client.GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private record HealthResponse(string Status, double UptimeSeconds, string Timestamp);
}
