import React from 'react';
import { Task, Status } from '../types';
import { X, Calendar, ArrowUp, ArrowDown, Minus, Tag } from 'lucide-react';
import { TaskCard } from './TaskCard';

interface DrillDownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onToggleDone: (taskId: string) => void; // Kept for prop compatibility but unused in UI if requested
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
    isOpen,
    onClose,
    title,
    tasks,
    onEditTask
}) => {
    if (!isOpen) return null;

    const getStatusBadge = (task: Task) => {
        if (task.status === Status.DONE) {
            return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Completed</span>;
        }
        if (task.status === Status.EXPIRED) {
            return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Missed / Overdue</span>;
        }
        if (task.status === Status.IN_PROGRESS) {
            return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">In Progress</span>;
        }
        // TODO / Default
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Planned</span>;
    };

    const getTagColorHex = (tagColorClass: string) => {
        // Simple mapping or helper if available. Reusing the logic from AnalyticsView conceptually or passing it down?
        // Tags object: { label: string, color: string } where color is hex.
        // Wait, Task 'tags' array has { id, label, color }. Color is typically hex or class?
        // In types.ts/Tag interface?
        // Let's assume hex based on previous usage in AnalyticsView.
        return tagColorClass;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        {title}
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                            {tasks.length}
                        </span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                    {tasks.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                            No tasks found in this category.
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors p-0" onClick={() => onEditTask(task)}>
                                {/* Reusing a simplified view or existing TaskCard? 
                                    TaskCard is designed for Drag & Drop and specific layouts. 
                                    Let's build a simple row view here for clarity and speed. 
                                */}
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">

                                    {/* Status Badge (replacing checkbox) */}
                                    <div className="flex-shrink-0">
                                        {getStatusBadge(task)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm font-medium truncate ${task.status === Status.DONE ? 'text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {/* Priority */}
                                            {task.priority === 'HIGH' && <span className="flex items-center gap-1 text-xs text-red-500"><ArrowUp size={12} /> High</span>}
                                            {task.priority === 'MEDIUM' && <span className="flex items-center gap-1 text-xs text-yellow-500"><Minus size={12} /> Med</span>}
                                            {task.priority === 'LOW' && <span className="flex items-center gap-1 text-xs text-blue-500"><ArrowDown size={12} /> Low</span>}

                                            {/* Date */}
                                            {task.dueDate && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            )}

                                            {/* Categories */}
                                            {task.tags && task.tags.length > 0 && (
                                                <div className="flex items-center gap-1.5 ml-auto">
                                                    {task.tags.map(tag => (
                                                        <span key={tag.id} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }}></div>
                                                            {tag.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
