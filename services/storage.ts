import { Task } from '../types';
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: existingRows } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', session.user.id)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      await supabase
        .from('tasks')
        .update({ task_data: tasks, updated_at: new Date().toISOString() })
        .eq('id', existingRows[0].id);
    } else {
      await supabase
        .from('tasks')
        .insert({ user_id: session.user.id, task_data: tasks });
    }
  } catch (e) {
    console.error("Cloud sync push failed", e);
  }
};

export const pullTasksFromCloud = async (): Promise<Task[] | null> => {
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
       
    if (data && data.length > 0) {
       return data[0].task_data as Task[];
    }
  } catch (e) {
    console.error("Cloud pull failed", e);
  }
  return null;
};
