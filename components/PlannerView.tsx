import React, { useMemo, useState } from 'react';
import { Task, Status, Recurrence, Priority } from '../types';
import { doesTaskOccurOnDate, isOpen } from '../utils/taskUtils';
import { GripVertical, Clock, Play, Check, Plus, Calendar } from 'lucide-react';

interface PlannerViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onToggleDone: (taskId: string, onDate?: string) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onStartPomodoro: (taskId: string) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
    tasks, onEditTask, onToggleDone, onUpdateTask, onStartPomodoro
}) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const [draggedId, setDraggedId] = useState<string | null>(null);

    // Get tasks available for today (backlog: unplanned tasks)
    const { planned, backlog } = useMemo(() => {
        const todayTasks: Task[] = [];

        tasks.forEach(task => {
            if (task.status === Status.DONE || task.status === Status.ARCHIVED || task.status === Status.EXPIRED) return;
            if (task.snoozedUntil && new Date(task.snoozedUntil) > today) return;

            // Include tasks due today, overdue, or with no due date
            if (task.recurrence !== Recurrence.NONE) {
                if (doesTaskOccurOnDate(task, today)) {
                    todayTasks.push(task);
                }
            } else {
                if (!task.dueDate) {
                    todayTasks.push(task);
                } else {
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    if (dueDate <= today) {
                        todayTasks.push(task);
                    }
                }
            }
        });

        const p = todayTasks.filter(t => t.planOrder !== undefined && t.planOrder >= 0)
            .sort((a, b) => (a.planOrder || 0) - (b.planOrder || 0));
        const b = todayTasks.filter(t => t.planOrder === undefined || t.planOrder < 0);

        return { planned: p, backlog: b };
    }, [tasks, todayStr]);

    const addToPlan = (taskId: string) => {
        const maxOrder = planned.reduce((max, t) => Math.max(max, t.planOrder || 0), -1);
        onUpdateTask(taskId, { planOrder: maxOrder + 1 });
    };

    const removeFromPlan = (taskId: string) => {
        onUpdateTask(taskId, { planOrder: undefined });
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedId(taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (!draggedId) return;

        const currentIndex = planned.findIndex(t => t.id === draggedId);
        if (currentIndex === -1) {
            // Dragging from backlog to plan
            addToPlan(draggedId);
        } else if (currentIndex !== dropIndex) {
            // Reorder within plan
            const newPlanned = [...planned];
            const [moved] = newPlanned.splice(currentIndex, 1);
            newPlanned.splice(dropIndex, 0, moved);
            newPlanned.forEach((t, i) => onUpdateTask(t.id, { planOrder: i }));
        }
        setDraggedId(null);
    };

    const totalEstimatedMinutes = planned.reduce((sum, t) => sum + (t.estimatedMinutes || 25), 0);

    const priorityColors: Record<string, string> = {
        HIGH: 'border-l-red-500',
        MEDIUM: 'border-l-yellow-500',
        LOW: 'border-l-green-500',
    };

    return (
        <div className="h-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-indigo-500" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daily Planner</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                </div>
                {planned.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock size={14} />
                        ~{Math.floor(totalEstimatedMinutes / 60)}h {totalEstimatedMinutes % 60}m planned
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Daily Plan */}
                <div className="flex flex-col overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        📋 My Plan
                        <span className="text-xs font-normal text-gray-400">({planned.length} tasks)</span>
                    </h3>
                    <div
                        className="flex-1 overflow-y-auto space-y-2 pr-1"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, planned.length)}
                    >
                        {planned.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                                <Calendar size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Drag tasks here to plan your day</p>
                            </div>
                        ) : (
                            planned.map((task, index) => {
                                let timeOffset = 0;
                                for (let i = 0; i < index; i++) timeOffset += planned[i].estimatedMinutes || 25;
                                const startHour = 9 + Math.floor(timeOffset / 60);
                                const startMin = timeOffset % 60;

                                return (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => { e.stopPropagation(); handleDrop(e, index); }}
                                        className={`group flex items-center gap-2 p-3 rounded-lg border-l-4 ${priorityColors[task.priority] || 'border-l-gray-300'}
                      bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                      hover:shadow-md transition-all cursor-grab active:cursor-grabbing
                      ${draggedId === task.id ? 'opacity-50' : ''}`}
                                    >
                                        <GripVertical size={14} className="text-gray-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => onToggleDone(task.id, task.dueDate)}
                                                    className="text-gray-400 hover:text-green-500 transition-colors shrink-0">
                                                    {task.status === Status.DONE ? <Check size={14} className="text-green-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />}
                                                </button>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-500"
                                                    onClick={() => onEditTask(task)}>{task.title}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                <span>{String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')}</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} /> {task.estimatedMinutes || 25}m
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onStartPomodoro(task.id)}
                                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Start Pomodoro">
                                                <Play size={12} />
                                            </button>
                                            <input
                                                type="number"
                                                value={task.estimatedMinutes || 25}
                                                onChange={(e) => onUpdateTask(task.id, { estimatedMinutes: parseInt(e.target.value) || 25 })}
                                                className="w-12 px-1 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600
                          bg-transparent text-gray-700 dark:text-gray-300 text-center"
                                                title="Estimated minutes"
                                                min={5}
                                                step={5}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Backlog */}
                <div className="flex flex-col overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        📥 Available Tasks
                        <span className="text-xs font-normal text-gray-400">({backlog.length})</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {backlog.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">All tasks planned! 🎉</p>
                        ) : (
                            backlog.map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    className={`group flex items-center gap-2 p-2.5 rounded-lg
                    bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700
                    hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all
                    cursor-grab active:cursor-grabbing`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm text-gray-800 dark:text-gray-200 truncate block cursor-pointer hover:text-blue-500"
                                            onClick={() => onEditTask(task)}>{task.title}</span>
                                        {task.dueDate && (
                                            <span className="text-xs text-gray-400 mt-0.5 block">
                                                Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => addToPlan(task.id)}
                                        className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50
                      dark:hover:bg-blue-900/30 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Add to plan"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
