import React from 'react';
import { Undo2, X } from 'lucide-react';

interface UndoToastProps {
    message: string;
    onUndo: () => void;
    onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ message, onUndo, onDismiss }) => {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
            <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
        px-4 py-3 rounded-xl shadow-2xl border border-gray-700 dark:border-gray-300 min-w-[280px]">
                <span className="text-sm font-medium flex-1 truncate">{message}</span>
                <button
                    onClick={onUndo}
                    className="flex items-center gap-1.5 text-blue-400 dark:text-blue-600 hover:text-blue-300
            dark:hover:text-blue-500 text-sm font-semibold transition-colors shrink-0"
                >
                    <Undo2 size={14} />
                    Undo
                </button>
                <button
                    onClick={onDismiss}
                    className="text-gray-400 hover:text-gray-200 dark:text-gray-500
            dark:hover:text-gray-700 transition-colors shrink-0"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};
