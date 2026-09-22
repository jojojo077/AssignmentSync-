using System.Net;
using System.Net.Http.Json;
using AMS.Api.Config;
using AMS.Api.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace AMS.Api.Tests;

public class CanvasServiceTests
{
    [Fact]
    public async Task GetAssignmentsForCourse_ExcludesOverdueButIncludesFutureAndUndatedAssignments()
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

        Assert.Equal(2, assignments.Count);
        Assert.Contains(assignments, assignment => assignment.Id == 2 && assignment.Name == "Future assignment");
        Assert.Contains(assignments, assignment => assignment.Id == 3 && assignment.Name == "No due date");
        Assert.DoesNotContain(assignments, assignment => assignment.Id == 1);
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