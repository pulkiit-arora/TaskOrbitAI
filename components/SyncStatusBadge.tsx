import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { SyncStatus } from '../services/storage';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  lastSyncTime: number | null;
  error: string | null;
  onSyncNow: () => Promise<{ success: boolean; message?: string }>;
  onOpenAuth: () => void;
  className?: string;
}

const formatRelativeTime = (timestamp: number | null): string => {
  if (!timestamp) return 'just now';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 15) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  lastSyncTime,
  error,
  onSyncNow,
  onOpenAuth,
  className = ''
}) => {
  const [, setTick] = useState(0);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Re-render relative time every 15s
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const handleClick = async () => {
    if (status === 'disabled') {
      onOpenAuth();
      return;
    }

    if (status === 'syncing' || isManualSyncing) return;

    try {
      setIsManualSyncing(true);
      await onSyncNow();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isSyncing = status === 'syncing' || isManualSyncing;

  let badgeClasses = 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-800 dark:hover:bg-gray-700/80 border-gray-200 dark:border-gray-700';
  let label = 'Sync Off';
  let title = 'Cloud sync is turned off. Click to configure.';
  let Icon = CloudOff;
  let iconClasses = 'text-gray-400 dark:text-gray-500';

  if (isSyncing) {
    badgeClasses = 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 shadow-sm';
    label = 'Syncing...';
    title = 'Syncing tasks with cloud...';
    Icon = RefreshCw;
    iconClasses = 'text-blue-500 animate-spin';
  } else if (status === 'error') {
    badgeClasses = 'text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border-rose-200 dark:border-rose-800/60 shadow-sm';
    label = 'Sync Error';
    title = `${error || 'Failed to sync with cloud'}. Click to retry.`;
    Icon = AlertCircle;
    iconClasses = 'text-rose-500 animate-pulse';
  } else if (status === 'synced' || status === 'idle') {
    badgeClasses = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/50 shadow-sm';
    label = lastSyncTime ? `Synced ${formatRelativeTime(lastSyncTime)}` : 'Synced';
    title = `${lastSyncTime ? `Last synced ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Tasks synced with cloud'}. Click to sync now.`;
    Icon = Check;
    iconClasses = 'text-emerald-600 dark:text-emerald-400';
  }

  return (
    <button
      onClick={handleClick}
      disabled={isSyncing}
      title={title}
      className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 select-none ${badgeClasses} ${className}`}
    >
      <Icon size={13} className={`flex-shrink-0 ${iconClasses}`} />
      <span className="hidden sm:inline font-medium">{label}</span>
    </button>
  );
};
