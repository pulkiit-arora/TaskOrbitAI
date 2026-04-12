
import { describe, it, expect } from 'vitest';
import { calculateNextDueDate, sortTasks, formatRecurrenceSummary, isOpen, getNthWeekdayOfMonth, isNthWeekdayOfMonth, calculateTaskStats } from '../utils/taskUtils';
import { Recurrence, Task, Status, Priority } from '../types';

const makeTask = (override: Partial<Task> = {}): Task => ({
    id: 'test-1',
    title: 'Test Task',
    description: '',
    status: Status.NEXT_ACTION,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.NONE,
    createdAt: Date.now(),
    ...override
});

describe('taskUtils', () => {

    describe('getNthWeekdayOfMonth', () => {
        it('returns the 1st Monday of January 2024 (Jan 1)', () => {
            const d = getNthWeekdayOfMonth(2024, 0, 1, 1); // 1st Mon, Jan 2024
            expect(d.getDate()).toBe(1);
        });

        it('returns the 2nd Tuesday of January 2024 (Jan 9)', () => {
            const d = getNthWeekdayOfMonth(2024, 0, 2, 2); // 2nd Tue
            expect(d.getDate()).toBe(9);
        });

        it('returns the 3rd Friday of January 2024 (Jan 19)', () => {
            const d = getNthWeekdayOfMonth(2024, 0, 3, 5); // 3rd Fri
            expect(d.getDate()).toBe(19);
        });

        it('returns the last Sunday of January 2024 (Jan 28)', () => {
            const d = getNthWeekdayOfMonth(2024, 0, -1, 0); // Last Sun
            expect(d.getDate()).toBe(28);
        });

        it('returns the last Saturday of February 2024 (Feb 24)', () => {
            const d = getNthWeekdayOfMonth(2024, 1, -1, 6); // Last Sat, Feb 2024 (leap)
            expect(d.getDate()).toBe(24);
        });
    });

    describe('isNthWeekdayOfMonth', () => {
        it('returns true for the 2nd Tuesday of Jan 2024 (Jan 9)', () => {
            const date = new Date(2024, 0, 9);
            expect(isNthWeekdayOfMonth(date, 2, 2)).toBe(true);
        });

        it('returns false for a non-matching date', () => {
            const date = new Date(2024, 0, 10); // Wed
            expect(isNthWeekdayOfMonth(date, 2, 2)).toBe(false);
        });

        it('correctly identifies last Friday of a month', () => {
            // Last Friday of Jan 2024 = Jan 26
            const date = new Date(2024, 0, 26);
            expect(isNthWeekdayOfMonth(date, -1, 5)).toBe(true);
        });
    });

    describe('calculateNextDueDate', () => {
        it('should add days for DAILY recurrence', () => {
            const start = '2024-01-01T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.DAILY, 1);
            expect(next.toISOString()).toBe('2024-01-02T12:00:00.000Z');

            const next2 = calculateNextDueDate(start, Recurrence.DAILY, 5);
            expect(next2.toISOString()).toBe('2024-01-06T12:00:00.000Z');
        });

        it('should add months accurately for MONTHLY recurrence (Normal)', () => {
            const start = '2024-01-15T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.MONTHLY, 1);
            expect(next.toISOString()).toBe('2024-02-15T12:00:00.000Z');
        });

        it('should handle MONTHLY recurrence overflow (Jan 31 -> Feb)', () => {
            const start = '2024-01-31T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.MONTHLY, 1);
            expect(next.getMonth()).toBe(1);
            expect(next.getDate()).toBe(29);
            expect(next.toISOString()).toContain('2024-02-29');
        });

        it('should handle MONTHLY recurrence overflow (Jan 31 -> Feb, non-leap)', () => {
            const start = '2023-01-31T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.MONTHLY, 1);
            expect(next.getMonth()).toBe(1);
            expect(next.getDate()).toBe(28);
        });

        it('should handle MONTHLY recurrence with Specific Day', () => {
            const start = '2024-01-31T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.MONTHLY, 1, undefined, 5);
            expect(next.getMonth()).toBe(1);
            expect(next.getDate()).toBe(5);
            expect(next.toISOString()).toBe('2024-02-05T12:00:00.000Z');
        });

        it('should handle WEEKLY recurrence (Next week same day)', () => {
            const start = '2024-01-01T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.WEEKLY, 1);
            expect(next.toISOString()).toBe('2024-01-08T12:00:00.000Z');
        });

        it('should handle YEARLY recurrence', () => {
            const start = '2024-01-01T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.YEARLY, 1);
            expect(next.toISOString()).toBe('2025-01-01T12:00:00.000Z');
        });

        it('should handle QUARTERLY recurrence', () => {
            const start = '2024-01-15T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.QUARTERLY, 1);
            expect(next.getMonth()).toBe(3);
            expect(next.getDate()).toBe(15);
        });

        it('should handle MONTHLY with nth weekday', () => {
            const start = '2024-01-09T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.MONTHLY, 1, undefined, undefined, undefined, 2, 2);
            expect(next.getDate()).toBe(13);
            expect(next.getMonth()).toBe(1);
        });
    });

    describe('sortTasks', () => {
        it('should sort by priority', () => {
            const t1 = { id: '1', priority: Priority.LOW, createdAt: 100 } as Task;
            const t2 = { id: '2', priority: Priority.HIGH, createdAt: 100 } as Task;
            const t3 = { id: '3', priority: Priority.MEDIUM, createdAt: 100 } as Task;
            const sorted = sortTasks([t1, t2, t3], 'priority');
            expect(sorted.map(t => t.priority)).toEqual([Priority.HIGH, Priority.MEDIUM, Priority.LOW]);
        });

        it('should sort by dueDate', () => {
            const t1 = { id: '1', dueDate: '2024-01-10' } as Task;
            const t2 = { id: '2', dueDate: '2024-01-05' } as Task;
            const sorted = sortTasks([t1, t2], 'dueDate');
            expect(sorted[0].id).toBe('2');
        });

        it('uses createdAt as tiebreaker (newest first)', () => {
            const t1 = makeTask({ id: '1', priority: Priority.HIGH, dueDate: '2024-01-01', createdAt: 100 });
            const t2 = makeTask({ id: '2', priority: Priority.HIGH, dueDate: '2024-01-01', createdAt: 200 });
            const sorted = sortTasks([t1, t2], 'priority');
            expect(sorted[0].id).toBe('2');
        });

        it('pushes tasks without dueDate to the end when sorting by dueDate', () => {
            const t1 = makeTask({ id: '1', dueDate: undefined });
            const t2 = makeTask({ id: '2', dueDate: '2024-01-05' });
            const sorted = sortTasks([t1, t2], 'dueDate');
            expect(sorted[0].id).toBe('2');
            expect(sorted[1].id).toBe('1');
        });
    });

    describe('isOpen', () => {
        it('returns true for TODO', () => {
            expect(isOpen(makeTask({ status: Status.NEXT_ACTION }))).toBe(true);
        });

        it('returns true for IN_PROGRESS', () => {
            expect(isOpen(makeTask({ status: Status.NEXT_ACTION }))).toBe(true);
        });

        it('returns false for DONE', () => {
            expect(isOpen(makeTask({ status: Status.DONE }))).toBe(false);
        });

        it('returns false for ARCHIVED', () => {
            expect(isOpen(makeTask({ status: Status.ARCHIVED }))).toBe(false);
        });

        it('returns false for EXPIRED', () => {
            expect(isOpen(makeTask({ status: Status.EXPIRED }))).toBe(false);
        });
    });

    describe('formatRecurrenceSummary', () => {
        it('should format Daily', () => {
            const t = { recurrence: Recurrence.DAILY, recurrenceInterval: 1 } as Task;
            expect(formatRecurrenceSummary(t)).toBe('Daily');
        });

        it('should format Monthly', () => {
            const t = { recurrence: Recurrence.MONTHLY, recurrenceInterval: 1 } as Task;
            expect(formatRecurrenceSummary(t)).toBe('Monthly');
        });

        it('should format Custom Interval', () => {
            const t = { recurrence: Recurrence.DAILY, recurrenceInterval: 3 } as Task;
            expect(formatRecurrenceSummary(t)).toBe('Every 3 days');
        });

        it('formats Weekly', () => {
            expect(formatRecurrenceSummary({ recurrence: Recurrence.WEEKLY, recurrenceInterval: 1 } as Task)).toBe('Weekly');
        });

        it('formats Weekly on specific days', () => {
            const t = { recurrence: Recurrence.WEEKLY, recurrenceInterval: 1, recurrenceWeekdays: [1, 3] } as Task;
            expect(formatRecurrenceSummary(t)).toBe('Weekly on Mon, Wed');
        });

        it('formats Every N weeks on days', () => {
            const t = { recurrence: Recurrence.WEEKLY, recurrenceInterval: 2, recurrenceWeekdays: [5] } as Task;
            expect(formatRecurrenceSummary(t)).toBe('Every 2 weeks on Fri');
        });

        it('formats Monthly on specific day', () => {
            const t = { recurrence: Recurrence.MONTHLY, recurrenceInterval: 1, recurrenceMonthDay: 15 } as Task;
            expect(formatRecurrenceSummary(t)).toBe('Monthly on day 15');
        });

        it('formats Monthly on nth weekday', () => {
            const t = { recurrence: Recurrence.MONTHLY, recurrenceInterval: 1, recurrenceMonthNth: 2, recurrenceMonthWeekday: 2 } as Task;
            expect(formatRecurrenceSummary(t)).toBe('Monthly on 2nd Tue');
        });

        it('formats Monthly on Last weekday', () => {
            const t = { recurrence: Recurrence.MONTHLY, recurrenceInterval: 1, recurrenceMonthNth: -1, recurrenceMonthWeekday: 5 } as Task;
            expect(formatRecurrenceSummary(t)).toBe('Monthly on Last Fri');
        });

        it('formats Quarterly', () => {
            expect(formatRecurrenceSummary({ recurrence: Recurrence.QUARTERLY, recurrenceInterval: 1 } as Task)).toBe('Quarterly');
        });

        it('formats Yearly', () => {
            expect(formatRecurrenceSummary({ recurrence: Recurrence.YEARLY, recurrenceInterval: 1 } as Task)).toBe('Yearly');
        });

        it('returns empty string for NONE recurrence', () => {
            expect(formatRecurrenceSummary({ recurrence: Recurrence.NONE } as Task)).toBe('');
        });
    });

    describe('calculateTaskStats', () => {
        it('returns null for empty seriesId', () => {
            expect(calculateTaskStats([], '')).toBeNull();
        });

        it('returns null when no tasks match seriesId', () => {
            const tasks = [makeTask({ id: 'other' })];
            expect(calculateTaskStats(tasks, 'nonexistent')).toBeNull();
        });

        it('calculates correct stats for a series', () => {
            const tasks = [
                makeTask({ id: 'base', status: Status.NEXT_ACTION }),
                makeTask({ id: 'h1', seriesId: 'base', status: Status.DONE }),
                makeTask({ id: 'h2', seriesId: 'base', status: Status.DONE }),
                makeTask({ id: 'h3', seriesId: 'base', status: Status.EXPIRED }),
            ];
            const stats = calculateTaskStats(tasks, 'base');
            expect(stats).not.toBeNull();
            expect(stats!.completed).toBe(2);
            expect(stats!.expired).toBe(1);
            expect(stats!.total).toBe(3);
            expect(stats!.rate).toBe(67);
        });

        it('returns 0% rate when only expired tasks', () => {
            const tasks = [
                makeTask({ id: 'base' }),
                makeTask({ id: 'h1', seriesId: 'base', status: Status.EXPIRED }),
            ];
            const stats = calculateTaskStats(tasks, 'base');
            expect(stats!.rate).toBe(0);
        });

        it('returns 100% rate when all completed', () => {
            const tasks = [
                makeTask({ id: 'base', status: Status.DONE }),
                makeTask({ id: 'h1', seriesId: 'base', status: Status.DONE }),
            ];
            const stats = calculateTaskStats(tasks, 'base');
            expect(stats!.rate).toBe(100);
        });
    });
});
