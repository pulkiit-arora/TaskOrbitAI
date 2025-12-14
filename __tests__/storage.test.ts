
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTasksFromDB, saveTasksToDB } from '../services/storage';
import { Task, Status, Priority, Recurrence } from '../types';
import 'fake-indexeddb/auto'; // Polyfills IndexedDB

describe('storage service', () => {
    // Clearing IDB between tests is tricky with simple imports, 
    // but fake-indexeddb generally resets or we can just use new IDs?
    // Actually, let's try to trust the clear() in saveTasksToDB or explicit check.

    const mockTask: Task = {
        id: '1',
        title: 'Test Task',
        description: 'Desc',
        status: Status.TODO,
        priority: Priority.MEDIUM,
        recurrence: Recurrence.NONE,
        createdAt: 1000
    };

    it('should save and load tasks (Integrated)', async () => {
        await saveTasksToDB([mockTask]);
        const tasks = await loadTasksFromDB();
        expect(tasks).toHaveLength(1);
        expect(tasks[0].title).toBe('Test Task');
    });

    it('should return empty array if no tasks found', async () => {
        // If we can't easily clear the DB, this test might be flaky if run after the previous one.
        // Ideally we'd have a clearDB helper, but saveTasksToDB([]) clears it!
        await saveTasksToDB([]);
        const tasks = await loadTasksFromDB();
        expect(tasks).toEqual([]);
    });
});
