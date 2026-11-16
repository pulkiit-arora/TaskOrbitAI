
import { describe, it, expect } from 'vitest';
import { processTaskStatusChange, mergeTasks } from '../utils/taskLogic';
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

describe('mergeTasks', () => {
    const makeTask = (id: string, title: string, updatedAt: number, isDeleted?: boolean): Task => ({
        id,
        title,
        description: '',
        status: Status.NEXT_ACTION,
        priority: Priority.MEDIUM,
        recurrence: Recurrence.NONE,
        createdAt: 1000,
        updatedAt,
        isDeleted
    });

    it('should prefer local task when local updatedAt is newer', () => {
        const local = [makeTask('1', 'Local Newer', 2000)];
        const cloud = [makeTask('1', 'Cloud Older', 1500)];
        const merged = mergeTasks(local, cloud);
        expect(merged).toHaveLength(1);
        expect(merged[0].title).toBe('Local Newer');
    });

    it('should prefer cloud task when cloud updatedAt is newer', () => {
        const local = [makeTask('1', 'Local Older', 1500)];
        const cloud = [makeTask('1', 'Cloud Newer', 2000)];
        const merged = mergeTasks(local, cloud);
        expect(merged).toHaveLength(1);
        expect(merged[0].title).toBe('Cloud Newer');
    });

    it('should preserve local deletion tombstone if deleted after cloud update', () => {
        const local = [makeTask('1', 'Task to Delete', 2500, true)];
        const cloud = [makeTask('1', 'Active in Cloud', 2000, false)];
        const merged = mergeTasks(local, cloud);
        expect(merged).toHaveLength(1);
        expect(merged[0].isDeleted).toBe(true);
    });

    it('should accept cloud deletion tombstone if deleted in cloud after local update', () => {
        const local = [makeTask('1', 'Active Locally', 2000, false)];
        const cloud = [makeTask('1', 'Deleted in Cloud', 2500, true)];
        const merged = mergeTasks(local, cloud);
        expect(merged).toHaveLength(1);
        expect(merged[0].isDeleted).toBe(true);
    });

    it('should merge independent tasks from local and cloud', () => {
        const local = [makeTask('1', 'Task 1', 1000)];
        const cloud = [makeTask('2', 'Task 2', 1200)];
        const merged = mergeTasks(local, cloud);
        expect(merged).toHaveLength(2);
        expect(merged.map(t => t.id).sort()).toEqual(['1', '2']);
    });
});
