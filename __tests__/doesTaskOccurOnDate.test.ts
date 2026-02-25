
import { describe, it, expect } from 'vitest';
import { doesTaskOccurOnDate } from '../utils/taskUtils';
import { Task, Status, Priority, Recurrence } from '../types';

// Helper to create a task with sensible defaults
const makeTask = (override: Partial<Task> = {}): Task => ({
    id: 'test-1',
    title: 'Test Task',
    description: '',
    status: Status.TODO,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.NONE,
    createdAt: new Date('2024-01-01').getTime(),
    ...override
});

const date = (str: string) => {
    const d = new Date(str);
    d.setHours(0, 0, 0, 0);
    return d;
};

describe('doesTaskOccurOnDate', () => {

    // ─── RECURRENCE.NONE ───────────────────────────────────────
    describe('non-recurring tasks', () => {
        it('returns true when check date matches dueDate', () => {
            const task = makeTask({ dueDate: '2024-03-15T12:00:00.000Z' });
            expect(doesTaskOccurOnDate(task, date('2024-03-15'))).toBe(true);
        });

        it('returns false when check date does not match dueDate', () => {
            const task = makeTask({ dueDate: '2024-03-15T12:00:00.000Z' });
            expect(doesTaskOccurOnDate(task, date('2024-03-16'))).toBe(false);
        });

        it('returns false when task has no dueDate', () => {
            const task = makeTask({ dueDate: undefined });
            expect(doesTaskOccurOnDate(task, date('2024-03-15'))).toBe(false);
        });
    });

    // ─── RECURRENCE.DAILY ──────────────────────────────────────
    describe('daily recurrence', () => {
        it('occurs every day with interval 1', () => {
            const task = makeTask({
                recurrence: Recurrence.DAILY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 1,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-01'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-02'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-10'))).toBe(true);
        });

        it('occurs every N days with interval > 1', () => {
            const task = makeTask({
                recurrence: Recurrence.DAILY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 3,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-01'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-02'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-01-03'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-01-04'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-07'))).toBe(true);
        });

        it('does not occur before the start date', () => {
            const task = makeTask({
                recurrence: Recurrence.DAILY,
                dueDate: '2024-01-05T12:00:00.000Z',
                recurrenceInterval: 1,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-04'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-01-05'))).toBe(true);
        });
    });

    // ─── RECURRENCE.WEEKLY ─────────────────────────────────────
    describe('weekly recurrence', () => {
        it('occurs on the same weekday with interval 1', () => {
            // 2024-01-01 is a Monday
            const task = makeTask({
                recurrence: Recurrence.WEEKLY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 1,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-01'))).toBe(true);   // Mon
            expect(doesTaskOccurOnDate(task, date('2024-01-08'))).toBe(true);   // Next Mon
            expect(doesTaskOccurOnDate(task, date('2024-01-02'))).toBe(false);  // Tue
        });

        it('occurs every 2 weeks on the same weekday', () => {
            const task = makeTask({
                recurrence: Recurrence.WEEKLY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 2,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-01'))).toBe(true);   // Week 0 Mon
            expect(doesTaskOccurOnDate(task, date('2024-01-08'))).toBe(false);  // Week 1 Mon
            expect(doesTaskOccurOnDate(task, date('2024-01-15'))).toBe(true);   // Week 2 Mon
        });

        it('occurs on specific weekdays', () => {
            // Anchor is 2024-01-01 (Monday). Recur Tue(2), Thu(4).
            const task = makeTask({
                recurrence: Recurrence.WEEKLY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 1,
                recurrenceWeekdays: [2, 4], // Tue, Thu
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-01'))).toBe(false);  // Mon – not in weekdays
            expect(doesTaskOccurOnDate(task, date('2024-01-02'))).toBe(true);   // Tue
            expect(doesTaskOccurOnDate(task, date('2024-01-03'))).toBe(false);  // Wed
            expect(doesTaskOccurOnDate(task, date('2024-01-04'))).toBe(true);   // Thu
        });

        it('handles weekly with specific weekdays and multi-week interval', () => {
            // Anchor is 2024-01-01 (Monday). Every 2 weeks on Wed(3).
            const task = makeTask({
                recurrence: Recurrence.WEEKLY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 2,
                recurrenceWeekdays: [3], // Wed
            });
            // Week 0 (Dec31-Jan6): anchor is Mon, Wed(3) >= Mon(1) so offset=0
            // Week 0: Jan 3 (Wed) - should occur
            expect(doesTaskOccurOnDate(task, date('2024-01-03'))).toBe(true);
            // Week 1: Jan 10 (Wed) - should NOT occur (odd week)
            expect(doesTaskOccurOnDate(task, date('2024-01-10'))).toBe(false);
            // Week 2: Jan 17 (Wed) - should occur
            expect(doesTaskOccurOnDate(task, date('2024-01-17'))).toBe(true);
        });
    });

    // ─── RECURRENCE.MONTHLY ────────────────────────────────────
    describe('monthly recurrence', () => {
        it('occurs on the same day of month', () => {
            const task = makeTask({
                recurrence: Recurrence.MONTHLY,
                dueDate: '2024-01-15T12:00:00.000Z',
                recurrenceInterval: 1,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-02-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-02-14'))).toBe(false);
        });

        it('occurs on a specific recurrenceMonthDay', () => {
            const task = makeTask({
                recurrence: Recurrence.MONTHLY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 1,
                recurrenceMonthDay: 5,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-05'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-02-05'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-06'))).toBe(false);
        });

        it('occurs every 2 months', () => {
            const task = makeTask({
                recurrence: Recurrence.MONTHLY,
                dueDate: '2024-01-15T12:00:00.000Z',
                recurrenceInterval: 2,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-02-15'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-03-15'))).toBe(true);
        });

        it('occurs on nth weekday of month', () => {
            // 2nd Tuesday of each month
            const task = makeTask({
                recurrence: Recurrence.MONTHLY,
                dueDate: '2024-01-09T12:00:00.000Z', // 2nd Tue of Jan 2024
                recurrenceInterval: 1,
                recurrenceMonthNth: 2,
                recurrenceMonthWeekday: 2, // Tue
            });
            // 2nd Tue of Jan 2024 = Jan 9
            expect(doesTaskOccurOnDate(task, date('2024-01-09'))).toBe(true);
            // 2nd Tue of Feb 2024 = Feb 13
            expect(doesTaskOccurOnDate(task, date('2024-02-13'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-02-06'))).toBe(false); // 1st Tue
        });
    });

    // ─── RECURRENCE.QUARTERLY ──────────────────────────────────
    describe('quarterly recurrence', () => {
        it('occurs every 3 months on the same day', () => {
            const task = makeTask({
                recurrence: Recurrence.QUARTERLY,
                dueDate: '2024-01-15T12:00:00.000Z',
                recurrenceInterval: 1,
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-02-15'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-04-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-07-15'))).toBe(true);
        });
    });

    // ─── RECURRENCE.YEARLY ─────────────────────────────────────
    describe('yearly recurrence', () => {
        it('occurs on the same date each year', () => {
            const task = makeTask({
                recurrence: Recurrence.YEARLY,
                dueDate: '2024-03-15T12:00:00.000Z',
                recurrenceInterval: 1,
            });
            expect(doesTaskOccurOnDate(task, date('2024-03-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2025-03-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-04-15'))).toBe(false);
        });

        it('occurs every 2 years', () => {
            const task = makeTask({
                recurrence: Recurrence.YEARLY,
                dueDate: '2024-03-15T12:00:00.000Z',
                recurrenceInterval: 2,
            });
            expect(doesTaskOccurOnDate(task, date('2024-03-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2025-03-15'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2026-03-15'))).toBe(true);
        });
    });

    // ─── RECURRENCE END ────────────────────────────────────────
    describe('recurrenceEnd boundary', () => {
        it('does not occur after recurrenceEnd', () => {
            const task = makeTask({
                recurrence: Recurrence.DAILY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 1,
                recurrenceEnd: '2024-01-05T00:00:00.000Z',
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-04'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-05'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-06'))).toBe(false);
        });
    });

    // ─── RECURRENCE START ──────────────────────────────────────
    describe('recurrenceStart boundary', () => {
        it('uses recurrenceStart as anchor instead of dueDate', () => {
            const task = makeTask({
                recurrence: Recurrence.DAILY,
                dueDate: '2024-01-10T12:00:00.000Z',
                recurrenceStart: '2024-01-05T12:00:00.000Z',
                recurrenceInterval: 3,
            });
            // Anchor is Jan 5. So Jan 5, 8, 11, 14...
            expect(doesTaskOccurOnDate(task, date('2024-01-04'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-01-05'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-06'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-01-08'))).toBe(true);
        });
    });

    // ─── EXCLUDED DATES ────────────────────────────────────────
    describe('excludedDates', () => {
        it('does not occur on an excluded date', () => {
            const task = makeTask({
                recurrence: Recurrence.DAILY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 1,
                excludedDates: ['2024-01-03T12:00:00.000Z'],
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-02'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-03'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-01-04'))).toBe(true);
        });

        it('handles multiple excluded dates', () => {
            const task = makeTask({
                recurrence: Recurrence.DAILY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 1,
                excludedDates: ['2024-01-02T00:00:00.000Z', '2024-01-04T00:00:00.000Z'],
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-01'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-02'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-01-03'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-01-04'))).toBe(false);
        });
    });

    // ─── RECURRENCE MONTHS (SEASONAL) ──────────────────────────
    describe('recurrenceMonths (seasonal)', () => {
        it('only occurs in specified months', () => {
            const task = makeTask({
                recurrence: Recurrence.DAILY,
                dueDate: '2024-01-01T12:00:00.000Z',
                recurrenceInterval: 1,
                recurrenceMonths: [0, 2], // Jan, Mar only
            });
            expect(doesTaskOccurOnDate(task, date('2024-01-15'))).toBe(true);
            expect(doesTaskOccurOnDate(task, date('2024-02-15'))).toBe(false);
            expect(doesTaskOccurOnDate(task, date('2024-03-15'))).toBe(true);
        });
    });
});
