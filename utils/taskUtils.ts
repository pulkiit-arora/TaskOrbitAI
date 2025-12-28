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
  monthWeekday?: number,
  recurrenceMonths?: number[]
): Date => {
  const date = new Date(currentDate);
  const anchor = anchorDate ? new Date(anchorDate) : new Date(currentDate);
  let nextDate = new Date(date);

  switch (recurrence) {
    case Recurrence.DAILY:
      nextDate.setDate(date.getDate() + Math.max(1, Math.floor(interval)));
      break;

    case Recurrence.WEEKLY: {
      // Strictly anchor multi-week intervals to the anchor week (start of week of anchor)
      const sorted = (weekdays && weekdays.length > 0) ? Array.from(new Set(weekdays)).sort((a, b) => a - b) : [anchor.getDay()];
      const anchorWeekStart = new Date(anchor);
      anchorWeekStart.setDate(anchor.getDate() - anchor.getDay());
      anchorWeekStart.setHours(0, 0, 0, 0);

      const maxDays = 7 * Math.max(4, Math.floor(interval) * 8); // generous cap
      let found = false;
      for (let i = 1; i <= maxDays; i++) {
        const d = new Date(date);
        d.setDate(date.getDate() + i);
        if (!sorted.includes(d.getDay())) continue;
        const dWeekStart = new Date(d);
        dWeekStart.setDate(d.getDate() - d.getDay());
        dWeekStart.setHours(0, 0, 0, 0);
        const weekDiff = Math.floor((dWeekStart.getTime() - anchorWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));

        let offset = 0;
        const anchorDay = anchor.getDay();
        // Since 'sorted' contains the weekdays we are looking for:
        const hasOccurrenceInWeek0 = sorted.some(d => d >= anchorDay);
        if (!hasOccurrenceInWeek0) {
          offset = 1;
        }

        if (weekDiff >= offset && ((weekDiff - offset) % Math.max(1, Math.floor(interval))) === 0) {
          nextDate = d;
          found = true;
          break;
        }
      }
      if (!found) {
        // fallback: add interval weeks
        nextDate.setDate(date.getDate() + 7 * Math.max(1, Math.floor(interval)));
      }
      break;
    }

    case Recurrence.MONTHLY: {
      const monthsToAdd = Math.max(1, Math.floor(interval));
      if (typeof monthNth === 'number' && typeof monthWeekday === 'number') {
        const target = new Date(date);
        target.setDate(1);
        target.setMonth(target.getMonth() + monthsToAdd);
        const year = target.getFullYear();
        const month = target.getMonth();
        nextDate = getNthWeekdayOfMonth(year, month, monthNth, monthWeekday);
      } else if (monthDay && Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 31) {
        const target = new Date(date);
        target.setDate(1);
        target.setMonth(target.getMonth() + monthsToAdd);
        const year = target.getFullYear();
        const month = target.getMonth();
        const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
        target.setDate(Math.min(monthDay, daysInTargetMonth));
        nextDate = target;
      } else {
        const originalDay = date.getDate();
        const target = new Date(date);
        target.setDate(1);
        target.setMonth(target.getMonth() + monthsToAdd);
        const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        target.setDate(Math.min(originalDay, daysInTargetMonth));
        nextDate = target;
      }
      break;
    }

    case Recurrence.QUARTERLY:
      nextDate.setMonth(date.getMonth() + 3 * Math.max(1, Math.floor(interval)));
      break;

    case Recurrence.YEARLY:
      nextDate.setFullYear(date.getFullYear() + Math.max(1, Math.floor(interval)));
      break;
  }

  // Recursive check for allowed months
  if (recurrenceMonths && recurrenceMonths.length > 0) {
    if (!recurrenceMonths.includes(nextDate.getMonth())) {
      // If the calculated next date lands in a forbidden month, find the next one *after* it.
      // We pass the invalid 'nextDate' as the new 'currentDate' base.
      // NOTE: We must be careful not to infinite loop if NO months are allowed (though UI should prevent empty list).
      return calculateNextDueDate(
        nextDate.toISOString(),
        recurrence,
        interval,
        weekdays,
        monthDay,
        anchorDate,
        monthNth,
        monthWeekday,
        recurrenceMonths
      );
    }
  }

  return nextDate;
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


export const doesTaskOccurOnDate = (task: Task, date: Date): boolean => {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  // Check for exclusions (deleted/moved occurrences)
  if (task.excludedDates && task.excludedDates.some(d => {
    const ex = new Date(d);
    ex.setHours(0, 0, 0, 0);
    return ex.getTime() === checkDate.getTime();
  })) {
    return false;
  }

  // Check for specific months restriction (Seasonal Recurrence)
  if (task.recurrenceMonths && task.recurrenceMonths.length > 0) {
    if (!task.recurrenceMonths.includes(checkDate.getMonth())) {
      return false;
    }
  }

  const startAnchor = task.recurrenceStart
    ? new Date(task.recurrenceStart)
    : (task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt));
  startAnchor.setHours(0, 0, 0, 0);

  let endAnchor: Date | null = null;
  if (task.recurrenceEnd) {
    endAnchor = new Date(task.recurrenceEnd);
    endAnchor.setHours(23, 59, 59, 999);
  }

  if (checkDate < startAnchor) return false;
  if (endAnchor && checkDate > endAnchor) return false;

  const interval = task.recurrenceInterval && task.recurrenceInterval > 0 ? Math.floor(task.recurrenceInterval) : 1;
  const msPerDay = 24 * 60 * 60 * 1000;

  // Safe day diff calculation using UTC to avoid DST issues
  const utcCheck = Date.UTC(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
  const utcStart = Date.UTC(startAnchor.getFullYear(), startAnchor.getMonth(), startAnchor.getDate());
  const daysDiff = Math.floor((utcCheck - utcStart) / msPerDay);

  switch (task.recurrence) {
    case Recurrence.NONE: {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === checkDate.getTime();
    }

    case Recurrence.DAILY:
      return (daysDiff % interval) === 0;

    case Recurrence.WEEKLY: {
      const startAnchorWeekStart = new Date(startAnchor);
      startAnchorWeekStart.setDate(startAnchor.getDate() - startAnchor.getDay());
      startAnchorWeekStart.setHours(0, 0, 0, 0);

      const utcWeekStart = Date.UTC(startAnchorWeekStart.getFullYear(), startAnchorWeekStart.getMonth(), startAnchorWeekStart.getDate());
      const weekDiff = Math.floor((utcCheck - utcWeekStart) / (7 * msPerDay));

      if (task.recurrenceWeekdays && task.recurrenceWeekdays.length > 0) {
        if (!task.recurrenceWeekdays.includes(checkDate.getDay())) return false;

        // Calculate effective start week offset
        // If the anchor week has NO valid occurrences on or after the anchor date,
        // then the series effectively starts in week 1, not week 0.
        let offset = 0;
        const anchorDay = startAnchor.getDay();
        // Check if any recurrence day in the anchor week is >= anchorDay
        // (Since weekdays are 0-6 Sun-Sat, we need to be careful with week boundaries if start day is not Sunday?
        // Actually, our anchorWeekStart is always Sunday (0).
        // The days available in week 0 are indices 0..6 corresponding to dates anchorWeekStart + 0..6.
        // We only care if any `d` in recurrenceWeekdays obeys: (anchorWeekStart + d) >= startAnchor
        // Since anchorWeekStart + d is just day index d relative to Sunday,
        // and startAnchor is day index anchorDay relative to Sunday (in the same week).
        // Then we just need any `d >= anchorDay`.
        const hasOccurrenceInWeek0 = task.recurrenceWeekdays.some(d => d >= anchorDay);
        if (!hasOccurrenceInWeek0) {
          offset = 1;
        }

        // We only care about weeks >= offset
        if (weekDiff < offset) return false;

        return ((weekDiff - offset) % interval) === 0;
      }

      if (checkDate.getDay() !== startAnchor.getDay()) return false;
      return (weekDiff % interval) === 0;
    }

    case Recurrence.MONTHLY: {
      const monthDiff = (checkDate.getFullYear() - startAnchor.getFullYear()) * 12 + (checkDate.getMonth() - startAnchor.getMonth());

      if (typeof task.recurrenceMonthNth === 'number' && typeof task.recurrenceMonthWeekday === 'number') {
        if (!isNthWeekdayOfMonth(checkDate, task.recurrenceMonthNth, task.recurrenceMonthWeekday)) return false;
        return (monthDiff % interval) === 0;
      }
      if (task.recurrenceMonthDay && Number.isInteger(task.recurrenceMonthDay)) {
        if (checkDate.getDate() !== task.recurrenceMonthDay) return false;
        return (monthDiff % interval) === 0;
      }
      // Default: same day of month
      if (checkDate.getDate() !== startAnchor.getDate()) return false;
      return (monthDiff % interval) === 0;
    }

    case Recurrence.QUARTERLY: {
      const monthDiff = (checkDate.getFullYear() - startAnchor.getFullYear()) * 12 + (checkDate.getMonth() - startAnchor.getMonth());
      const quarterInterval = 3 * interval;
      if (checkDate.getDate() !== startAnchor.getDate()) return false;
      return (monthDiff % quarterInterval) === 0;
    }

    case Recurrence.YEARLY: {
      const yearDiff = checkDate.getFullYear() - startAnchor.getFullYear();
      if (checkDate.getMonth() !== startAnchor.getMonth() || checkDate.getDate() !== startAnchor.getDate()) return false;
      return (yearDiff % interval) === 0;
    }

    default:
      return false;
  }
};
