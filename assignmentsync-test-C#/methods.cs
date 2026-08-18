using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";

using var client = new HttpClient();
client.DefaultRequestHeaders.UserAgent.ParseAdd("CanvasSync/1.0");
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", TOKEN.Trim());

var response = await client.GetAsync("https://canvas.aut.ac.nz/api/v1/courses?per_page=100");
response.EnsureSuccessStatusCode();

var json = await response.Content.ReadAsStringAsync();
using var doc = JsonDocument.Parse(json);
var courses = doc.RootElement;

void getCourses()
{
    foreach (var course in courses.EnumerateArray())
    {
        string name = course.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
        string code = course.TryGetProperty("course_code", out var c) ? c.GetString() ?? "" : "";
        int id = course.TryGetProperty("id", out var i) ? i.GetInt32() : 0;
        Console.WriteLine($"{name} ({code}) - ID: {id}");
    }
}

void returnCourseCalendars(string year, string semester)
{
    var calendarList = new List<string>();
    foreach (var course in courses.EnumerateArray())
    {
        if (!course.TryGetProperty("name", out var nameEl)) continue;
        if (!course.TryGetProperty("course_code", out var codeEl)) continue;

        string code = codeEl.GetString() ?? "";
        if (code.Contains(year) && code.Contains(semester))
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
}

async Task<List<string>> getAssignments(HttpClient client, JsonElement courses)
{
    var assignmentLists = new List<string>();
    var validCourseCodes = new List<int>();
    foreach (var course in courses.EnumerateArray())
    {
        if (!course.TryGetProperty("name", out var nameEl)) continue;
        if (!course.TryGetProperty("course_code", out var codeEl)) continue;

        string code = codeEl.GetString() ?? "";
        if (code.Contains("2026") && code.Contains("S2"))
        {
            if (course.TryGetProperty("id", out var id))
            {
                validCourseCodes.Add(id.GetInt32());
            }
        }
    }
    // iterate through each assignment - by id
    foreach (var courseId in validCourseCodes)
    {
        string url = $"https://canvas.aut.ac.nz/api/v1/courses/{courseId}/assignments";
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();

        string json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        foreach (var assignment in doc.RootElement.EnumerateArray())
        {
            string name = assignment.TryGetProperty("name", out var nameEl2) ? nameEl2.GetString() ?? "Untitled" : "Untitled";
            string dueTimestamp = assignment.TryGetProperty("due_at", out var dueAtEl) ? dueAtEl.GetString() ?? "No due date" : "";
            string dueDate = dueTimestamp.Split('T')[0];
            assignmentLists.Add($"{name} - {dueAtEl}");
        }
    }
    return assignmentLists;
}

async Task<List<String>> searchAssignmentByCourseCode(string courseCode, HttpClient client, JsonElement courses)
{
    int targetCourse = -1;
    var assignmentList = new List<String>();
    foreach (var course in courses.EnumerateArray())
    {
        if (!course.TryGetProperty("name", out var nameEl)) continue;
        if (!course.TryGetProperty("course_code", out var codeEl)) continue;

        string code = codeEl.GetString() ?? "";

        if (code.Contains(courseCode))
        {
            if (course.TryGetProperty("id", out var id))
            {
                targetCourse = id.GetInt32();
                string url = $"https://canvas.aut.ac.nz/api/v1/courses/{id}/assignments";
                var response = await client.GetAsync(url);
                response.EnsureSuccessStatusCode();

                string json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);

                foreach (var assignment in doc.RootElement.EnumerateArray())
                {
                    string name = assignment.TryGetProperty("name", out var nameEl2) ? nameEl2.GetString() ?? "Untitled" : "Untitled";
                    string dueTimestamp = assignment.TryGetProperty("due_at", out var dueAtEl) ? dueAtEl.GetString() ?? "No due date" : "";
                    string dueDate = dueTimestamp.Split('T')[0];
                    assignmentList.Add($"{name} - {dueDate}");
                }
            }
        }
    }
    if (targetCourse == -1)
    {
        Console.WriteLine("Error");
        return assignmentList; // error

    }
    return assignmentList;
}
//getCourses();
//returnCourseCalendars("2023", "S2");

//var assignments = await getAssignments(client, courses);
//foreach (var name in assignments)
//{
//    Console.WriteLine(name);
//}

var assignments = await searchAssignmentByCourseCode("COMP703", client, courses);
foreach (var x in assignments)
{
    Console.WriteLine(x);
}