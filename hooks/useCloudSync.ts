import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { 
  getSyncStatus, 
  subscribeSyncStatus, 
  updateSyncStatus, 
  performManualSync,
  SyncStatus
} from '../services/storage';

export const useCloudSync = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [syncInfo, setSyncInfo] = useState(getSyncStatus());
  
  // Read initial opt-in state from localStorage
  const [isSyncEnabled, setIsSyncEnabled] = useState(() => {
    try {
      return localStorage.getItem('lifeflow-sync-enabled') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    return subscribeSyncStatus((info) => {
      setSyncInfo(info);
    });
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && isSyncEnabled) {
        updateSyncStatus({ status: 'idle', error: null });
      } else if (!session && isSyncEnabled) {
        updateSyncStatus({ status: 'error', error: 'Not signed in' });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN') {
        updateSyncStatus({ status: 'idle', error: null });
      } else if (event === 'SIGNED_OUT') {
        updateSyncStatus({ status: 'disabled', error: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [isSyncEnabled]);

  // Update localStorage when sync state changes
  const toggleSync = (enabled: boolean) => {
    setIsSyncEnabled(enabled);
    try {
      localStorage.setItem('lifeflow-sync-enabled', String(enabled));
    } catch {}
    updateSyncStatus({ status: enabled ? 'idle' : 'disabled', error: null });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toggleSync(false);
  };

  const syncNow = async (tasksOverride?: any) => {
    return await performManualSync(tasksOverride);
  };

  return {
    session,
    isSyncEnabled,
    toggleSync,
    signOut,
    syncStatus: syncInfo.status,
    lastSyncTime: syncInfo.lastSyncTime,
    syncError: syncInfo.error,
    syncNow
  };
};
