import { Task, Status, Priority, Recurrence } from '../types';
import { supabase } from '../lib/supabaseClient';

const DB_NAME = 'LifeFlowDB';
const STORE_NAME = 'tasks';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if indexedDB is supported
    if (!('indexedDB' in window)) {
        reject(new Error("IndexedDB not supported"));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const loadTasksFromDB = async (): Promise<Task[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error loading from DB:", error);
    return [];
  }
};

export const saveTasksToDB = async (tasks: Task[]): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // We clear and rewrite to ensure the DB exactly matches the in-memory state.
      // For personal task managers (thousands of items), this is performant enough.
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
          tasks.forEach(task => store.put(task));
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Error saving to DB:", error);
    throw error;
  } finally {
    // Fire-and-forget sync to Supabase
    syncTasksToCloud(tasks);
  }
};

const syncTasksToCloud = async (tasks: Task[]) => {
  try {
    const isSyncEnabled = localStorage.getItem('lifeflow-sync-enabled') === 'true';
    if (!isSyncEnabled) return;

    // Prevent blind overrides on new devices: MUST have pulled from cloud at least once
    // physically in this browser before we ever allow pushing up local data.
    const hasPulled = localStorage.getItem('lifeflow-last-pull-success') === 'true';
    if (!hasPulled) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const prefsTagStr = localStorage.getItem('lifeflow-tags') || '[]';
    const prefsStatusesStr = localStorage.getItem('lifeflow-status-filters') || '[]';
    const prefsTask: Task = {
        id: 'sys-lifeflow-preferences',
        title: 'System Preferences (Do Not Delete)',
        description: JSON.stringify({ tags: prefsTagStr, statuses: prefsStatusesStr }),
        status: Status.ARCHIVED,
        priority: Priority.LOW,
        recurrence: Recurrence.NONE,
        createdAt: Date.now()
    };
    
    // Ensure we don't duplicate it
    const cleanTasks = tasks.filter(t => t.id !== 'sys-lifeflow-preferences');
    const payload = [...cleanTasks, prefsTask];

    const { data: existingRows } = await supabase
      .from('tasks')
      .select('id, updated_at')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });

    if (existingRows && existingRows.length > 0) {
      const [primaryRow, ...olderRows] = existingRows;
      const now = new Date();
      const lastUpdate = primaryRow.updated_at ? new Date(primaryRow.updated_at) : new Date(0);
      
      const isNewDay = now.getUTCFullYear() !== lastUpdate.getUTCFullYear() || 
                       now.getUTCMonth() !== lastUpdate.getUTCMonth() || 
                       now.getUTCDate() !== lastUpdate.getUTCDate();

      // Create a daily rolling backup in the same table
      if (isNewDay) {
        await supabase
          .from('tasks')
          .insert({ user_id: session.user.id, task_data: payload, updated_at: now.toISOString() });
          
        // Keep a max of 7 backups (the newly inserted one replaces the oldest if we exceed 7)
        if (existingRows.length > 6) {
           const rowsToDelete = existingRows.slice(6);
           const idsToDelete = rowsToDelete.map(r => r.id);
           await supabase.from('tasks').delete().in('id', idsToDelete);
        }
      } else {
        // Same day: just update the primary row
        await supabase
          .from('tasks')
          .update({ task_data: payload, updated_at: now.toISOString() })
          .eq('id', primaryRow.id);

        // Clean up any race-condition rows or exceedances to keep history tidy
        if (olderRows.length > 6) {
           const rowsToDelete = olderRows.slice(6);
           const idsToDelete = rowsToDelete.map(r => r.id);
           await supabase.from('tasks').delete().in('id', idsToDelete);
        }
      }
    } else {
      await supabase
        .from('tasks')
        .insert({ user_id: session.user.id, task_data: payload, updated_at: new Date().toISOString() });
    }
  } catch (e) {
    console.error("Cloud sync push failed", e);
  }
};

export const pullTasksFromCloud = async (): Promise<{tasks: Task[], preferences: any} | null> => {
  try {
    const isSyncEnabled = localStorage.getItem('lifeflow-sync-enabled') === 'true';
    if (!isSyncEnabled) return null;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    const { data, error } = await supabase
       .from('tasks')
       .select('task_data')
       .eq('user_id', session.user.id)
       .order('updated_at', { ascending: false })
       .limit(1);
       
    if (error) throw error;
       
    // Mark that we have successfully communicated with the cloud to prevent blind overwrites
    localStorage.setItem('lifeflow-last-pull-success', 'true');
       
    if (data && data.length > 0) {
       const taskData = data[0].task_data as Task[];
       if (Array.isArray(taskData)) {
           const prefsTask = taskData.find(t => t.id === 'sys-lifeflow-preferences');
           const actualTasks = taskData.filter(t => t.id !== 'sys-lifeflow-preferences');
           
           return {
               tasks: actualTasks,
               preferences: prefsTask ? JSON.parse(prefsTask.description) : null
           };
       }
    }
  } catch (e) {
    console.error("Cloud pull failed", e);
  }
  return null;
};

export const forceCloudSync = async () => {
    const tasks = await loadTasksFromDB();
    await syncTasksToCloud(tasks);
};
