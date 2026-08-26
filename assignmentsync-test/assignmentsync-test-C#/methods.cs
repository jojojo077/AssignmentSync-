using System.Net.Http.Headers;
using System.Reflection.Metadata;
using System.Text.Json;
using System.Threading.Tasks;

namespace AssignmentSyncMethods;

public class Account
{
    private HttpClient _client;
    private JsonDocument _coursesDoc;

    private string username { get; set; }
    private string password { get; set; }

    public string URL { get; set; }
    protected string TOKEN { get; private set; }

    // Set Login Method | Future Use
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

    // Account Constructor, set user's canvas API token and website
    public Account(string url, string token, HttpClient? client = null)
    {
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(token))
        {
            throw new ArgumentException("Access details are invalid.");
        }

        // Set API data if valid
        this.URL = url;
        this.TOKEN = token;
        _client = client;
    }
    // Method to set Page Header to Canvas Course 
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
    
    // Returns All Courses
    public async Task getCourses()
    {   
        // Set Page Headings to Canvas Courses
        await getCoursePage();
        // Iterate through Course Elements
        foreach (var course in _coursesDoc.RootElement.EnumerateArray())
        {
            // Check if Name, Course and ID exist
            string name = course.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
            string code = course.TryGetProperty("course_code", out var c) ? c.GetString() ?? "" : "";
            int id = course.TryGetProperty("id", out var i) ? i.GetInt32() : 0;
            // Output to Console
            Console.WriteLine($"{name} ({code}) - ID: {id}");
        }
    }

    // Returns String List of ICS calendar files based on a semester period
    public async Task<List<string>> returnCourseCalendars(string year, string semester)
    {
        // Check if parameters are valid
        if (string.IsNullOrWhiteSpace(year) || string.IsNullOrWhiteSpace(semester))
        {
            throw new ArgumentException("Invalid parameters");
        }

        // Set Page Heading to Canvas Courses
        await getCoursePage();

        var calendarList = new List<string>();
        // Iterate through course elements
        foreach (var course in _coursesDoc.RootElement.EnumerateArray())
        {
            // Check if Name and Course exists
            if (!course.TryGetProperty("name", out var nameEl)) continue;
            if (!course.TryGetProperty("course_code", out var codeEl)) continue;

            string code = codeEl.GetString() ?? "";
            // Check if Code matches year and semester
            if (code.Contains(year) && code.Contains(semester))
            {
                // Extract ICS file link if passed
                if (course.TryGetProperty("calendar", out var cal) &&
                    cal.TryGetProperty("ics", out var ics))
                {
                    // Append to List
                    calendarList.Add($"{code} {ics.GetString()}");
                }
            }
        }
        // Return Results
        return calendarList;
    }

    // Return All active Assignments
    public async Task<List<string>> getAssignments()
    {
        // Set Page Heading to Canvas Course
        await getCoursePage();

        var assignmentLists = new List<string>();
        var validCourseCodes = new List<int>();
        // Iterate through all Courses to extract course ID
        foreach (var course in _coursesDoc.RootElement.EnumerateArray())
        {
            if (!course.TryGetProperty("name", out var nameEl)) continue;
            if (!course.TryGetProperty("course_code", out var codeEl)) continue;

            string code = codeEl.GetString() ?? "";
            // Extract ID if course aligns with ongoing semester
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
            // Change Page Heading to a course based on ID
            string url = $"https://{URL}/api/v1/courses/{courseId}/assignments";
            var response = await _client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            // Extract Assignment Name and Due Date
            foreach (var assignment in doc.RootElement.EnumerateArray())
            {
                string name = assignment.TryGetProperty("name", out var nameEl2) ? nameEl2.GetString() ?? "Untitled" : "Untitled";
                string dueTimestamp = assignment.TryGetProperty("due_at", out var dueAtEl) ? dueAtEl.GetString() ?? "No due date" : "";
                // Remove Timestamp
                string dueDate = dueTimestamp.Split('T')[0];
                // Append to List
                assignmentLists.Add($"{name} - {dueDate}");
            }
        }
        return assignmentLists;
    }

    // Return Assignments based on Course Code
    public async Task<List<String>> searchAssignmentByCourseCode(string courseCode)
    {
        // Check if Parameters are valid
        if (string.IsNullOrWhiteSpace(courseCode))
        {
            throw new ArgumentException("Invalid Code provided.");
        }
        // Set Page Heading to Canvas Course
        await getCoursePage();
        int targetCourse = -1;
        var assignmentList = new List<String>();
        // Iterate through courses to find specified Course Code
        foreach (var course in _coursesDoc.RootElement.EnumerateArray())
        {
            if (!course.TryGetProperty("name", out var nameEl)) continue;
            if (!course.TryGetProperty("course_code", out var codeEl)) continue;

            string code = codeEl.GetString() ?? "";
            // If Course Code found, Extract ID
            if (code.Contains(courseCode))
            {
                if (course.TryGetProperty("id", out var id))
                {
                    // Redirect Page Heading to Course Page using ID
                    targetCourse = id.GetInt32();
                    string url = $"https://{URL}/api/v1/courses/{id}/assignments";
                    var response = await _client.GetAsync(url);
                    response.EnsureSuccessStatusCode();

                    string json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);

                    // Iterate through assignments
                    foreach (var assignment in doc.RootElement.EnumerateArray())
                    {
                        string name = assignment.TryGetProperty("name", out var nameEl2) ? nameEl2.GetString() ?? "Untitled" : "Untitled";
                        string dueTimestamp = assignment.TryGetProperty("due_at", out var dueAtEl) ? dueAtEl.GetString() ?? "No due date" : "";
                        // Remove Timestamp
                        string dueDate = dueTimestamp.Split('T')[0];
                        // Append Assignment to list
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

















