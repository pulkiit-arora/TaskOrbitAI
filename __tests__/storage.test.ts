import { describe, it, expect, vi } from 'vitest';
import { 
  loadTasksFromDB, 
  saveTasksToDB,
  getSyncStatus,
  updateSyncStatus,
  subscribeSyncStatus,
  formatSyncErrorMessage
} from '../services/storage';
import { Task, Status, Priority, Recurrence } from '../types';
import 'fake-indexeddb/auto'; // Polyfills IndexedDB

describe('storage service', () => {
    const mockTask: Task = {
        id: '1',
        title: 'Test Task',
        description: 'Desc',
        status: Status.NEXT_ACTION,
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
        await saveTasksToDB([]);
        const tasks = await loadTasksFromDB();
        expect(tasks).toEqual([]);
    });

    describe('sync status management', () => {
        it('should get and update sync status', () => {
            updateSyncStatus({ status: 'syncing', error: null });
            expect(getSyncStatus().status).toBe('syncing');

            const now = Date.now();
            updateSyncStatus({ status: 'synced', lastSyncTime: now, error: null });
            expect(getSyncStatus().status).toBe('synced');
            expect(getSyncStatus().lastSyncTime).toBe(now);
        });

        it('should notify subscribers when sync status changes', () => {
            const listener = vi.fn();
            const unsubscribe = subscribeSyncStatus(listener);

            expect(listener).toHaveBeenCalled(); // Initial call
            const callsBefore = listener.mock.calls.length;

            updateSyncStatus({ status: 'error', error: 'Test Error' });
            expect(listener.mock.calls.length).toBe(callsBefore + 1);
            expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
                status: 'error',
                error: 'Test Error'
            }));

            unsubscribe();
            updateSyncStatus({ status: 'idle', error: null });
            expect(listener.mock.calls.length).toBe(callsBefore + 1); // Not called after unsubscribe
        });

        it('should format sync error messages nicely', () => {
            expect(formatSyncErrorMessage('402 exceed_db_size_quota')).toContain('quota exceeded');
            expect(formatSyncErrorMessage(new Error('JWT expired'))).toContain('session expired');
            expect(formatSyncErrorMessage('Failed to fetch')).toContain('offline');
            expect(formatSyncErrorMessage('row-level security policy violation')).toContain('permission');
            expect(formatSyncErrorMessage('Custom short error')).toBe('Custom short error');
        });
    });
});
