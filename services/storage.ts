import { Task, Status, Priority, Recurrence } from '../types';
import { supabase } from '../lib/supabaseClient';
import { mergeTasks } from '../utils/taskLogic';

const DB_NAME = 'LifeFlowDB';
const STORE_NAME = 'tasks';
const DB_VERSION = 1;
const MAX_OLD_BACKUPS = 1; // Keep only 1 historical backup row (plus the current active row) to conserve Supabase storage
const TOMBSTONE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days retention for deleted task tombstones

// Safe LocalStorage helpers for both Browser and Node/Vitest environments
const getStorageItem = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const setStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors
  }
};

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'disabled';

export interface SyncStatusInfo {
  status: SyncStatus;
  lastSyncTime: number | null;
  error: string | null;
}

type SyncListener = (info: SyncStatusInfo) => void;
const syncListeners = new Set<SyncListener>();

let currentSyncInfo: SyncStatusInfo = {
  status: getStorageItem('lifeflow-sync-enabled') === 'true' ? 'idle' : 'disabled',
  lastSyncTime: (() => {
    const saved = getStorageItem('lifeflow-last-sync-time');
    return saved ? Number(saved) : null;
  })(),
  error: null
};

export const getSyncStatus = (): SyncStatusInfo => currentSyncInfo;

export const subscribeSyncStatus = (listener: SyncListener): (() => void) => {
  syncListeners.add(listener);
  listener(currentSyncInfo);
  return () => {
    syncListeners.delete(listener);
  };
};

export const updateSyncStatus = (patch: Partial<SyncStatusInfo>): void => {
  currentSyncInfo = { ...currentSyncInfo, ...patch };
  if (patch.lastSyncTime !== undefined && patch.lastSyncTime !== null) {
    setStorageItem('lifeflow-last-sync-time', String(patch.lastSyncTime));
  }
  syncListeners.forEach(fn => {
    try {
      fn(currentSyncInfo);
    } catch (e) {
      console.error("Sync listener error", e);
    }
  });
};

export const formatSyncErrorMessage = (err: any): string => {
  if (!err) return 'Unknown sync error';
  const text = typeof err === 'string' ? err : err.message || JSON.stringify(err);
  if (text.includes('exceed_db_size_quota') || text.includes('402')) {
    return 'Supabase database storage quota exceeded. Please clean old data in dashboard.';
  }
  if (text.includes('JWT') || text.includes('auth') || text.includes('token') || text.includes('session')) {
    return 'Authentication session expired. Please sign in again.';
  }
  if (text.includes('Failed to fetch') || text.includes('Network') || text.includes('ENOTFOUND')) {
    return 'Network offline. Changes saved locally.';
  }
  if (text.includes('row-level security') || text.includes('policy')) {
    return 'Database permission error (RLS policy check required).';
  }
  return text.length > 80 ? text.slice(0, 80) + '...' : text;
};

const pruneOldTombstones = (tasks: Task[]): Task[] => {
  const now = Date.now();
  return tasks.filter(t => {
    if (t.isDeleted) {
      const deletedAt = t.updatedAt || t.createdAt || 0;
      if (now - deletedAt > TOMBSTONE_RETENTION_MS) {
        return false;
      }
    }
    return true;
  });
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if indexedDB is supported
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
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

export const saveTasksToDB = async (
  tasks: Task[], 
  skipCloudSync: boolean = false, 
  forceWipeCloud: boolean = false
): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // Clear and rewrite
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
    // Sync to Supabase
    if (!skipCloudSync) {
      syncTasksToCloud(tasks, forceWipeCloud);
    }
  }
};

export const syncTasksToCloud = async (
  tasks: Task[], 
  forceWipeCloud: boolean = false,
  isManualSync: boolean = false
): Promise<boolean> => {
  try {
    const isSyncEnabled = getStorageItem('lifeflow-sync-enabled') === 'true';
    if (!isSyncEnabled) {
      updateSyncStatus({ status: 'disabled', error: null });
      return false;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      updateSyncStatus({ status: 'error', error: 'Not signed in. Sign in to enable cloud sync.' });
      return false;
    }

    // Check if we have pulled yet. If not, try pulling first so we never blindly clobber cloud tasks
    const hasPulled = getStorageItem('lifeflow-last-pull-success') === 'true';
    if (!hasPulled && !forceWipeCloud) {
      try {
        const pullRes = await pullTasksFromCloud();
        if (pullRes) {
          setStorageItem('lifeflow-last-pull-success', 'true');
        }
      } catch {
        if (!isManualSync) {
          return false;
        }
      }
    }

    updateSyncStatus({ status: 'syncing', error: null });

    const prefsTagStr = getStorageItem('lifeflow-tags') || '[]';
    const prefsStatusesStr = getStorageItem('lifeflow-status-filters') || '[]';
    const prefsTask: Task = {
        id: 'sys-lifeflow-preferences',
        title: 'System Preferences (Do Not Delete)',
        description: JSON.stringify({ tags: prefsTagStr, statuses: prefsStatusesStr }),
        status: Status.ARCHIVED,
        priority: Priority.LOW,
        recurrence: Recurrence.NONE,
        createdAt: Date.now()
    };

    const { data: existingRows, error: fetchError } = await supabase
      .from('tasks')
      .select('id, updated_at')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      const errMsg = formatSyncErrorMessage(fetchError);
      console.error("[Storage] Failed to check existing rows in cloud:", fetchError);
      updateSyncStatus({ status: 'error', error: errMsg });
      return false;
    }

    let finalTasksToPush = tasks;
    if (!forceWipeCloud && existingRows && existingRows.length > 0) {
      const primaryRow = existingRows[0];
      
      // Fetch the task_data only for the primary row to avoid statement timeouts
      const { data: primaryData, error: primaryErr } = await supabase
        .from('tasks')
        .select('task_data')
        .eq('id', primaryRow.id)
        .single();

      if (primaryData && primaryData.task_data && Array.isArray(primaryData.task_data)) {
        const cloudTasks = primaryData.task_data.filter((t: any) => t.id !== 'sys-lifeflow-preferences');
        finalTasksToPush = mergeTasks(tasks, cloudTasks as Task[]);
      }
    }

    // Prune expired tombstones
    finalTasksToPush = pruneOldTombstones(finalTasksToPush);

    // Ensure we don't duplicate preferences task
    const cleanTasks = finalTasksToPush.filter(t => t.id !== 'sys-lifeflow-preferences');
    const payload = [...cleanTasks, prefsTask];

    const now = new Date();
    if (existingRows && existingRows.length > 0) {
      const [primaryRow, ...olderRows] = existingRows;
      const lastUpdate = primaryRow.updated_at ? new Date(primaryRow.updated_at) : new Date(0);
      
      const isNewDay = now.getUTCFullYear() !== lastUpdate.getUTCFullYear() || 
                       now.getUTCMonth() !== lastUpdate.getUTCMonth() || 
                       now.getUTCDate() !== lastUpdate.getUTCDate();

      // Create a daily rolling backup in the same table
      if (isNewDay) {
        const { error: insErr } = await supabase
          .from('tasks')
          .insert({ user_id: session.user.id, task_data: payload, updated_at: now.toISOString() });
          
        if (insErr) throw insErr;

        // Keep a max of MAX_OLD_BACKUPS old backups
        if (existingRows.length > MAX_OLD_BACKUPS) {
           const rowsToDelete = existingRows.slice(MAX_OLD_BACKUPS);
           const idsToDelete = rowsToDelete.map(r => r.id);
           const { error: delError } = await supabase.from('tasks').delete().in('id', idsToDelete);
           if (delError) {
             console.error("[Storage] Failed to delete old backup rows in Supabase (check RLS DELETE policy):", delError);
           }
        }
      } else {
        // Same day: just update the primary row
        const { error: updErr } = await supabase
          .from('tasks')
          .update({ task_data: payload, updated_at: now.toISOString() })
          .eq('id', primaryRow.id);

        if (updErr) throw updErr;

        // Identify any race-condition rows from the SAME day to clean up
        const isSameDay = (dateStr: string) => {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return d.getUTCFullYear() === now.getUTCFullYear() &&
                 d.getUTCMonth() === now.getUTCMonth() &&
                 d.getUTCDate() === now.getUTCDate();
        };

        const duplicateIds = olderRows.filter(r => isSameDay(r.updated_at)).map(r => r.id);
        const validOlderRows = olderRows.filter(r => !isSameDay(r.updated_at));

        let idsToDelete = [...duplicateIds];

        // Enforce MAX_OLD_BACKUPS limit on the remaining valid history
        if (validOlderRows.length > MAX_OLD_BACKUPS) {
           const exceedanceIds = validOlderRows.slice(MAX_OLD_BACKUPS).map(r => r.id);
           idsToDelete = [...idsToDelete, ...exceedanceIds];
        }

        if (idsToDelete.length > 0) {
           const { error: delError } = await supabase.from('tasks').delete().in('id', idsToDelete);
           if (delError) {
             console.error("[Storage] Failed to delete old backup rows in Supabase (check RLS DELETE policy):", delError);
           }
        }
      }
    } else {
      const { error: initInsErr } = await supabase
        .from('tasks')
        .insert({ user_id: session.user.id, task_data: payload, updated_at: now.toISOString() });
      if (initInsErr) throw initInsErr;
    }

    setStorageItem('lifeflow-last-pull-success', 'true');
    updateSyncStatus({ status: 'synced', lastSyncTime: Date.now(), error: null });
    return true;
  } catch (e: any) {
    const errMsg = formatSyncErrorMessage(e);
    console.error("Cloud sync push failed", e);
    updateSyncStatus({ status: 'error', error: errMsg });
    return false;
  }
};

export const checkCloudUpdates = async (lastSyncTimeStr: string | null): Promise<boolean> => {
  try {
    const isSyncEnabled = getStorageItem('lifeflow-sync-enabled') === 'true';
    if (!isSyncEnabled) return false;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    
    const { data, error } = await supabase
       .from('tasks')
       .select('updated_at')
       .eq('user_id', session.user.id)
       .order('updated_at', { ascending: false })
       .limit(1);
       
    if (error) return false;
    
    if (data && data.length > 0) {
       const cloudTimeStr = data[0].updated_at;
       if (!lastSyncTimeStr) return true;
       return cloudTimeStr !== lastSyncTimeStr; 
    }
  } catch (e) {
    // Ignore background check errors
  }
  return false;
};

export const pullTasksFromCloud = async (): Promise<{tasks: Task[], preferences: any, lastUpdate: string | null} | null> => {
  try {
    const isSyncEnabled = getStorageItem('lifeflow-sync-enabled') === 'true';
    if (!isSyncEnabled) {
      updateSyncStatus({ status: 'disabled', error: null });
      return null;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      updateSyncStatus({ status: 'error', error: 'Not signed in' });
      return null;
    }
    
    const { data, error } = await supabase
       .from('tasks')
       .select('task_data, updated_at')
       .eq('user_id', session.user.id)
       .order('updated_at', { ascending: false })
       .limit(1);
       
    if (error) throw error;
       
    setStorageItem('lifeflow-last-pull-success', 'true');
       
    if (data && data.length > 0) {
       const taskData = data[0].task_data as Task[];
       if (Array.isArray(taskData)) {
           const prefsTask = taskData.find(t => t.id === 'sys-lifeflow-preferences');
           const actualTasks = taskData.filter(t => t.id !== 'sys-lifeflow-preferences');
           
           const lastTime = data[0].updated_at ? new Date(data[0].updated_at).getTime() : Date.now();
           updateSyncStatus({ status: 'synced', lastSyncTime: lastTime, error: null });

           return {
               tasks: actualTasks,
               preferences: prefsTask ? JSON.parse(prefsTask.description) : null,
               lastUpdate: data[0].updated_at
           };
       }
    } else {
       updateSyncStatus({ status: 'synced', lastSyncTime: Date.now(), error: null });
    }
  } catch (e: any) {
    const errMsg = formatSyncErrorMessage(e);
    console.error("Cloud pull failed", e);
    updateSyncStatus({ status: 'error', error: errMsg });
  }
  return null;
};

export const performManualSync = async (tasksOverride?: Task[]): Promise<{ success: boolean; message?: string }> => {
  const isSyncEnabled = getStorageItem('lifeflow-sync-enabled') === 'true';
  if (!isSyncEnabled) {
    updateSyncStatus({ status: 'disabled', error: 'Cloud sync is turned off' });
    return { success: false, message: 'Cloud sync is disabled. Enable it in Settings.' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    updateSyncStatus({ status: 'error', error: 'Not signed in' });
    return { success: false, message: 'You are not signed in. Please sign in to sync.' };
  }

  updateSyncStatus({ status: 'syncing', error: null });

  try {
    const cloudRes = await pullTasksFromCloud();
    const currentLocalTasks = tasksOverride || await loadTasksFromDB();

    let mergedTasks = currentLocalTasks;
    if (cloudRes && cloudRes.tasks && cloudRes.tasks.length > 0) {
      mergedTasks = mergeTasks(currentLocalTasks, cloudRes.tasks);
      await saveTasksToDB(mergedTasks, true); // persist to local IDB without triggering sync loop
    }

    const success = await syncTasksToCloud(mergedTasks, false, true);
    if (!success) {
      return { success: false, message: currentSyncInfo.error || 'Failed to sync with cloud.' };
    }
    return { success: true, message: 'All tasks synced successfully!' };
  } catch (err: any) {
    const msg = formatSyncErrorMessage(err);
    updateSyncStatus({ status: 'error', error: msg });
    return { success: false, message: msg };
  }
};

export const forceCloudSync = async () => {
    const tasks = await loadTasksFromDB();
    await syncTasksToCloud(tasks);
};
