import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Zap } from 'lucide-react';
import { Priority, Tag, Task, Recurrence } from '../types';
import { parseQuickAdd, formatParsedTaskPreview } from '../utils/quickAddParser';

interface QuickAddBarProps {
    onAddTask: (taskData: Partial<Task>) => void;
    availableTags: Tag[];
    isVisible: boolean;
    onClose: () => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
    onAddTask,
    availableTags,
    isVisible,
    onClose
}) => {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isVisible]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isVisible) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const parsed = parseQuickAdd(input, availableTags);
    const preview = input.trim() ? formatParsedTaskPreview(parsed) : '';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Build task data from parsed result
        const taskData: Partial<Task> = {
            title: parsed.title,
            description: '',
            priority: parsed.priority || Priority.MEDIUM,
            dueDate: parsed.dueDate,
            recurrence: parsed.recurrence || Recurrence.NONE,
            recurrenceInterval: parsed.recurrenceInterval,
        };

        // Map tag names/IDs to actual Tag objects
        if (parsed.tags && parsed.tags.length > 0) {
            const matchedTags: Tag[] = [];
            for (const tagId of parsed.tags) {
                const found = availableTags.find(t => t.id === tagId || t.label.toLowerCase() === tagId);
                if (found) matchedTags.push(found);
            }
            if (matchedTags.length > 0) {
                taskData.tags = matchedTags;
            }
        }

        onAddTask(taskData);
        setInput('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-[15vh] z-[100]" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder='Quick add: "Pay rent tomorrow #bills !high"'
                            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    {preview && (
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="text-gray-400 mr-2">Preview:</span>
                                {preview}
                            </p>
                        </div>
                    )}

                    <div className="px-4 py-2 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                        <div className="text-xs text-gray-400 flex flex-wrap gap-1">
                            <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">#tag</span>
                            <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">!high</span>
                            <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">tomorrow</span>
                            <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">daily</span>
                            <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">monthly</span>
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
