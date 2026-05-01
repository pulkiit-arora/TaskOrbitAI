import React, { useState } from 'react';
import { Task, Status, Priority, Tag, Recurrence } from '../types';
import { TaskCard } from './TaskCard';
import { Calendar, ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { doesTaskOccurOnDate, isOpen } from '../utils/taskUtils';
import { StatusFilter } from './StatusFilter';

interface TodayViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onMoveTask: (taskId: string, direction: 'prev' | 'next') => void;
    onArchiveTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onToggleDone: (taskId: string, onDate?: string) => void;
    onDropTask?: (taskId: string, date: Date) => void;
    onAddTask: () => void;
    onSnoozeTask?: (taskId: string, until: string) => void;
    onTogglePin?: (taskId: string) => void;
    onStartPomodoro?: (taskId: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
    tasks,
    onEditTask,
    onMoveTask,
    onArchiveTask,
    onDeleteTask,
    onToggleDone,
    onDropTask,
    onAddTask,
    onSnoozeTask,
    onTogglePin,
    onStartPomodoro
}) => {
    const [showCompleted, setShowCompleted] = useState(false);

    // Date calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter Logic
    const overdueTasks: Task[] = (() => {
        const result: Task[] = [];
        const MAX_LOOKBACK_DAYS = 365; // Cap lookback to avoid perf issues
        const lookbackStart = new Date(today);
        lookbackStart.setDate(lookbackStart.getDate() - MAX_LOOKBACK_DAYS);

        tasks.forEach(task => {
            if (task.status === Status.ARCHIVED || task.status === Status.EXPIRED) return;

            // Case 1: Non-recurring tasks
            if (task.recurrence === Recurrence.NONE) {
                if (task.dueDate && isOpen(task) && new Date(task.dueDate) < today) {
                    result.push(task);
                }
                return;
            }

            // Case 2: Recurring tasks
            const scanStart = new Date(Math.max(lookbackStart.getTime(),
                task.recurrenceStart ? new Date(task.recurrenceStart).setHours(0, 0, 0, 0) :
                    task.dueDate ? new Date(task.dueDate).setHours(0, 0, 0, 0) :
                        task.createdAt));
            scanStart.setHours(0, 0, 0, 0);

            for (let d = new Date(scanStart); d < today; d.setDate(d.getDate() + 1)) {
                if (doesTaskOccurOnDate(task, d)) {
                    const dateTime = new Date(d).setHours(0, 0, 0, 0);
                    const hasHistoryRecord = tasks.some(t =>
                        (t.status === Status.DONE || t.status === Status.EXPIRED) &&
                        t.title === task.title &&
                        t.dueDate &&
                        new Date(t.dueDate).setHours(0, 0, 0, 0) === dateTime
                    );
                    if (!hasHistoryRecord) {
                        result.push({
                            ...task,
                            id: `${task.id}-virtual-${d.getTime()}`,
                            dueDate: new Date(d).toISOString(),
                            status: Status.NEXT_ACTION
                        });
                    }
                }
            }
        });

        return result.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    })();

    // Get Today's Tasks (including recurring projections)
    const getTasksForToday = () => {
        const dayTasks: { task: Task; isVirtual: boolean }[] = [];

        tasks.forEach(task => {
            if (task.status === Status.ARCHIVED) return;
            if (task.status === Status.EXPIRED) return;
            // Filter snoozed tasks
            if (task.snoozedUntil && new Date(task.snoozedUntil) > today) return;

            if (doesTaskOccurOnDate(task, today)) {
                let isRealInstance = false;

                // Check if it's the real instance due today
                if (task.dueDate) {
                    const due = new Date(task.dueDate);
                    due.setHours(0, 0, 0, 0);
                    isRealInstance = due.getTime() === today.getTime();
                }

                // If it's a history record (completed today), verify it
                // ... (Similar logic to WeekView to avoid duplicates)
                if (!isRealInstance) {
                    const hasHistory = tasks.some(tt => {
                        if (!tt.dueDate) return false;
                        const dd = new Date(tt.dueDate); dd.setHours(0, 0, 0, 0);
                        return dd.getTime() === today.getTime() && tt.title === task.title && tt.recurrence === Recurrence.NONE && tt.id !== task.id;
                    });
                    if (hasHistory) return;
                }

                let displayStatus = task.status;
                if (!isRealInstance && task.recurrence !== Recurrence.NONE) {
                    displayStatus = Status.NEXT_ACTION; // Virtual projection is always TODO
                }

                // Create display task
                const displayTask = isRealInstance ? task : {
                    ...task,
                    id: `${task.id}-virtual-${today.getTime()}`,
                    dueDate: today.toISOString(),
                    status: displayStatus
                };

                dayTasks.push({
                    task: displayTask,
                    isVirtual: !isRealInstance
                });
            }
        });

        return dayTasks;
    };

    const allTodayTasks = getTasksForToday();
    const openTodayTasks = allTodayTasks.filter(item => item.task.status !== Status.DONE);
    const completedTodayTasks = allTodayTasks.filter(item => item.task.status === Status.DONE);

    // Sorting: Pinned first -> Priority -> Created
    const sortFn = (a: { task: Task }, b: { task: Task }) => {
        // Pinned tasks always come first
        if (a.task.pinned && !b.task.pinned) return -1;
        if (!a.task.pinned && b.task.pinned) return 1;
        const pw: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const pDiff = pw[b.task.priority] - pw[a.task.priority];
        if (pDiff !== 0) return pDiff;
        return b.task.createdAt - a.task.createdAt; // Newer first
    };

    openTodayTasks.sort(sortFn);
    completedTodayTasks.sort(sortFn);

    const unscheduledTasks = tasks.filter(task => 
        !task.dueDate && 
        task.recurrence === Recurrence.NONE && 
        task.status !== Status.DONE && 
        task.status !== Status.ARCHIVED && 
        task.status !== Status.EXPIRED
    );
    unscheduledTasks.sort((a, b) => sortFn({task: a}, {task: b}));

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        // For Today View, dropping anywhere usually means "Move to Today" (if from elsewhere) 
        // or just reorder (if we had manual order). 
        // Since we sort by priority, dropping doesn't reorder arbitrarily unless we change priority.
        // For now, let's just ensure it sets the date to Today.
        if (taskId && onDropTask) {
            onDropTask(taskId, today);
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 max-w-4xl mx-auto" onDragOver={handleDragOver} onDrop={handleDrop}>
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
                    Today
                    <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                        {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                </h2>

                {/* Performance Metrics Dashboard */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                    <div className="glass p-5 rounded-2xl border border-white/40 dark:border-gray-700/50 shadow-glass flex flex-col hover:-translate-y-1 transition-transform duration-300">
                        <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Tasks Completed</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">{completedTodayTasks.length}</span>
                            <span className="text-sm font-medium text-gray-500">/ {allTodayTasks.length}</span>
                        </div>
                    </div>
                    <div className="glass p-5 rounded-2xl border border-white/40 dark:border-gray-700/50 shadow-glass flex flex-col hover:-translate-y-1 transition-transform duration-300">
                        <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Completion Rate</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={`text-3xl font-heading font-bold ${allTodayTasks.length > 0 && (completedTodayTasks.length / allTodayTasks.length) >= 0.8 ? 'text-green-500' : 'text-primary-500'}`}>
                                {allTodayTasks.length > 0 ? Math.round((completedTodayTasks.length / allTodayTasks.length) * 100) : 0}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 h-2 rounded-full mt-3 overflow-hidden shadow-inner">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${allTodayTasks.length > 0 && (completedTodayTasks.length / allTodayTasks.length) >= 0.8 ? 'bg-green-500' : 'bg-primary-500 shadow-glow'}`}
                                style={{ width: `${allTodayTasks.length > 0 ? (completedTodayTasks.length / allTodayTasks.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="glass p-5 rounded-2xl border border-white/40 dark:border-gray-700/50 shadow-glass flex flex-col hover:-translate-y-1 transition-transform duration-300">
                        <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Pending</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">{openTodayTasks.length}</span>
                            <span className="text-sm font-medium text-gray-500">remaining</span>
                        </div>
                    </div>
                    <div className="glass p-5 rounded-2xl border border-white/40 dark:border-gray-700/50 shadow-glass flex flex-col hover:-translate-y-1 transition-transform duration-300">
                        <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Overdue</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={`text-3xl font-heading font-bold ${overdueTasks.length > 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>{overdueTasks.length}</span>
                            {overdueTasks.length === 0 && <span className="text-sm text-green-500 font-bold">On Track</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Overdue Section */}
                {overdueTasks.length > 0 && (
                    <section>
                        <h3 className="text-red-600 dark:text-red-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Circle size={10} fill="currentColor" />
                            Overdue ({overdueTasks.length})
                        </h3>
                        <div className="space-y-2">
                            {overdueTasks.map(task => {
                                const isVirtual = task.id.includes('-virtual-');
                                const baseId = isVirtual ? task.id.split('-virtual-')[0] : task.id;
                                return (
                                <div key={task.id} className="animate-slide-up bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden hover:shadow-soft transition-all duration-300">
                                    <div className="border-l-4 border-l-red-500">
                                        <TaskCard
                                            task={task}
                                            onEdit={onEditTask}
                                            onMove={onMoveTask}
                                            onArchive={onArchiveTask}
                                            onDelete={onDeleteTask}
                                            hideMoveButtons={true}
                                            compact={false} // Use full rows
                                            isVirtual={isVirtual}
                                            onToggleDone={() => onToggleDone(baseId, task.dueDate)}
                                        />
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Today Section */}
                <section>
                    {overdueTasks.length === 0 && (
                        <h3 className="text-primary-600 dark:text-primary-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Circle size={10} fill="currentColor" />
                            Today's Tasks
                        </h3>
                    )}

                    <div className="space-y-2 min-h-[100px]">
                        {openTodayTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl glass">
                                <div className="bg-green-100/50 dark:bg-green-900/30 p-4 rounded-full mb-4 shadow-sm">
                                    <CheckCircle2 size={40} className="text-green-500" />
                                </div>
                                <p className="text-gray-800 dark:text-gray-200 font-heading font-bold text-lg">All caught up!</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Enjoy your day or add a new task.</p>
                            </div>
                        ) : (
                            openTodayTasks.map(({ task, isVirtual }) => {
                                // Calculate recurrence stats
                                const baseId = isVirtual ? task.id.split('-virtual-')[0] : task.id;
                                let completedCount = 0;
                                let missedCount = 0;
                                if (task.recurrence !== Recurrence.NONE) {
                                    const history = tasks.filter(t => t.seriesId === baseId);
                                    completedCount = history.filter(t => t.status === Status.DONE).length;
                                    missedCount = history.filter(t => t.status === Status.EXPIRED).length;
                                }

                                return (
                                    <div key={task.id} className="animate-slide-up">
                                        <TaskCard
                                            task={task}
                                            onEdit={onEditTask}
                                            onMove={onMoveTask}
                                            // "onMove" in BoardView moves between cols. In List view, maybe we don't need them?
                                            // User asked for "interactive". Drag/Drop is covered. 
                                            // Let's keep them or hide them if they look cluttered.
                                            // TaskCard has `hideMoveButtons` prop.
                                            onArchive={onArchiveTask}
                                            onDelete={onDeleteTask}
                                            isVirtual={isVirtual}
                                            completedCount={completedCount}
                                            missedCount={missedCount}
                                            onToggleDone={() => onToggleDone(baseId, task.dueDate)}
                                        />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* Completed Section (Collapsible) */}
                {completedTodayTasks.length > 0 && (
                    <section>
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm font-medium mb-3"
                        >
                            <ChevronRight size={16} className={`transition-transform ${showCompleted ? 'rotate-90' : ''}`} />
                            Completed on Today ({completedTodayTasks.length})
                        </button>

                        {showCompleted && (
                            <div className="space-y-2 opacity-75">
                                {completedTodayTasks.map(({ task, isVirtual }) => {
                                    // Calculate recurrence stats
                                    const baseId = isVirtual ? task.id.split('-virtual-')[0] : task.id;
                                    let completedCount = 0;
                                    let missedCount = 0;
                                    if (task.recurrence !== Recurrence.NONE) {
                                        const history = tasks.filter(t => t.seriesId === baseId);
                                        completedCount = history.filter(t => t.status === Status.DONE).length;
                                        missedCount = history.filter(t => t.status === Status.EXPIRED).length;
                                    }

                                    return (
                                        <div key={task.id} className="glass rounded-2xl opacity-75 hover:opacity-100 transition-all duration-300">
                                            <TaskCard
                                                task={task}
                                                onEdit={onEditTask}
                                                onMove={onMoveTask}
                                                onArchive={onArchiveTask}
                                                onDelete={onDeleteTask}
                                                isVirtual={isVirtual}
                                                hideMoveButtons={true}
                                                completedCount={completedCount}
                                                missedCount={missedCount}
                                                onToggleDone={() => onToggleDone(baseId, task.dueDate)}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                )}

                {/* Unscheduled / Backlog Section */}
                {unscheduledTasks.length > 0 && (
                    <section>
                        <h3 className="text-purple-600 dark:text-purple-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Circle size={10} fill="currentColor" />
                            Backlog / Unscheduled ({unscheduledTasks.length})
                        </h3>
                        <div className="space-y-2 opacity-90">
                            {unscheduledTasks.map(task => (
                                <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                                    <TaskCard
                                        task={task}
                                        onEdit={onEditTask}
                                        onMove={onMoveTask}
                                        onArchive={onArchiveTask}
                                        onDelete={onDeleteTask}
                                        onToggleDone={() => onToggleDone(task.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div >
    );
};
