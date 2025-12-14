
import { describe, it, expect } from 'vitest';
import { processTaskStatusChange } from '../utils/taskLogic';
import { Task, Status, Priority, Recurrence } from '../types';

describe('processTaskStatusChange', () => {
    // Helper to create a basic task
    const createTask = (override: Partial<Task> = {}): Task => ({
        id: '1',
        title: 'Task',
        description: '',
        status: Status.TODO,
        priority: Priority.MEDIUM,
        recurrence: Recurrence.NONE,
        createdAt: Date.now(),
        ...override
    });

    it('should update simple status', () => {
        const tasks = [createTask({ id: '1', status: Status.TODO })];
        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        expect(updated).toHaveLength(1);
        expect(updated[0].status).toBe(Status.DONE);
    });

    it('should create next recurrence when completing a daily task', () => {
        const tasks = [createTask({
            id: '1',
            recurrence: Recurrence.DAILY,
            status: Status.TODO,
            dueDate: '2024-01-01T12:00:00.000Z'
        })];

        const updated = processTaskStatusChange(tasks, '1', Status.DONE);

        // Should have 2 tasks: 1 completed, 1 new TODO
        expect(updated).toHaveLength(2);

        const original = updated.find(t => t.id === '1');
        expect(original?.status).toBe(Status.DONE);

        const next = updated.find(t => t.id !== '1');
        expect(next).toBeDefined();
        expect(next?.status).toBe(Status.TODO);
        expect(next?.recurrence).toBe(Recurrence.DAILY);
        // Next due date logic is tested in utils.test.ts, but verify it's generally correct
        expect(next?.dueDate).toContain('2024-01-02');
    });

    it('should create next recurrence for monthly task on specific day', () => {
        const tasks = [createTask({
            id: '1',
            recurrence: Recurrence.MONTHLY,
            recurrenceMonthDay: 5,
            status: Status.TODO,
            dueDate: '2024-01-05T12:00:00.000Z'
        })];

        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        const next = updated.find(t => t.id !== '1');

        expect(next).toBeDefined();
        // Should be Feb 5th
        expect(next?.dueDate).toContain('2024-02-05');
    });

    it('should NOT create duplicate recurrence if un-completing and re-completing', () => {
        // 1. Start with TODO task
        let tasks = [createTask({ id: '1', recurrence: Recurrence.DAILY, dueDate: '2024-01-01' })];

        // 2. Complete it -> generates Task 2
        tasks = processTaskStatusChange(tasks, '1', Status.DONE);
        expect(tasks).toHaveLength(2);
        const nextTaskId = tasks.find(t => t.id !== '1')?.id;

        // 3. Un-complete Task 1 -> Should remove Task 2
        tasks = processTaskStatusChange(tasks, '1', Status.TODO);
        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('1');
        expect(tasks.find(t => t.id === nextTaskId)).toBeUndefined();
    });

    it('should handle Board View drag-and-drop (Status change only for non-recurring)', () => {
        const tasks = [createTask({ id: '1', status: Status.IN_PROGRESS })];
        // Moving from In Progress to Done
        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        expect(updated[0].status).toBe(Status.DONE);
    });
});
