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
    public async Task Login_WithValidBody_Returns501NotImplemented()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "student@aut.ac.nz",
            Password = "password123",
        });

        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

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
