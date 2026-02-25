
import { describe, it, expect } from 'vitest';
import { evaluateAchievements } from '../utils/achievementUtils';
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

// Helper to create N completed tasks
const makeDoneTasks = (count: number, overrides: Partial<Task> = {}): Task[] =>
    Array.from({ length: count }, (_, i) => makeTask({
        id: `done-${i}`,
        status: Status.DONE,
        completedAt: Date.now() - i * 86400000, // Spread across days
        ...overrides
    }));

describe('evaluateAchievements', () => {

    describe('milestone achievements', () => {
        it('unlocks "First Step" after 1 completed task', () => {
            const tasks = makeDoneTasks(1);
            const achievements = evaluateAchievements(tasks);
            const firstStep = achievements.find(a => a.id === 'first-task');
            expect(firstStep?.unlocked).toBe(true);
        });

        it('does not unlock "First Step" with 0 completed tasks', () => {
            const achievements = evaluateAchievements([makeTask()]);
            const firstStep = achievements.find(a => a.id === 'first-task');
            expect(firstStep?.unlocked).toBe(false);
        });

        it('unlocks "Getting Rolling" after 10 completed tasks', () => {
            const tasks = makeDoneTasks(10);
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'ten-tasks')?.unlocked).toBe(true);
        });

        it('does not unlock "Getting Rolling" with 9 completed tasks', () => {
            const tasks = makeDoneTasks(9);
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'ten-tasks')?.unlocked).toBe(false);
        });

        it('unlocks "Halfway Hero" after 50 completed tasks', () => {
            const tasks = makeDoneTasks(50);
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'fifty-tasks')?.unlocked).toBe(true);
        });

        it('unlocks "Century Club" after 100 completed tasks', () => {
            const tasks = makeDoneTasks(100);
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'hundred-tasks')?.unlocked).toBe(true);
        });
    });

    describe('priority-based achievements', () => {
        it('unlocks "High Five" after 5 high-priority completed tasks', () => {
            const tasks = makeDoneTasks(5, { priority: Priority.HIGH });
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'high-five')?.unlocked).toBe(true);
        });

        it('does not unlock "High Five" with 4 high-priority tasks', () => {
            const tasks = makeDoneTasks(4, { priority: Priority.HIGH });
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'high-five')?.unlocked).toBe(false);
        });

        it('unlocks "Priority Crusher" after 25 high-priority completed tasks', () => {
            const tasks = makeDoneTasks(25, { priority: Priority.HIGH });
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'priority-crusher')?.unlocked).toBe(true);
        });
    });

    describe('time-based achievements', () => {
        it('unlocks "Early Bird" when a task is completed before 9 AM', () => {
            const earlyDate = new Date();
            earlyDate.setHours(7, 0, 0, 0);
            const tasks = [makeTask({ status: Status.DONE, completedAt: earlyDate.getTime() })];
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'early-bird')?.unlocked).toBe(true);
        });

        it('unlocks "Night Owl" when a task is completed after 10 PM', () => {
            const lateDate = new Date();
            lateDate.setHours(23, 0, 0, 0);
            const tasks = [makeTask({ status: Status.DONE, completedAt: lateDate.getTime() })];
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'night-owl')?.unlocked).toBe(true);
        });
    });

    describe('streak-based achievements', () => {
        it('unlocks "On a Roll" for 3 consecutive days', () => {
            const tasks = [0, 1, 2].map(i => {
                const d = new Date('2024-01-01');
                d.setDate(d.getDate() + i);
                return makeTask({
                    id: `s${i}`,
                    status: Status.DONE,
                    completedAt: d.getTime()
                });
            });
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'three-day-streak')?.unlocked).toBe(true);
        });

        it('does not unlock "On a Roll" for 2 days with a gap', () => {
            const d1 = new Date('2024-01-01');
            const d2 = new Date('2024-01-03'); // gap
            const tasks = [
                makeTask({ id: 's1', status: Status.DONE, completedAt: d1.getTime() }),
                makeTask({ id: 's2', status: Status.DONE, completedAt: d2.getTime() }),
            ];
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'three-day-streak')?.unlocked).toBe(false);
        });
    });

    describe('organization achievements', () => {
        it('unlocks "Organized Mind" with 5 different tags', () => {
            const tasks = Array.from({ length: 5 }, (_, i) => makeTask({
                id: `t${i}`,
                tags: [{ id: `tag-${i}`, label: `Tag ${i}`, color: 'red' }]
            }));
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'tag-master')?.unlocked).toBe(true);
        });

        it('unlocks "Detail Oriented" with a completed task having 5+ subtasks', () => {
            const subtasks = Array.from({ length: 5 }, (_, i) => ({
                id: `sub-${i}`, title: `Sub ${i}`, completed: true, order: i
            }));
            const tasks = [makeTask({ status: Status.DONE, subtasks })];
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'subtask-pro')?.unlocked).toBe(true);
        });
    });

    describe('clean slate achievement', () => {
        it('unlocks "Clean Slate" when no tasks are overdue', () => {
            const future = new Date();
            future.setDate(future.getDate() + 1);
            const tasks = [makeTask({ dueDate: future.toISOString() })];
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'zero-overdue')?.unlocked).toBe(true);
        });

        it('does not unlock "Clean Slate" when tasks are overdue', () => {
            const past = new Date();
            past.setDate(past.getDate() - 1);
            const tasks = [makeTask({ dueDate: past.toISOString() })];
            const achievements = evaluateAchievements(tasks);
            expect(achievements.find(a => a.id === 'zero-overdue')?.unlocked).toBe(false);
        });

        it('does not unlock "Clean Slate" with empty task list', () => {
            const achievements = evaluateAchievements([]);
            expect(achievements.find(a => a.id === 'zero-overdue')?.unlocked).toBe(false);
        });
    });

    it('returns all expected achievement IDs', () => {
        const achievements = evaluateAchievements([]);
        const expectedIds = [
            'first-task', 'ten-tasks', 'fifty-tasks', 'hundred-tasks', 'five-hundred',
            'high-five', 'priority-crusher', 'early-bird', 'night-owl',
            'three-day-streak', 'seven-day-streak', 'thirty-day-streak',
            'tag-master', 'subtask-pro', 'zero-overdue'
        ];
        expectedIds.forEach(id => {
            expect(achievements.find(a => a.id === id)).toBeDefined();
        });
    });
});
