import React, { useMemo } from 'react';
import { Task, Status, Priority, Recurrence } from '../types';
import { isOpen } from '../utils/taskUtils';
import { Crosshair, Check, AlertTriangle, Coffee, Trash2 } from 'lucide-react';

interface EisenhowerViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onToggleDone: (taskId: string, onDate?: string) => void;
    onDeleteTask: (taskId: string) => void;
}

interface Quadrant {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    tasks: Task[];
    bgClass: string;
    borderClass: string;
    iconBg: string;
}

export const EisenhowerView: React.FC<EisenhowerViewProps> = ({
    tasks, onEditTask, onToggleDone, onDeleteTask
}) => {
    const quadrants = useMemo<Quadrant[]>(() => {
        const now = new Date();
        const twoDaysFromNow = new Date(now);
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

        const activeTasks = tasks.filter(t =>
            t.status !== Status.DONE && t.status !== Status.ARCHIVED && t.status !== Status.EXPIRED &&
            t.recurrence === Recurrence.NONE
        );

        const isUrgent = (task: Task): boolean => {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            return due <= twoDaysFromNow;
        };

        const isImportant = (task: Task): boolean => {
            return task.priority === Priority.HIGH || task.priority === Priority.MEDIUM;
        };

        const q1: Task[] = []; // Urgent + Important → DO
        const q2: Task[] = []; // Not Urgent + Important → SCHEDULE
        const q3: Task[] = []; // Urgent + Not Important → DELEGATE
        const q4: Task[] = []; // Not Urgent + Not Important → ELIMINATE

        activeTasks.forEach(task => {
            const urgent = isUrgent(task);
            const important = isImportant(task);

            if (urgent && important) q1.push(task);
            else if (!urgent && important) q2.push(task);
            else if (urgent && !important) q3.push(task);
            else q4.push(task);
        });

        return [
            {
                title: 'Do First', subtitle: 'Urgent & Important',
                icon: <AlertTriangle size={16} />, tasks: q1,
                bgClass: 'bg-red-50 dark:bg-red-900/10', borderClass: 'border-red-200 dark:border-red-800',
                iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
            },
            {
                title: 'Schedule', subtitle: 'Important, Not Urgent',
                icon: <Crosshair size={16} />, tasks: q2,
                bgClass: 'bg-blue-50 dark:bg-blue-900/10', borderClass: 'border-blue-200 dark:border-blue-800',
                iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            },
            {
                title: 'Delegate', subtitle: 'Urgent, Not Important',
                icon: <Coffee size={16} />, tasks: q3,
                bgClass: 'bg-yellow-50 dark:bg-yellow-900/10', borderClass: 'border-yellow-200 dark:border-yellow-800',
                iconBg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
            },
            {
                title: 'Eliminate', subtitle: 'Not Urgent, Not Important',
                icon: <Trash2 size={16} />, tasks: q4,
                bgClass: 'bg-gray-50 dark:bg-gray-800/50', borderClass: 'border-gray-200 dark:border-gray-700',
                iconBg: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            },
        ];
    }, [tasks]);

    const priorityDot: Record<string, string> = {
        HIGH: 'bg-red-500',
        MEDIUM: 'bg-yellow-500',
        LOW: 'bg-green-500',
    };

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <Crosshair size={20} className="text-indigo-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Eisenhower Matrix</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">Prioritize by urgency & importance</span>
            </div>

            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 overflow-hidden">
                {quadrants.map((q, idx) => (
                    <div key={idx} className={`${q.bgClass} ${q.borderClass} border rounded-xl p-4 flex flex-col overflow-hidden`}>
                        {/* Quadrant header */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`p-1.5 rounded-lg ${q.iconBg}`}>{q.icon}</div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{q.title}</h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{q.subtitle}</p>
                            </div>
                            <span className="ml-auto text-xs font-medium text-gray-400">{q.tasks.length}</span>
                        </div>

                        {/* Task list */}
                        <div className="flex-1 overflow-y-auto space-y-1.5">
                            {q.tasks.length === 0 ? (
                                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4 italic">No tasks</p>
                            ) : (
                                q.tasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="group flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800
                      border border-transparent hover:border-gray-200 dark:hover:border-gray-600
                      hover:shadow-sm transition-all cursor-pointer"
                                        onClick={() => onEditTask(task)}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleDone(task.id); }}
                                            className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600
                        hover:border-green-500 dark:hover:border-green-400 transition-colors"
                                        />
                                        <div className={`w-1.5 h-1.5 rounded-full ${priorityDot[task.priority] || 'bg-gray-400'} shrink-0`} />
                                        <span className="text-xs text-gray-800 dark:text-gray-200 truncate flex-1">{task.title}</span>
                                        {task.dueDate && (
                                            <span className={`text-[10px] shrink-0 ${new Date(task.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'
                                                }`}>
                                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
