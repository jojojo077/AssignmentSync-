// Helper utilities for date calculations, course colors, and calendar views

const COURSE_COLORS = [
  { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', badge: '#0284c7' }, // Sky Blue
  { bg: '#f0fdf4', text: '#15803d', border: '#86efac', badge: '#16a34a' }, // Emerald Green
  { bg: '#fef3c7', text: '#b45309', border: '#fde68a', badge: '#d97706' }, // Amber
  { bg: '#fae8ff', text: '#86198f', border: '#f5d0fe', badge: '#a21caf' }, // Fuchsia
  { bg: '#ffe4e6', text: '#be123c', border: '#fecdd3', badge: '#e11d48' }, // Rose
  { bg: '#eed9ff', text: '#6b21a8', border: '#d8b4fe', badge: '#7e22ce' }, // Purple
  { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', badge: '#4338ca' }, // Indigo
];

/**
 * Assign consistent colors to courses based on courseId or name hash
 */
export function getCourseColor(courseId) {
  const index = Math.abs(Number(courseId) || 0) % COURSE_COLORS.length;
  return COURSE_COLORS[index];
}

/**
 * Get grid of days for a given year and month (including leading & trailing days)
 */
export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const date = new Date(year, month - 1, dayNum);
    days.push({ date, isCurrentMonth: false, dayNumber: dayNum });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    days.push({ date, isCurrentMonth: true, dayNumber: i });
  }

  // Next month leading days (to complete 35 or 42 cells)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, dayNumber: i });
    }
  }

  return days;
}

/**
 * Get 7 days of the week starting from Sunday for a given date
 */
export function getWeekDays(referenceDate) {
  const date = new Date(referenceDate);
  const dayOfWeek = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Format ISO date string to human-readable date & time
 */
export function formatDateTime(isoString) {
  if (!isoString) return 'No due date';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'No due date';

  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format time only (e.g. 11:59 PM)
 */
export function formatTimeOnly(isoString) {
  if (!isoString) return 'All Day';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'All Day';

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Check if two Date objects represent the same calendar day
 */
export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if a date string falls on today
 */
export function isToday(date) {
  return isSameDay(date, new Date());
}
