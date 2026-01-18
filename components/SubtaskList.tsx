import React, { useState } from 'react';
import { Subtask } from '../types';
import { Plus, Check, Circle, Trash2, GripVertical } from 'lucide-react';
import { createSubtask, toggleSubtask, deleteSubtask } from '../utils/subtaskUtils';

interface SubtaskListProps {
    subtasks: Subtask[];
    onChange: (subtasks: Subtask[]) => void;
    readOnly?: boolean;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
    subtasks = [],
    onChange,
    readOnly = false
}) => {
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const handleAddSubtask = () => {
        if (!newSubtaskTitle.trim()) return;
        const newSubtask = createSubtask(newSubtaskTitle.trim(), subtasks);
        onChange([...subtasks, newSubtask]);
        setNewSubtaskTitle('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSubtask();
        }
    };

    const handleToggle = (id: string) => {
        onChange(toggleSubtask(subtasks, id));
    };

    const handleDelete = (id: string) => {
        onChange(deleteSubtask(subtasks, id));
    };

    const completedCount = subtasks.filter(s => s.completed).length;
    const totalCount = subtasks.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="space-y-3">
            {/* Header with progress */}
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subtasks
                </label>
                {totalCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {completedCount}/{totalCount} ({progress}%)
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Subtask list */}
            <div className="space-y-1.5">
                {subtasks
                    .sort((a, b) => a.order - b.order)
                    .map((subtask) => (
                        <div
                            key={subtask.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${subtask.completed
                                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {!readOnly && (
                                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab" />
                            )}

                            <button
                                onClick={() => handleToggle(subtask.id)}
                                disabled={readOnly}
                                className="flex-shrink-0"
                            >
                                {subtask.completed ? (
                                    <Check className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                                )}
                            </button>

                            <span className={`flex-1 text-sm ${subtask.completed
                                    ? 'text-gray-400 dark:text-gray-500 line-through'
                                    : 'text-gray-700 dark:text-gray-200'
                                }`}>
                                {subtask.title}
                            </span>

                            {!readOnly && (
                                <button
                                    onClick={() => handleDelete(subtask.id)}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
            </div>

            {/* Add new subtask */}
            {!readOnly && (
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a subtask..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskTitle.trim()}
                        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};
