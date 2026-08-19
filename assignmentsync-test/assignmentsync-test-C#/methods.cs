using System.Net.Http.Headers;
using System.Reflection.Metadata;
using System.Text.Json;
using System.Threading.Tasks;

namespace AssignmentSyncMethods;

public class Account
{
    private HttpClient _client;
    private JsonDocument _coursesDoc;

    private string username;
    private string password;

    public string URL { get; set; }
    protected string TOKEN { get; private set; }


    public bool SetLogin(string user, string pass)
    {
        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(pass))
        {
            throw new ArgumentException("Login details are invalid.");
        }

        username = user;
        password = pass;
        
        return true;
    }

    public Account(string url, string token, HttpClient? client = null)
    {
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(token))
        {
            throw new ArgumentException("Access details are invalid.");
        }

        this.URL = url;
        this.TOKEN = token;
        _client = client;
    }

    public async Task getCoursePage()
    {
        if (_client is null)
        {
            _client = new HttpClient();
            _client.DefaultRequestHeaders.UserAgent.ParseAdd("CanvasSync/1.0");
            _client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", TOKEN.Trim());
        }

        var response = await _client.GetAsync($"https://{URL}/api/v1/courses?per_page=100");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        _coursesDoc = JsonDocument.Parse(json);
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
        if (string.IsNullOrWhiteSpace(year) || string.IsNullOrWhiteSpace(semester))
        {
            throw new ArgumentException("Invalid parameters");
        }
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
            string url = $"https://{URL}/api/v1/courses/{courseId}/assignments";
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
        if (string.IsNullOrWhiteSpace(courseCode))
        {
            throw new ArgumentException("Invalid Code provided.");
        }

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
                    string url = $"https://{URL}/api/v1/courses/{id}/assignments";
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
            throw new ArgumentException("No Courses found.");

        }
        return assignmentList;
    }
}

















