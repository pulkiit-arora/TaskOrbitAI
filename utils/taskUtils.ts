import { Task, Priority, Recurrence, Status } from '../types';

/**
 * Return the Date object for the nth occurrence of a weekday within a month.
 * nth: 1..4 for first..fourth, -1 for last
 * weekday: 0=Sun..6=Sat
 */
export const getNthWeekdayOfMonth = (year: number, month: number, nth: number, weekday: number): Date => {
  if (nth === -1) {
    // last weekday: start from last day and walk backwards
    const last = new Date(year, month + 1, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    const day = last.getDate() - diff;
    const d = new Date(year, month, day);
    d.setHours(12, 0, 0, 0);
    return d;
  }
  // first occurrence
  const first = new Date(year, month, 1);
  const firstDiff = (weekday - first.getDay() + 7) % 7;
  const day = 1 + firstDiff + (nth - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const finalDay = Math.min(day, daysInMonth);
  const d = new Date(year, month, finalDay);
  d.setHours(12, 0, 0, 0);
  return d;
};

export const isNthWeekdayOfMonth = (date: Date, nth: number, weekday: number): boolean => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const target = getNthWeekdayOfMonth(y, m, nth, weekday);
  return target.getDate() === date.getDate();
};

/**
 * Calculate the next due date for a recurrence.
 *
 * @param currentDate ISO string of the base date
 * @param recurrence recurrence type
 * @param interval optional interval (every N units). Defaults to 1
 * @param weekdays optional weekdays for weekly recurrence (0=Sunday..6=Saturday)
 */
export const calculateNextDueDate = (
  currentDate: string,
  recurrence: Recurrence,
  interval = 1,
  weekdays?: number[],
  monthDay?: number,
  anchorDate?: string,
  monthNth?: number,
  monthWeekday?: number
): Date => {
  const date = new Date(currentDate);
  const anchor = anchorDate ? new Date(anchorDate) : new Date(currentDate);

  switch (recurrence) {
    case Recurrence.DAILY:
      date.setDate(date.getDate() + Math.max(1, Math.floor(interval)));
      break;

    case Recurrence.WEEKLY: {
      // Strictly anchor multi-week intervals to the anchor week (start of week of anchor)
      const sorted = (weekdays && weekdays.length > 0) ? Array.from(new Set(weekdays)).sort((a, b) => a - b) : [anchor.getDay()];
      const anchorWeekStart = new Date(anchor);
      anchorWeekStart.setDate(anchor.getDate() - anchor.getDay());
      anchorWeekStart.setHours(0, 0, 0, 0);

      const maxDays = 7 * Math.max(4, Math.floor(interval) * 8); // generous cap
      for (let i = 1; i <= maxDays; i++) {
        const d = new Date(date);
        d.setDate(date.getDate() + i);
        if (!sorted.includes(d.getDay())) continue;
        const dWeekStart = new Date(d);
        dWeekStart.setDate(d.getDate() - d.getDay());
        dWeekStart.setHours(0, 0, 0, 0);
        const weekDiff = Math.floor((dWeekStart.getTime() - anchorWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if ((weekDiff % Math.max(1, Math.floor(interval))) === 0) return d;
      }
      // fallback: add interval weeks
      date.setDate(date.getDate() + 7 * Math.max(1, Math.floor(interval)));
      break;
    }

    case Recurrence.MONTHLY: {
      const monthsToAdd = Math.max(1, Math.floor(interval));
      // If monthly-by-weekday rules are provided (nth + weekday), compute that occurrence
      if (typeof monthNth === 'number' && typeof monthWeekday === 'number') {
        const target = new Date(date);
        // Safely add months: set to 1st of month, add months, then calculate nth weekday
        // Actually for nth weekday logic, adding months to the 1st is safe/correct base.
        target.setDate(1);
        target.setMonth(target.getMonth() + monthsToAdd);
        const year = target.getFullYear();
        const month = target.getMonth();
        // compute nth weekday
        const nthDate = getNthWeekdayOfMonth(year, month, monthNth, monthWeekday);
        return nthDate;
      }

      // If a specific day-of-month is provided, use that (clamped to month length)
      if (monthDay && Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 31) {
        const target = new Date(date);
        // Avoid overflow (e.g. Jan 31 + 1 month -> Mar 3)
        // Set to day 1, add months, then set recurrence day.
        target.setDate(1);
        target.setMonth(target.getMonth() + monthsToAdd);
        const year = target.getFullYear();
        const month = target.getMonth();
        const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
        target.setDate(Math.min(monthDay, daysInTargetMonth));
        return target;
      }

      // If monthly-by-weekday rules are provided via task fields, callers should pass them
      // through the monthDay parameter in this util as we can't change signature everywhere.
      // To support nth-weekday, callers can pass a negative monthDay encoding or use
      // a future signature. For now fall back to adding monthsToAdd months.

      // Fix default monthly behavior (same day of month) avoiding overflow
      // e.g. Jan 31 + 1 month -> Feb 28/29, not Mar 2/3
      const originalDay = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + monthsToAdd);
      const daysInTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(originalDay, daysInTargetMonth));
      break;
    }

    case Recurrence.QUARTERLY:
      date.setMonth(date.getMonth() + 3 * Math.max(1, Math.floor(interval)));
      break;

    case Recurrence.YEARLY:
      date.setFullYear(date.getFullYear() + Math.max(1, Math.floor(interval)));
      break;
  }

  return date;
};

export const sortTasks = (taskList: Task[], sortBy: 'priority' | 'dueDate'): Task[] => {
  return taskList.sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return b.createdAt - a.createdAt;
    } else {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      return b.createdAt - a.createdAt;
    }
  });
};

export const isOpen = (t: Task) => t.status !== Status.DONE && t.status !== Status.ARCHIVED;

/**
 * Build a human-readable recurrence summary for UI display.
 * Examples:
 *  - "Every day"
 *  - "Every 2 days"
 *  - "Weekly on Tue, Thu"
 *  - "Every 2 weeks on Mon"
 *  - "Monthly on day 15"
 */
export const formatRecurrenceSummary = (task: Task): string => {
  if (!task || task.recurrence === Recurrence.NONE) return '';
  const interval = task.recurrenceInterval && task.recurrenceInterval > 0 ? Math.floor(task.recurrenceInterval) : 1;

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  switch (task.recurrence) {
    case Recurrence.DAILY:
      return interval === 1 ? 'Daily' : `Every ${interval} days`;

    case Recurrence.WEEKLY: {
      const days = task.recurrenceWeekdays && task.recurrenceWeekdays.length > 0
        ? task.recurrenceWeekdays.slice().sort((a, b) => a - b).map(d => weekdayNames[d]).join(', ')
        : null;
      if (days) return interval === 1 ? `Weekly on ${days}` : `Every ${interval} weeks on ${days}`;
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
    }

    case Recurrence.MONTHLY: {
      // Monthly by specific day
      if (typeof task.recurrenceMonthDay === 'number' && Number.isInteger(task.recurrenceMonthDay)) {
        const day = task.recurrenceMonthDay;
        return interval === 1 ? `Monthly on day ${day}` : `Every ${interval} months on day ${day}`;
      }

      // Monthly by nth weekday (e.g., Last Saturday)
      if (typeof task.recurrenceMonthNth === 'number' && typeof task.recurrenceMonthWeekday === 'number') {
        const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const nth = task.recurrenceMonthNth;
        const weekdayName = names[task.recurrenceMonthWeekday];
        const nthName = nth === -1 ? 'Last' : `${nth}${nth === 1 ? 'st' : nth === 2 ? 'nd' : nth === 3 ? 'rd' : 'th'}`;
        return interval === 1 ? `Monthly on ${nthName} ${weekdayName}` : `Every ${interval} months on ${nthName} ${weekdayName}`;
      }

      const day = task.dueDate ? new Date(task.dueDate).getDate() : undefined;
      if (day) return interval === 1 ? `Monthly on day ${day}` : `Every ${interval} months on day ${day}`;
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;
    }

    case Recurrence.QUARTERLY:
      return interval === 1 ? 'Quarterly' : `Every ${3 * interval} months`;

    case Recurrence.YEARLY: {
      if (task.recurrenceMonthDay || task.dueDate) {
        const d = task.recurrenceMonthDay || (task.dueDate ? new Date(task.dueDate).getDate() : undefined);
        const m = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short' }) : undefined;
        if (d && m) return interval === 1 ? `Yearly on ${m} ${d}` : `Every ${interval} years on ${m} ${d}`;
      }
      return interval === 1 ? 'Yearly' : `Every ${interval} years`;
    }

    default:
      return '';
  }
};

