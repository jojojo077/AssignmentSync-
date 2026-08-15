using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace AMS.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private static readonly Stopwatch Uptime = Stopwatch.StartNew();

    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "ok",
            uptimeSeconds = Uptime.Elapsed.TotalSeconds,
            timestamp = DateTime.UtcNow.ToString("o"),
        });
    }
}
