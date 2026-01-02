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
}

export const TodayView: React.FC<TodayViewProps> = ({
    tasks,
    onEditTask,
    onMoveTask,
    onArchiveTask,
    onDeleteTask,
    onToggleDone,
    onDropTask,
    onAddTask
}) => {
    const [showCompleted, setShowCompleted] = useState(false);

    // Date calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter Logic
    const overdueTasks = tasks.filter(t =>
        t.dueDate &&
        isOpen(t) &&
        new Date(t.dueDate) < today &&
        t.status !== Status.EXPIRED
    ).sort((a, b) => {
        // Sort oldest overdue first
        return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
    });

    // Get Today's Tasks (including recurring projections)
    const getTasksForToday = () => {
        const dayTasks: { task: Task; isVirtual: boolean }[] = [];

        tasks.forEach(task => {
            if (task.status === Status.ARCHIVED) return;
            if (task.status === Status.EXPIRED) return; // Don't show expired in Today list (unless we want to?)

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
                    displayStatus = Status.TODO; // Virtual projection is always TODO
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

    // Sorting: Priority -> Unscheduled(if any?) -> Created
    const sortFn = (a: { task: Task }, b: { task: Task }) => {
        const pw: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const pDiff = pw[b.task.priority] - pw[a.task.priority];
        if (pDiff !== 0) return pDiff;
        return b.task.createdAt - a.task.createdAt; // Newer first
    };

    openTodayTasks.sort(sortFn);
    completedTodayTasks.sort(sortFn);

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
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tasks Completed</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{completedTodayTasks.length}</span>
                            <span className="text-sm text-gray-500">/ {allTodayTasks.length}</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Completion Rate</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={`text-2xl font-bold ${allTodayTasks.length > 0 && (completedTodayTasks.length / allTodayTasks.length) >= 0.8 ? 'text-green-600' : 'text-blue-600'}`}>
                                {allTodayTasks.length > 0 ? Math.round((completedTodayTasks.length / allTodayTasks.length) * 100) : 0}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${allTodayTasks.length > 0 && (completedTodayTasks.length / allTodayTasks.length) >= 0.8 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${allTodayTasks.length > 0 ? (completedTodayTasks.length / allTodayTasks.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{openTodayTasks.length}</span>
                            <span className="text-sm text-gray-500">remaining</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overdue</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>{overdueTasks.length}</span>
                            {overdueTasks.length === 0 && <span className="text-sm text-green-600 font-medium">On Track</span>}
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
                            {overdueTasks.map(task => (
                                <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="border-l-4 border-l-red-500">
                                        <TaskCard
                                            task={task}
                                            onEdit={onEditTask}
                                            onMove={onMoveTask}
                                            onArchive={onArchiveTask}
                                            onDelete={onDeleteTask}
                                            hideMoveButtons={true}
                                            compact={false} // Use full rows
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Today Section */}
                <section>
                    {overdueTasks.length === 0 && (
                        <h3 className="text-blue-600 dark:text-blue-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Circle size={10} fill="currentColor" />
                            Today's Tasks
                        </h3>
                    )}

                    <div className="space-y-2 min-h-[100px]">
                        {openTodayTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-3">
                                    <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-gray-800 dark:text-gray-200 font-medium">All caught up!</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Enjoy your day or add a new task.</p>
                            </div>
                        ) : (
                            openTodayTasks.map(({ task, isVirtual }) => {
                                // Calculate recurrence stats
                                let completedCount = 0;
                                let missedCount = 0;
                                if (task.recurrence !== Recurrence.NONE) {
                                    const baseId = isVirtual ? task.id.split('-virtual-')[0] : task.id;
                                    const history = tasks.filter(t => t.seriesId === baseId);
                                    completedCount = history.filter(t => t.status === Status.DONE).length;
                                    missedCount = history.filter(t => t.status === Status.EXPIRED).length;
                                }

                                return (
                                    <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
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
                                    // Calculate recurrence stats if applicable
                                    let completedCount = 0;
                                    if (task.recurrence !== Recurrence.NONE && !isVirtual) {
                                        completedCount = tasks.filter(t => t.status === Status.DONE && t.seriesId === task.id).length;
                                    } else if (task.recurrence !== Recurrence.NONE && isVirtual) {
                                        // For virtual tasks, the 'task' is the display task. We need the base task ID.
                                        // task.id is virtual. 'task.seriesId' might not be set or might be wrong on virtual? 
                                        const baseId = task.id.split('-virtual-')[0]; // or task.id if it's the base
                                        // Actually, for virtual tasks, we constructed them in getTasksForToday.
                                        // We didn't explicitly set seriesId on them to match the base. 
                                        // But we CAN match by the baseId we know.
                                        completedCount = tasks.filter(t => t.status === Status.DONE && t.seriesId === baseId).length;
                                    }

                                    return (
                                        <div key={task.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 grayscale hover:grayscale-0 transition-all">
                                            <TaskCard
                                                task={task}
                                                onEdit={onEditTask}
                                                onMove={onMoveTask}
                                                onArchive={onArchiveTask}
                                                onDelete={onDeleteTask}
                                                isVirtual={isVirtual}
                                                hideMoveButtons={true}
                                                completedCount={completedCount}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div >
    );
};
