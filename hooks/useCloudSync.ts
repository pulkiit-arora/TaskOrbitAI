import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

export const useCloudSync = () => {
  const [session, setSession] = useState<Session | null>(null);
  
  // Read initial opt-in state from localStorage
  const [isSyncEnabled, setIsSyncEnabled] = useState(() => {
    try {
      return localStorage.getItem('lifeflow-sync-enabled') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update localStorage when sync state changes
  const toggleSync = (enabled: boolean) => {
    setIsSyncEnabled(enabled);
    localStorage.setItem('lifeflow-sync-enabled', String(enabled));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toggleSync(false);
  };

  return {
    session,
    isSyncEnabled,
    toggleSync,
    signOut
  };
};
