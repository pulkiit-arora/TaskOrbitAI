
import { describe, it, expect } from 'vitest';
import { calculateNextDueDate, sortTasks, formatRecurrenceSummary, isOpen } from '../utils/taskUtils';
import { Recurrence, Task, Status, Priority } from '../types';

describe('taskUtils', () => {

    describe('calculateNextDueDate', () => {
        // Helper to create date object easier
        const date = (str: string) => new Date(str);

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
            // 2024 is a leap year, Feb has 29 days.
            const next = calculateNextDueDate(start, Recurrence.MONTHLY, 1);

            // Should be Feb 29
            expect(next.getMonth()).toBe(1); // Feb
            expect(next.getDate()).toBe(29);
            expect(next.toISOString()).toContain('2024-02-29');
        });

        it('should handle MONTHLY recurrence overflow (Jan 31 -> Feb, non-leap)', () => {
            const start = '2023-01-31T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.MONTHLY, 1);

            // Should be Feb 28
            expect(next.getMonth()).toBe(1); // Feb
            expect(next.getDate()).toBe(28);
        });

        it('should handle MONTHLY recurrence with Specific Day', () => {
            const start = '2024-01-31T12:00:00.000Z';
            // Set to 5th of next month
            const next = calculateNextDueDate(start, Recurrence.MONTHLY, 1, undefined, 5);

            expect(next.getMonth()).toBe(1); // Feb
            expect(next.getDate()).toBe(5);
            expect(next.toISOString()).toBe('2024-02-05T12:00:00.000Z');
        });

        it('should handle WEEKLY recurrence (Next week same day)', () => {
            const start = '2024-01-01T12:00:00.000Z'; // Monday
            const next = calculateNextDueDate(start, Recurrence.WEEKLY, 1);
            expect(next.toISOString()).toBe('2024-01-08T12:00:00.000Z');
        });

        it('should handle YEARLY recurrence', () => {
            const start = '2024-01-01T12:00:00.000Z';
            const next = calculateNextDueDate(start, Recurrence.YEARLY, 1);
            expect(next.toISOString()).toBe('2025-01-01T12:00:00.000Z');
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
            expect(sorted[0].id).toBe('2'); // Earlier date first
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
    });
});
