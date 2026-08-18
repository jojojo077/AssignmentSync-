using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

namespace AssignmentSyncMethods;

public class Methods
{
    const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";

    private HttpClient _client;
    private JsonDocument _coursesDoc;

    public async Task getCoursePage()
    {
        _client = new HttpClient();
        _client.DefaultRequestHeaders.UserAgent.ParseAdd("CanvasSync/1.0");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", TOKEN.Trim());

        var response = await _client.GetAsync("https://canvas.aut.ac.nz/api/v1/courses?per_page=100");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        _coursesDoc = JsonDocument.Parse(json);  // Keep the document alive
    }
    

    public async Task getCourses()
    {   
        await getCoursePage();
        foreach (var course in _coursesDoc.RootElement.EnumerateArray())
        {
            string name = course.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
            string code = course.TryGetProperty("course_code", out var c) ? c.GetString() ?? "" : "";
            int id = course.TryGetProperty("id", out var i) ? i.GetInt32() : 0;
            Console.WriteLine($"{name} ({code}) - ID: {id}");
        }
    }

    public async Task returnCourseCalendars(string year, string semester)
    {
        await getCoursePage();

        var calendarList = new List<string>();
        foreach (var course in _coursesDoc.RootElement.EnumerateArray())
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

    public async Task<List<string>> getAssignments()
    {
        await getCoursePage();
        var assignmentLists = new List<string>();
        var validCourseCodes = new List<int>();
        foreach (var course in _coursesDoc.RootElement.EnumerateArray())
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
            var response = await _client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            foreach (var assignment in doc.RootElement.EnumerateArray())
            {
                string name = assignment.TryGetProperty("name", out var nameEl2) ? nameEl2.GetString() ?? "Untitled" : "Untitled";
                string dueTimestamp = assignment.TryGetProperty("due_at", out var dueAtEl) ? dueAtEl.GetString() ?? "No due date" : "";
                string dueDate = dueTimestamp.Split('T')[0];
                assignmentLists.Add($"{name} - {dueDate}");
            }
        }
        return assignmentLists;
    }

    public async Task<List<String>> searchAssignmentByCourseCode(string courseCode)
    {
        await getCoursePage();
        int targetCourse = -1;
        var assignmentList = new List<String>();
        foreach (var course in _coursesDoc.RootElement.EnumerateArray())
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
                    var response = await _client.GetAsync(url);
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
}

















