using AMS.Api.Models;

namespace AMS.Api.Services;

public interface ICanvasService
{
    Task<IReadOnlyList<CanvasCourse>> GetCoursesAsync();

    Task<IReadOnlyList<CanvasAssignment>> GetAssignmentsForCourseAsync(long courseId);

    Task<IReadOnlyList<CourseWithAssignments>> GetAllUpcomingAssignmentsAsync();
    Task<IReadOnlyList<CanvasAnnouncement>> GetRecentAnnouncementsAsync();
    Task<CanvasCalendarEvent> CreateCalendarEventAsync(CreateCalendarEventRequest request);
    Task<bool> DeleteCalendarEventAsync(long eventId);
    Task<IReadOnlyList<CanvasCalendarEvent>> GetCalendarEventsAsync();
}
