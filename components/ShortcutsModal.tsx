import React from 'react';
import { X } from 'lucide-react';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortcuts = [
    { key: 'N', description: 'Create new task' },
    { key: 'T', description: 'Go to Today view' },
    { key: 'W', description: 'Go to Week view' },
    { key: 'M', description: 'Go to Month view' },
    { key: 'B', description: 'Go to Board view' },
    { key: 'A', description: 'Go to Analytics view' },
    { key: 'D', description: 'Toggle dark mode' },
    { key: '?', description: 'Show this help' },
    { key: 'Ctrl+K', description: 'Open command palette' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-3">
                        {shortcuts.map((shortcut) => (
                            <div
                                key={shortcut.key}
                                className="flex items-center justify-between"
                            >
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {shortcut.description}
                                </span>
                                <kbd className="px-2.5 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                    {shortcut.key}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> to close
                    </p>
                </div>
            </div>
        </div>
    );
};
