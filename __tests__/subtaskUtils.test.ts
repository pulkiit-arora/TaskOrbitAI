
import { describe, it, expect, vi } from 'vitest';
import {
    getSubtaskProgress,
    isTaskBlocked,
    getBlockingTasks,
    getBlockedTasks,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks
} from '../utils/subtaskUtils';
import { Task, Status, Priority, Recurrence, Subtask } from '../types';

const makeTask = (override: Partial<Task> = {}): Task => ({
    id: 'task-1',
    title: 'Test Task',
    description: '',
    status: Status.NEXT_ACTION,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.NONE,
    createdAt: Date.now(),
    ...override
});

const makeSubtask = (override: Partial<Subtask> = {}): Subtask => ({
    id: 'sub-1',
    title: 'Subtask',
    completed: false,
    order: 0,
    ...override
});

describe('getSubtaskProgress', () => {
    it('returns zeros when task has no subtasks', () => {
        const task = makeTask();
        const progress = getSubtaskProgress(task);
        expect(progress).toEqual({ completed: 0, total: 0, percentage: 0 });
    });

    it('returns zeros when subtasks array is empty', () => {
        const task = makeTask({ subtasks: [] });
        const progress = getSubtaskProgress(task);
        expect(progress).toEqual({ completed: 0, total: 0, percentage: 0 });
    });

    it('calculates progress correctly with mixed subtasks', () => {
        const task = makeTask({
            subtasks: [
                makeSubtask({ id: 's1', completed: true }),
                makeSubtask({ id: 's2', completed: false }),
                makeSubtask({ id: 's3', completed: true }),
                makeSubtask({ id: 's4', completed: false }),
            ]
        });
        const progress = getSubtaskProgress(task);
        expect(progress.completed).toBe(2);
        expect(progress.total).toBe(4);
        expect(progress.percentage).toBe(50);
    });

    it('returns 100% when all subtasks completed', () => {
        const task = makeTask({
            subtasks: [
                makeSubtask({ id: 's1', completed: true }),
                makeSubtask({ id: 's2', completed: true }),
            ]
        });
        expect(getSubtaskProgress(task).percentage).toBe(100);
    });
});

describe('isTaskBlocked', () => {
    it('returns false when task has no blockedBy', () => {
        const task = makeTask();
        expect(isTaskBlocked(task, [])).toBe(false);
    });

    it('returns false when blockedBy is empty', () => {
        const task = makeTask({ blockedBy: [] });
        expect(isTaskBlocked(task, [])).toBe(false);
    });

    it('returns true when a blocker is still open', () => {
        const blocker = makeTask({ id: 'blocker-1', status: Status.NEXT_ACTION });
        const task = makeTask({ blockedBy: ['blocker-1'] });
        expect(isTaskBlocked(task, [blocker, task])).toBe(true);
    });

    it('returns false when all blockers are DONE', () => {
        const blocker = makeTask({ id: 'blocker-1', status: Status.DONE });
        const task = makeTask({ blockedBy: ['blocker-1'] });
        expect(isTaskBlocked(task, [blocker, task])).toBe(false);
    });

    it('returns false when all blockers are ARCHIVED', () => {
        const blocker = makeTask({ id: 'blocker-1', status: Status.ARCHIVED });
        const task = makeTask({ blockedBy: ['blocker-1'] });
        expect(isTaskBlocked(task, [blocker, task])).toBe(false);
    });

    it('returns false when blocking task ID does not exist', () => {
        const task = makeTask({ blockedBy: ['nonexistent'] });
        expect(isTaskBlocked(task, [task])).toBe(false);
    });
});

describe('getBlockingTasks', () => {
    it('returns empty array when no blockers', () => {
        const task = makeTask();
        expect(getBlockingTasks(task, [])).toEqual([]);
    });

    it('returns only incomplete blockers', () => {
        const b1 = makeTask({ id: 'b1', status: Status.NEXT_ACTION });
        const b2 = makeTask({ id: 'b2', status: Status.DONE });
        const task = makeTask({ blockedBy: ['b1', 'b2'] });
        const result = getBlockingTasks(task, [b1, b2, task]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('b1');
    });
});

describe('getBlockedTasks', () => {
    it('returns tasks that reference the given taskId in blockedBy', () => {
        const t1 = makeTask({ id: 't1', blockedBy: ['main'] });
        const t2 = makeTask({ id: 't2', blockedBy: ['main'] });
        const t3 = makeTask({ id: 't3' });
        const result = getBlockedTasks('main', [t1, t2, t3]);
        expect(result).toHaveLength(2);
        expect(result.map(t => t.id)).toEqual(['t1', 't2']);
    });

    it('returns empty array when nothing is blocked', () => {
        const t1 = makeTask({ id: 't1' });
        expect(getBlockedTasks('main', [t1])).toEqual([]);
    });
});

describe('createSubtask', () => {
    // Mock crypto.randomUUID
    it('creates a subtask with correct defaults', () => {
        vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid' });
        const subtask = createSubtask('Do something');
        expect(subtask.title).toBe('Do something');
        expect(subtask.completed).toBe(false);
        expect(subtask.id).toBe('mock-uuid');
        expect(subtask.order).toBe(1);
        vi.unstubAllGlobals();
    });

    it('auto-increments order based on existing subtasks', () => {
        vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid-2' });
        const existing = [
            makeSubtask({ id: 's1', order: 0 }),
            makeSubtask({ id: 's2', order: 3 }),
        ];
        const subtask = createSubtask('New one', existing);
        expect(subtask.order).toBe(4); // max(0,3) + 1
        vi.unstubAllGlobals();
    });
});

describe('toggleSubtask', () => {
    it('toggles a subtask from incomplete to complete', () => {
        const subtasks = [makeSubtask({ id: 's1', completed: false })];
        const result = toggleSubtask(subtasks, 's1');
        expect(result[0].completed).toBe(true);
    });

    it('toggles a subtask from complete to incomplete', () => {
        const subtasks = [makeSubtask({ id: 's1', completed: true })];
        const result = toggleSubtask(subtasks, 's1');
        expect(result[0].completed).toBe(false);
    });

    it('does not affect other subtasks', () => {
        const subtasks = [
            makeSubtask({ id: 's1', completed: false }),
            makeSubtask({ id: 's2', completed: true }),
        ];
        const result = toggleSubtask(subtasks, 's1');
        expect(result[0].completed).toBe(true);
        expect(result[1].completed).toBe(true); // unchanged
    });
});

describe('deleteSubtask', () => {
    it('removes the subtask by ID', () => {
        const subtasks = [
            makeSubtask({ id: 's1' }),
            makeSubtask({ id: 's2' }),
        ];
        const result = deleteSubtask(subtasks, 's1');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('s2');
    });

    it('returns empty array when deleting the only subtask', () => {
        const subtasks = [makeSubtask({ id: 's1' })];
        const result = deleteSubtask(subtasks, 's1');
        expect(result).toEqual([]);
    });
});

describe('reorderSubtasks', () => {
    it('moves a subtask from position 0 to position 2', () => {
        const subtasks = [
            makeSubtask({ id: 'a', order: 0 }),
            makeSubtask({ id: 'b', order: 1 }),
            makeSubtask({ id: 'c', order: 2 }),
        ];
        const result = reorderSubtasks(subtasks, 0, 2);
        expect(result.map(s => s.id)).toEqual(['b', 'c', 'a']);
        // Orders should be renumbered
        expect(result.map(s => s.order)).toEqual([0, 1, 2]);
    });

    it('moves a subtask from position 2 to position 0', () => {
        const subtasks = [
            makeSubtask({ id: 'a', order: 0 }),
            makeSubtask({ id: 'b', order: 1 }),
            makeSubtask({ id: 'c', order: 2 }),
        ];
        const result = reorderSubtasks(subtasks, 2, 0);
        expect(result.map(s => s.id)).toEqual(['c', 'a', 'b']);
        expect(result.map(s => s.order)).toEqual([0, 1, 2]);
    });
});
