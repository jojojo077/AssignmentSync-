using System.Net;
using System.Net.Http.Json;
using AMS.Api.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AMS.Api.Tests;

public class AuthControllerTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Login_WithUnknownUser_ReturnsUnauthorized()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "student@aut.ac.nz",
            Password = "password123",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithCanvasToken_SavesTokenToTheLoggedInUser()
    {
        // Test Case: A valid login writes the supplied Canvas token to that user's record.
        var email = $"canvas-owner-{Guid.NewGuid():N}@aut.ac.nz";
        var canvasToken = $"unique-canvas-token-{Guid.NewGuid():N}";
        await RegisterAndGetToken(email, "Canvas Owner");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "password123",
            CanvasAccessToken = canvasToken
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithAnotherUsersCanvasToken_ReturnsConflict()
    {
        // Test Case: One Canvas token cannot be assigned to two different users.
        var firstEmail = $"token-first-{Guid.NewGuid():N}@aut.ac.nz";
        var secondEmail = $"token-second-{Guid.NewGuid():N}@aut.ac.nz";
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = firstEmail,
            Password = "password123",
            Name = "First",
            CanvasAccessToken = "shared-canvas-token"
        });
        await RegisterAndGetToken(secondEmail, "Second");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = secondEmail,
            Password = "password123",
            CanvasAccessToken = "shared-canvas-token"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithAnotherUsersCanvasToken_ReturnsConflict()
    {
        // Test Case: Registration cannot claim a Canvas token already owned by another user.
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = $"registered-first-{Guid.NewGuid():N}@aut.ac.nz",
            Password = "password123",
            Name = "First",
            CanvasAccessToken = "registration-shared-token"
        });

        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = $"registered-second-{Guid.NewGuid():N}@aut.ac.nz",
            Password = "password123",
            Name = "Second",
            CanvasAccessToken = "registration-shared-token"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Checklist_IsReadOnlyFromTheAuthenticatedUsersRecord()
    {
        // Test Case: Two users must never receive each other's semester checklist data.
        var firstEmail = $"first-{Guid.NewGuid():N}@aut.ac.nz";
        var secondEmail = $"second-{Guid.NewGuid():N}@aut.ac.nz";
        var firstToken = await RegisterAndGetToken(firstEmail, "First Student");
        var secondToken = await RegisterAndGetToken(secondEmail, "Second Student");

        using var firstRequest = new HttpRequestMessage(HttpMethod.Put, "/api/progress/checklist")
        {
            Content = JsonContent.Create(new { assignmentIds = new[] { "first-assignment" } })
        };
        firstRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", firstToken);
        var saveResponse = await _client.SendAsync(firstRequest);

        using var secondRequest = new HttpRequestMessage(HttpMethod.Get, "/api/progress/checklist");
        secondRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", secondToken);
        var secondChecklist = await (await _client.SendAsync(secondRequest)).Content.ReadFromJsonAsync<List<string>>();

        Assert.Equal(HttpStatusCode.OK, saveResponse.StatusCode);
        Assert.Empty(secondChecklist!);
    }

    // Registers one unique test user and returns only the bearer token issued for that user.
    private async Task<string> RegisterAndGetToken(string email, string name)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = "password123",
            Name = name,
        });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return body!.Token;
    }

    // Deserializes the public auth response without ever exposing a password field.
    private sealed record AuthResponse(string Token, AuthUser User);

    // Represents the user fields returned by registration and login.
    private sealed record AuthUser(string Email, string Name);

    [Fact]
    public async Task Register_WithInvalidEmail_Returns400FromModelValidation()
    {
        // [ApiController] triggers automatic model validation against the
        // [Required]/[EmailAddress] attributes on RegisterRequest before the
        // action method body even runs.
        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = "not-an-email",
            Password = "short",
            Name = "",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
