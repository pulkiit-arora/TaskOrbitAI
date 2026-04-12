
import { describe, it, expect } from 'vitest';
import { processTaskStatusChange } from '../utils/taskLogic';
import { Task, Status, Priority, Recurrence } from '../types';

describe('processTaskStatusChange', () => {
    // Helper to create a basic task
    const createTask = (override: Partial<Task> = {}): Task => ({
        id: '1',
        title: 'Task',
        description: '',
        status: Status.NEXT_ACTION,
        priority: Priority.MEDIUM,
        recurrence: Recurrence.NONE,
        createdAt: Date.now(),
        ...override
    });

    it('should update simple status', () => {
        const tasks = [createTask({ id: '1', status: Status.NEXT_ACTION })];
        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        expect(updated).toHaveLength(1);
        expect(updated[0].status).toBe(Status.DONE);
    });

    it('should create next recurrence when completing a daily task', () => {
        const tasks = [createTask({
            id: '1',
            recurrence: Recurrence.DAILY,
            status: Status.NEXT_ACTION,
            dueDate: '2024-01-01T12:00:00.000Z'
        })];

        const updated = processTaskStatusChange(tasks, '1', Status.DONE);

        expect(updated).toHaveLength(2);

        const original = updated.find(t => t.id === '1');
        expect(original?.status).toBe(Status.DONE);

        const next = updated.find(t => t.id !== '1');
        expect(next).toBeDefined();
        expect(next?.status).toBe(Status.NEXT_ACTION);
        expect(next?.recurrence).toBe(Recurrence.DAILY);
        expect(next?.dueDate).toContain('2024-01-02');
    });

    it('should create next recurrence for monthly task on specific day', () => {
        const tasks = [createTask({
            id: '1',
            recurrence: Recurrence.MONTHLY,
            recurrenceMonthDay: 5,
            status: Status.NEXT_ACTION,
            dueDate: '2024-01-05T12:00:00.000Z'
        })];

        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        const next = updated.find(t => t.id !== '1');

        expect(next).toBeDefined();
        expect(next?.dueDate).toContain('2024-02-05');
    });

    it('should NOT create duplicate recurrence if un-completing and re-completing', () => {
        let tasks = [createTask({ id: '1', recurrence: Recurrence.DAILY, dueDate: '2024-01-01' })];

        tasks = processTaskStatusChange(tasks, '1', Status.DONE);
        expect(tasks).toHaveLength(2);
        const nextTaskId = tasks.find(t => t.id !== '1')?.id;

        tasks = processTaskStatusChange(tasks, '1', Status.NEXT_ACTION);
        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('1');
        expect(tasks.find(t => t.id === nextTaskId)).toBeUndefined();
    });

    it('should handle Board View drag-and-drop (Status change only for non-recurring)', () => {
        const tasks = [createTask({ id: '1', status: Status.NEXT_ACTION })];
        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        expect(updated[0].status).toBe(Status.DONE);
    });

    // ─── ADDITIONAL TESTS ──────────────────────────────────────

    it('should set completedAt when marking as DONE', () => {
        const tasks = [createTask({ id: '1', status: Status.NEXT_ACTION })];
        const before = Date.now();
        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        const after = Date.now();
        expect(updated[0].completedAt).toBeDefined();
        expect(updated[0].completedAt).toBeGreaterThanOrEqual(before);
        expect(updated[0].completedAt).toBeLessThanOrEqual(after);
    });

    it('should clear completedAt when un-completing (DONE -> TODO)', () => {
        const tasks = [createTask({ id: '1', status: Status.DONE, completedAt: 12345 })];
        const updated = processTaskStatusChange(tasks, '1', Status.NEXT_ACTION);
        expect(updated[0].completedAt).toBeUndefined();
    });

    it('should return unchanged list for non-existent task ID', () => {
        const tasks = [createTask({ id: '1' })];
        const updated = processTaskStatusChange(tasks, 'nonexistent', Status.DONE);
        expect(updated).toEqual(tasks);
    });

    it('should handle IN_PROGRESS -> DONE for recurring task (creates next occurrence)', () => {
        const tasks = [createTask({
            id: '1',
            recurrence: Recurrence.WEEKLY,
            status: Status.NEXT_ACTION,
            dueDate: '2024-01-01T12:00:00.000Z'
        })];

        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        expect(updated).toHaveLength(2);
        expect(updated.find(t => t.id === '1')?.status).toBe(Status.DONE);
        const next = updated.find(t => t.id !== '1');
        expect(next?.status).toBe(Status.NEXT_ACTION);
        expect(next?.recurrence).toBe(Recurrence.WEEKLY);
    });

    it('should set completedAt on recurring task when completed', () => {
        const tasks = [createTask({
            id: '1',
            recurrence: Recurrence.DAILY,
            status: Status.NEXT_ACTION,
            dueDate: '2024-01-01T12:00:00.000Z'
        })];

        const updated = processTaskStatusChange(tasks, '1', Status.DONE);
        const completed = updated.find(t => t.id === '1');
        expect(completed?.completedAt).toBeDefined();
    });

    it('should handle TODO -> IN_PROGRESS (simple status change, no new task)', () => {
        const tasks = [createTask({ id: '1', status: Status.NEXT_ACTION })];
        const updated = processTaskStatusChange(tasks, '1', Status.NEXT_ACTION);
        expect(updated[0].status).toBe(Status.NEXT_ACTION);
        expect(updated).toHaveLength(1);
    });

    it('should handle TODO -> ARCHIVED (simple status change)', () => {
        const tasks = [createTask({ id: '1', status: Status.NEXT_ACTION })];
        const updated = processTaskStatusChange(tasks, '1', Status.ARCHIVED);
        expect(updated[0].status).toBe(Status.ARCHIVED);
        expect(updated).toHaveLength(1);
    });
});
