import React, { useEffect } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

interface SyncToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

export const SyncToast: React.FC<SyncToastProps> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-slide-up">
      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-sm font-medium ${
        isSuccess 
          ? 'bg-emerald-900 text-emerald-50 border-emerald-700 dark:bg-emerald-950 dark:border-emerald-600'
          : 'bg-rose-900 text-rose-50 border-rose-700 dark:bg-rose-950 dark:border-rose-600'
      }`}>
        {isSuccess ? <Check size={16} className="text-emerald-300 shrink-0" /> : <AlertCircle size={16} className="text-rose-300 shrink-0" />}
        <span className="max-w-[320px] truncate">{message}</span>
        <button onClick={onDismiss} className="text-white/60 hover:text-white transition-colors ml-1">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
