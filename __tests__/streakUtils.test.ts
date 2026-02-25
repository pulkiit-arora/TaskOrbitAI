
import { describe, it, expect } from 'vitest';
import { calculateStreak, getTopStreaks, getStreakBadge } from '../utils/streakUtils';
import { Task, Status, Priority, Recurrence } from '../types';

const makeTask = (override: Partial<Task> = {}): Task => ({
    id: 'task-1',
    title: 'Test Task',
    description: '',
    status: Status.TODO,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.NONE,
    createdAt: Date.now(),
    ...override
});

describe('calculateStreak', () => {
    it('returns null for non-recurring tasks', () => {
        const task = makeTask({ recurrence: Recurrence.NONE });
        expect(calculateStreak(task, [task])).toBeNull();
    });

    it('returns zero streak for recurring task with no history', () => {
        const task = makeTask({ id: 'r1', recurrence: Recurrence.DAILY });
        const result = calculateStreak(task, [task]);
        expect(result).not.toBeNull();
        expect(result!.currentStreak).toBe(0);
        expect(result!.longestStreak).toBe(0);
        expect(result!.isActive).toBe(true);
    });

    it('counts consecutive completions as a streak', () => {
        const base = makeTask({ id: 'r1', recurrence: Recurrence.DAILY });
        const h1 = makeTask({ id: 'h1', seriesId: 'r1', status: Status.DONE, completedAt: 1000, dueDate: '2024-01-01' });
        const h2 = makeTask({ id: 'h2', seriesId: 'r1', status: Status.DONE, completedAt: 2000, dueDate: '2024-01-02' });
        const h3 = makeTask({ id: 'h3', seriesId: 'r1', status: Status.DONE, completedAt: 3000, dueDate: '2024-01-03' });

        const result = calculateStreak(base, [base, h1, h2, h3]);
        expect(result!.currentStreak).toBe(3);
        expect(result!.longestStreak).toBe(3);
    });

    it('resets streak on EXPIRED entry', () => {
        const base = makeTask({ id: 'r1', recurrence: Recurrence.DAILY });
        const h1 = makeTask({ id: 'h1', seriesId: 'r1', status: Status.DONE, completedAt: 1000, dueDate: '2024-01-01' });
        const h2 = makeTask({ id: 'h2', seriesId: 'r1', status: Status.DONE, completedAt: 2000, dueDate: '2024-01-02' });
        const h3 = makeTask({ id: 'h3', seriesId: 'r1', status: Status.EXPIRED, completedAt: 3000, dueDate: '2024-01-03' });
        const h4 = makeTask({ id: 'h4', seriesId: 'r1', status: Status.DONE, completedAt: 4000, dueDate: '2024-01-04' });

        const result = calculateStreak(base, [base, h1, h2, h3, h4]);
        expect(result!.currentStreak).toBe(1);  // Only h4 after the break
        expect(result!.longestStreak).toBe(2);   // h1, h2
    });

    it('sets currentStreak to 0 when last history item is EXPIRED', () => {
        const base = makeTask({ id: 'r1', recurrence: Recurrence.DAILY });
        const h1 = makeTask({ id: 'h1', seriesId: 'r1', status: Status.DONE, completedAt: 1000, dueDate: '2024-01-01' });
        const h2 = makeTask({ id: 'h2', seriesId: 'r1', status: Status.EXPIRED, completedAt: 2000, dueDate: '2024-01-02' });

        const result = calculateStreak(base, [base, h1, h2]);
        expect(result!.currentStreak).toBe(0);
        expect(result!.longestStreak).toBe(1);
    });

    it('tracks lastCompletedDate', () => {
        const base = makeTask({ id: 'r1', recurrence: Recurrence.DAILY });
        const h1 = makeTask({ id: 'h1', seriesId: 'r1', status: Status.DONE, completedAt: 1000, dueDate: '2024-01-05' });

        const result = calculateStreak(base, [base, h1]);
        expect(result!.lastCompletedDate).toBe('2024-01-05');
    });

    it('marks inactive when task is DONE', () => {
        const base = makeTask({ id: 'r1', recurrence: Recurrence.DAILY, status: Status.DONE });
        const result = calculateStreak(base, [base]);
        expect(result!.isActive).toBe(false);
    });

    it('returns isActive true for ARCHIVED task with no history (early return path)', () => {
        // Note: When history is empty, calculateStreak returns isActive: true unconditionally.
        // This is a known behavior — the isActive check only runs in the history branch.
        const base = makeTask({ id: 'r1', recurrence: Recurrence.DAILY, status: Status.ARCHIVED });
        const result = calculateStreak(base, [base]);
        expect(result!.isActive).toBe(true);
    });

    it('marks inactive when task is ARCHIVED and has history', () => {
        const base = makeTask({ id: 'r1', recurrence: Recurrence.DAILY, status: Status.ARCHIVED });
        const h1 = makeTask({ id: 'h1', seriesId: 'r1', status: Status.DONE, completedAt: 1000, dueDate: '2024-01-01' });
        const result = calculateStreak(base, [base, h1]);
        expect(result!.isActive).toBe(false);
    });
});

describe('getTopStreaks', () => {
    it('returns streaks sorted by currentStreak descending', () => {
        const t1 = makeTask({ id: 'r1', recurrence: Recurrence.DAILY, title: 'Task A' });
        const t2 = makeTask({ id: 'r2', recurrence: Recurrence.WEEKLY, title: 'Task B' });
        // Task A: 1 completion, Task B: 2 completions
        const h1a = makeTask({ id: 'h1a', seriesId: 'r1', status: Status.DONE, completedAt: 1000, dueDate: '2024-01-01' });
        const h1b = makeTask({ id: 'h1b', seriesId: 'r2', status: Status.DONE, completedAt: 1000, dueDate: '2024-01-01' });
        const h2b = makeTask({ id: 'h2b', seriesId: 'r2', status: Status.DONE, completedAt: 2000, dueDate: '2024-01-08' });

        const all = [t1, t2, h1a, h1b, h2b];
        const streaks = getTopStreaks(all);
        expect(streaks.length).toBe(2);
        expect(streaks[0].taskTitle).toBe('Task B'); // 2 streak
        expect(streaks[1].taskTitle).toBe('Task A'); // 1 streak
    });

    it('respects the limit parameter', () => {
        const tasks: Task[] = [];
        for (let i = 0; i < 5; i++) {
            const base = makeTask({ id: `r${i}`, recurrence: Recurrence.DAILY, title: `Task ${i}` });
            const h = makeTask({ id: `h${i}`, seriesId: `r${i}`, status: Status.DONE, completedAt: 1000 + i, dueDate: '2024-01-01' });
            tasks.push(base, h);
        }
        const streaks = getTopStreaks(tasks, 3);
        expect(streaks.length).toBe(3);
    });

    it('excludes tasks with seriesId (history items) from base tasks', () => {
        const base = makeTask({ id: 'r1', recurrence: Recurrence.DAILY });
        const history = makeTask({ id: 'h1', seriesId: 'r1', recurrence: Recurrence.DAILY, status: Status.DONE, completedAt: 1000 });
        const streaks = getTopStreaks([base, history]);
        // Only 1 base task, so at most 1 streak entry
        expect(streaks.length).toBeLessThanOrEqual(1);
    });
});

describe('getStreakBadge', () => {
    it('returns empty string for streak < 3', () => {
        expect(getStreakBadge(0)).toBe('');
        expect(getStreakBadge(1)).toBe('');
        expect(getStreakBadge(2)).toBe('');
    });

    it('returns ✨ for streak 3-6', () => {
        expect(getStreakBadge(3)).toBe('✨');
        expect(getStreakBadge(6)).toBe('✨');
    });

    it('returns ⭐ for streak 7-13', () => {
        expect(getStreakBadge(7)).toBe('⭐');
        expect(getStreakBadge(13)).toBe('⭐');
    });

    it('returns 🔥 for streak 14-29', () => {
        expect(getStreakBadge(14)).toBe('🔥');
        expect(getStreakBadge(29)).toBe('🔥');
    });

    it('returns 🏆 for streak >= 30', () => {
        expect(getStreakBadge(30)).toBe('🏆');
        expect(getStreakBadge(100)).toBe('🏆');
    });
});
