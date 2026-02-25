
import { describe, it, expect } from 'vitest';
import { parseQuickAdd, formatParsedTaskPreview } from '../utils/quickAddParser';
import { Priority, Recurrence } from '../types';

describe('parseQuickAdd', () => {

    describe('title extraction', () => {
        it('returns the raw text as title when no modifiers present', () => {
            const result = parseQuickAdd('Buy groceries');
            expect(result.title).toBe('Buy groceries');
        });

        it('defaults to "New Task" when input is empty after extraction', () => {
            const result = parseQuickAdd('!high #work daily');
            expect(result.title).toBe('New Task');
        });
    });

    describe('tag extraction', () => {
        it('extracts a single #tag', () => {
            const result = parseQuickAdd('Buy groceries #shopping');
            expect(result.tags).toEqual(['shopping']);
            expect(result.title).toBe('Buy groceries');
        });

        it('extracts multiple #tags', () => {
            const result = parseQuickAdd('Fix bug #dev #urgent');
            expect(result.tags).toContain('dev');
            expect(result.tags).toContain('urgent');
            expect(result.tags).toHaveLength(2);
        });

        it('matches existing tags by label (case-insensitive)', () => {
            const existingTags = [{ id: 'tag-1', label: 'Work', color: 'red' }];
            const result = parseQuickAdd('Task #work', existingTags);
            expect(result.tags).toEqual(['tag-1']);
        });
    });

    describe('priority extraction', () => {
        it('parses !high', () => {
            const result = parseQuickAdd('Task !high');
            expect(result.priority).toBe(Priority.HIGH);
        });

        it('parses !medium', () => {
            const result = parseQuickAdd('Task !medium');
            expect(result.priority).toBe(Priority.MEDIUM);
        });

        it('parses !low', () => {
            const result = parseQuickAdd('Task !low');
            expect(result.priority).toBe(Priority.LOW);
        });

        it('parses numeric shorthand !1 = HIGH', () => {
            const result = parseQuickAdd('Task !1');
            expect(result.priority).toBe(Priority.HIGH);
        });

        it('parses numeric shorthand !2 = MEDIUM', () => {
            const result = parseQuickAdd('Task !2');
            expect(result.priority).toBe(Priority.MEDIUM);
        });

        it('parses numeric shorthand !3 = LOW', () => {
            const result = parseQuickAdd('Task !3');
            expect(result.priority).toBe(Priority.LOW);
        });
    });

    describe('date extraction', () => {
        it('parses "today"', () => {
            const result = parseQuickAdd('Buy milk today');
            expect(result.dueDate).toBeDefined();
            const due = new Date(result.dueDate!);
            const now = new Date();
            expect(due.getDate()).toBe(now.getDate());
            expect(due.getMonth()).toBe(now.getMonth());
        });

        it('parses "tomorrow"', () => {
            const result = parseQuickAdd('Buy milk tomorrow');
            expect(result.dueDate).toBeDefined();
            const due = new Date(result.dueDate!);
            const expected = new Date();
            expected.setDate(expected.getDate() + 1);
            expect(due.getDate()).toBe(expected.getDate());
        });

        it('parses "next week"', () => {
            const result = parseQuickAdd('Buy milk next week');
            expect(result.dueDate).toBeDefined();
            const due = new Date(result.dueDate!);
            const expected = new Date();
            expected.setDate(expected.getDate() + 7);
            expect(due.getDate()).toBe(expected.getDate());
        });
    });

    describe('recurrence extraction', () => {
        it('parses "daily"', () => {
            const result = parseQuickAdd('Exercise daily');
            expect(result.recurrence).toBe(Recurrence.DAILY);
            expect(result.recurrenceInterval).toBe(1);
        });

        it('parses "weekly"', () => {
            const result = parseQuickAdd('Review weekly');
            expect(result.recurrence).toBe(Recurrence.WEEKLY);
        });

        it('parses "monthly"', () => {
            const result = parseQuickAdd('Pay rent monthly');
            expect(result.recurrence).toBe(Recurrence.MONTHLY);
        });

        it('parses "quarterly"', () => {
            const result = parseQuickAdd('Report quarterly');
            expect(result.recurrence).toBe(Recurrence.QUARTERLY);
        });

        it('parses "yearly"', () => {
            const result = parseQuickAdd('Birthday yearly');
            expect(result.recurrence).toBe(Recurrence.YEARLY);
        });
    });

    describe('recurrence with interval', () => {
        it('parses "every 2 days"', () => {
            const result = parseQuickAdd('Exercise every 2 days');
            expect(result.recurrence).toBe(Recurrence.DAILY);
            expect(result.recurrenceInterval).toBe(2);
        });

        it('parses "every 3 weeks"', () => {
            const result = parseQuickAdd('Meeting every 3 weeks');
            expect(result.recurrence).toBe(Recurrence.WEEKLY);
            expect(result.recurrenceInterval).toBe(3);
        });

        it('parses "every 6 months"', () => {
            const result = parseQuickAdd('Dentist every 6 months');
            expect(result.recurrence).toBe(Recurrence.MONTHLY);
            expect(result.recurrenceInterval).toBe(6);
        });
    });

    describe('combined modifiers', () => {
        it('parses title with tag, priority, and recurrence', () => {
            const result = parseQuickAdd('Pay rent monthly #bills !high');
            expect(result.title).toBe('Pay rent');
            expect(result.recurrence).toBe(Recurrence.MONTHLY);
            expect(result.tags).toEqual(['bills']);
            expect(result.priority).toBe(Priority.HIGH);
        });
    });

    describe('recurrence defaults due date to today', () => {
        it('sets dueDate to today when recurrence is set but no date keyword', () => {
            const result = parseQuickAdd('Exercise daily');
            expect(result.dueDate).toBeDefined();
            const due = new Date(result.dueDate!);
            const now = new Date();
            expect(due.getDate()).toBe(now.getDate());
        });
    });
});

describe('formatParsedTaskPreview', () => {
    it('formats title only', () => {
        const preview = formatParsedTaskPreview({ title: 'Buy milk' });
        expect(preview).toBe('Buy milk');
    });

    it('includes recurrence label', () => {
        const preview = formatParsedTaskPreview({ title: 'Exercise', recurrence: Recurrence.DAILY, recurrenceInterval: 1 });
        expect(preview).toContain('Daily');
    });

    it('includes custom interval in label', () => {
        const preview = formatParsedTaskPreview({ title: 'Yoga', recurrence: Recurrence.DAILY, recurrenceInterval: 3 });
        expect(preview).toContain('Every 3 days');
    });

    it('includes priority icon', () => {
        const preview = formatParsedTaskPreview({ title: 'Task', priority: Priority.HIGH });
        expect(preview).toContain('🔴');
    });

    it('includes tag count', () => {
        const preview = formatParsedTaskPreview({ title: 'Task', tags: ['work', 'urgent'] });
        expect(preview).toContain('🏷️ 2');
    });

    it('includes date label for today', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const preview = formatParsedTaskPreview({ title: 'Task', dueDate: today.toISOString() });
        expect(preview).toContain('📅 Today');
    });

    it('includes date label for tomorrow', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        const preview = formatParsedTaskPreview({ title: 'Task', dueDate: tomorrow.toISOString() });
        expect(preview).toContain('📅 Tomorrow');
    });
});
