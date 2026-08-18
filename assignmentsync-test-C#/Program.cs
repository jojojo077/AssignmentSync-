using System.Net.Http.Headers;
using System.Text.Json;

const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";

using var client = new HttpClient();
client.DefaultRequestHeaders.UserAgent.ParseAdd("CanvasSync/1.0");
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", TOKEN.Trim());

var response = await client.GetAsync("https://canvas.aut.ac.nz/api/v1/courses?per_page=100");
response.EnsureSuccessStatusCode();

var json = await response.Content.ReadAsStringAsync();
using var doc = JsonDocument.Parse(json);
var courses = doc.RootElement;

foreach (var course in courses.EnumerateArray())
{
    string name = course.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
    string code = course.TryGetProperty("course_code", out var c) ? c.GetString() ?? "" : "";
    int id = course.TryGetProperty("id", out var i) ? i.GetInt32() : 0;
    Console.WriteLine($"{name} ({code}) - ID: {id}");
}

Console.WriteLine(new string('#', 80));

var calendarList = new List<string>();
foreach (var course in courses.EnumerateArray())
{
    if (!course.TryGetProperty("name", out var nameEl)) continue;
    if (!course.TryGetProperty("course_code", out var codeEl)) continue;

    string code = codeEl.GetString() ?? "";
    if (code.Contains("2026") && code.Contains("S2"))
    {
        if (course.TryGetProperty("calendar", out var cal) &&
            cal.TryGetProperty("ics", out var ics))
        {
            calendarList.Add($"{code} {ics.GetString()}");
        }
    }
}

foreach (var entry in calendarList)
{
    Console.WriteLine(entry);
}