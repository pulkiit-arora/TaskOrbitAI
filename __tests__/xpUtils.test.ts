
import { describe, it, expect } from 'vitest';
import { calculateXP } from '../utils/xpUtils';
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

describe('calculateXP', () => {

    it('returns zero XP with no tasks', () => {
        const xp = calculateXP([]);
        expect(xp.totalXP).toBe(0);
        expect(xp.level).toBe(0);
        expect(xp.title).toBe('Novice');
        expect(xp.progress).toBe(0);
    });

    it('returns zero XP when no tasks are completed', () => {
        const tasks = [makeTask({ status: Status.TODO })];
        const xp = calculateXP(tasks);
        expect(xp.totalXP).toBe(0);
    });

    describe('XP per priority', () => {
        it('awards 10 XP for LOW priority task', () => {
            const tasks = [makeTask({ status: Status.DONE, priority: Priority.LOW })];
            expect(calculateXP(tasks).totalXP).toBe(10);
        });

        it('awards 25 XP for MEDIUM priority task', () => {
            const tasks = [makeTask({ status: Status.DONE, priority: Priority.MEDIUM })];
            expect(calculateXP(tasks).totalXP).toBe(25);
        });

        it('awards 50 XP for HIGH priority task', () => {
            const tasks = [makeTask({ status: Status.DONE, priority: Priority.HIGH })];
            expect(calculateXP(tasks).totalXP).toBe(50);
        });
    });

    describe('subtask bonus', () => {
        it('awards 5 XP per completed subtask', () => {
            const tasks = [makeTask({
                status: Status.DONE,
                priority: Priority.LOW, // 10 base
                subtasks: [
                    { id: 's1', title: 'Sub 1', completed: true, order: 0 },
                    { id: 's2', title: 'Sub 2', completed: true, order: 1 },
                    { id: 's3', title: 'Sub 3', completed: false, order: 2 }, // not completed
                ]
            })];
            expect(calculateXP(tasks).totalXP).toBe(10 + 5 * 2); // 20
        });
    });

    describe('time entry bonus', () => {
        it('awards 5 XP per time entry (pomodoro session)', () => {
            const tasks = [makeTask({
                status: Status.DONE,
                priority: Priority.LOW, // 10 base
                timeEntries: [
                    { id: 'te1', startTime: 0, endTime: 1500, duration: 1500 },
                    { id: 'te2', startTime: 2000, endTime: 3500, duration: 1500 },
                ]
            })];
            expect(calculateXP(tasks).totalXP).toBe(10 + 5 * 2); // 20
        });
    });

    describe('cumulative XP across multiple tasks', () => {
        it('sums XP from multiple completed tasks', () => {
            const tasks = [
                makeTask({ id: '1', status: Status.DONE, priority: Priority.HIGH }),   // 50
                makeTask({ id: '2', status: Status.DONE, priority: Priority.MEDIUM }), // 25
                makeTask({ id: '3', status: Status.DONE, priority: Priority.LOW }),    // 10
                makeTask({ id: '4', status: Status.TODO, priority: Priority.HIGH }),   // 0 (not done)
            ];
            expect(calculateXP(tasks).totalXP).toBe(85);
        });
    });

    describe('level calculation', () => {
        it('calculates level = floor(sqrt(totalXP / 50))', () => {
            // 50 XP → sqrt(1) = 1
            const tasks1 = [makeTask({ status: Status.DONE, priority: Priority.HIGH })]; // 50 XP
            expect(calculateXP(tasks1).level).toBe(1);

            // 10 XP → sqrt(0.2) = 0.44 → floor = 0
            const tasks0 = [makeTask({ status: Status.DONE, priority: Priority.LOW })]; // 10 XP
            expect(calculateXP(tasks0).level).toBe(0);
        });
    });

    describe('level titles', () => {
        it('returns "Novice" at level 0', () => {
            const xp = calculateXP([]);
            expect(xp.title).toBe('Novice');
        });

        it('returns "Apprentice" at level 1', () => {
            // Need 50 XP for level 1
            const tasks = [makeTask({ status: Status.DONE, priority: Priority.HIGH })]; // 50 XP
            expect(calculateXP(tasks).title).toBe('Apprentice');
        });
    });

    describe('progress calculation', () => {
        it('progress is between 0 and 1', () => {
            const tasks = [
                makeTask({ id: '1', status: Status.DONE, priority: Priority.MEDIUM }),
                makeTask({ id: '2', status: Status.DONE, priority: Priority.MEDIUM }),
            ];
            const xp = calculateXP(tasks);
            expect(xp.progress).toBeGreaterThanOrEqual(0);
            expect(xp.progress).toBeLessThanOrEqual(1);
        });

        it('caps progress at 1', () => {
            // Even with very high XP, progress should never exceed 1
            const tasks = Array.from({ length: 100 }, (_, i) =>
                makeTask({ id: `t${i}`, status: Status.DONE, priority: Priority.HIGH })
            );
            const xp = calculateXP(tasks);
            expect(xp.progress).toBeLessThanOrEqual(1);
        });
    });
});
