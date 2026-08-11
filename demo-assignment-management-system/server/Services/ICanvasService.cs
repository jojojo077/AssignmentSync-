using AMS.Api.Models;

namespace AMS.Api.Services;

public interface ICanvasService
{
    Task<IReadOnlyList<CanvasCourse>> GetCoursesAsync();

    Task<IReadOnlyList<CanvasAssignment>> GetAssignmentsForCourseAsync(long courseId);

    Task<IReadOnlyList<CourseWithAssignments>> GetAllUpcomingAssignmentsAsync();
}
