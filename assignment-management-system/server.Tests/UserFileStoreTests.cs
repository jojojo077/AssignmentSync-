using Microsoft.Extensions.Configuration;
using AMS.Api.Models;
using AMS.Api.Services;
using Xunit;

namespace AMS.Api.Tests;

public class UserFileStoreTests
{
    [Fact]
    public async Task UserDataLookup_ReturnsOnlyTheRequestedUsersRecord()
    {
        // Test Case: Canvas tokens and checklist IDs must stay attached to their owner.
        var path = Path.Combine(Path.GetTempPath(), $"ams-users-{Guid.NewGuid():N}.txt");
        try
        {
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["Auth:DataFilePath"] = path })
                .Build();
            var store = new UserFileStore(configuration);

            await store.RegisterAsync(new RegisterRequest
            {
                Email = "first@example.com",
                Password = "password123",
                Name = "First",
                CanvasAccessToken = "first-canvas-token"
            });
            await store.RegisterAsync(new RegisterRequest
            {
                Email = "second@example.com",
                Password = "password123",
                Name = "Second",
                CanvasAccessToken = "second-canvas-token"
            });
            await store.SetCompletedAssignmentsAsync("first@example.com", ["first-assignment"]);

            var second = await store.FindByEmailAsync("second@example.com");
            var secondCanvasToken = await store.GetCanvasTokenAsync("second@example.com");

            Assert.NotNull(second);
            Assert.Empty(second!.CompletedAssignmentIds);
            Assert.Equal("second-canvas-token", secondCanvasToken);
        }
        finally
        {
            // Test cleanup removes the temporary file so credentials never remain on disk.
            if (File.Exists(path)) File.Delete(path);
        }
    }
}