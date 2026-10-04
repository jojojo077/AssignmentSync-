using System.Net;
using System.Net.Http.Json;
using AMS.Api.Config;
using AMS.Api.Models;
using AMS.Api.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace AMS.Api.Tests;

public class CanvasServiceTests
{
    [Fact]
    public async Task GetAssignmentsForCourse_IncludesOverdueFutureAndUndatedAssignments()
    {
        var handler = new StubCanvasHandler(
            """
            [
              { "id": 1, "name": "Overdue assignment", "due_at": "2020-01-01T12:00:00Z" },
              { "id": 2, "name": "Future assignment", "due_at": "2099-01-01T12:00:00Z" },
              { "id": 3, "name": "No due date", "due_at": null }
            ]
            """);
        using var httpClient = new HttpClient(handler);
        var service = new CanvasService(
            httpClient,
            Options.Create(new CanvasOptions
            {
                BaseUrl = "https://canvas.example",
                AccessToken = "test-token"
            }));

        var assignments = await service.GetAssignmentsForCourseAsync(42);

        Assert.Equal(3, assignments.Count);
        Assert.Contains(assignments, assignment => assignment.Id == 1 && assignment.Name == "Overdue assignment");
        Assert.Contains(assignments, assignment => assignment.Id == 2 && assignment.Name == "Future assignment");
        Assert.Contains(assignments, assignment => assignment.Id == 3 && assignment.Name == "No due date");
        // Overdue assignments are kept and flagged rather than filtered out.
        var now = DateTimeOffset.UtcNow;
        Assert.Equal(AssignmentStatus.Overdue, CanvasService.Categorize(assignments.Single(a => a.Id == 1), now));
        Assert.Equal(AssignmentStatus.Uncompleted, CanvasService.Categorize(assignments.Single(a => a.Id == 2), now));
        Assert.Equal(AssignmentStatus.Uncompleted, CanvasService.Categorize(assignments.Single(a => a.Id == 3), now));
    }

    private sealed class StubCanvasHandler(string responseBody) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, System.Text.Encoding.UTF8, "application/json")
            });
        }
    }
}