
import React, { useMemo } from 'react';
import { Task, Status, Priority } from '../types';
import { CheckCircle, Clock, AlertCircle, Activity, TrendingUp, Calendar, Filter } from 'lucide-react';
import { doesTaskOccurOnDate } from '../utils/taskUtils';

interface AnalyticsViewProps {
    tasks: Task[];
}

const TimeRange = {
    ALL: 'all',
    TODAY: 'today',
    WEEK: 'week',
    MONTH_30: '30days',
    MONTH: 'month',
    YEAR: 'year'
};

const getTagColorHex = (tagColorClass: string) => {
    if (!tagColorClass) return '#9ca3af';
    if (tagColorClass.startsWith('#')) return tagColorClass;

    const colorMap: Record<string, string> = {
        'red': '#ef4444',
        'orange': '#f97316',
        'amber': '#f59e0b',
        'yellow': '#eab308',
        'lime': '#84cc16',
        'green': '#22c55e',
        'emerald': '#10b981',
        'teal': '#14b8a6',
        'cyan': '#06b6d4',
        'sky': '#0ea5e9',
        'blue': '#3b82f6',
        'indigo': '#6366f1',
        'violet': '#8b5cf6',
        'purple': '#a855f7',
        'fuchsia': '#d946ef',
        'pink': '#ec4899',
        'rose': '#f43f5e',
        'slate': '#64748b',
        'gray': '#6b7280',
        'zinc': '#71717a',
        'neutral': '#737373',
        'stone': '#78716c',
    };

    const match = tagColorClass.match(/bg-([a-z]+)-/);
    if (match && colorMap[match[1]]) {
        return colorMap[match[1]];
    }
    return '#9ca3af';
};

import { DrillDownModal } from './DrillDownModal';

interface AnalyticsViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onToggleDone: (taskId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks, onEditTask, onToggleDone }) => {
    const [timeRange, setTimeRange] = React.useState(TimeRange.ALL);
    const [activeModal, setActiveModal] = React.useState<{ title: string, taskIds: string[] } | null>(null);

    const metrics = useMemo(() => {
        // 1. Identify valid time range boundaries
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        let rangeStart: Date | null = null;
        let rangeEnd: Date | null = null;

        switch (timeRange) {
            case TimeRange.TODAY:
                rangeStart = new Date(startOfToday);
                rangeEnd = new Date(startOfToday);
                rangeEnd.setHours(23, 59, 59, 999);
                break;
            case TimeRange.WEEK:
                rangeStart = new Date(startOfToday);
                rangeStart.setDate(rangeStart.getDate() - 6); // Last 7 days including today? Or View Week?
                // "Last 7 Days" as per option label.
                // Weekly View usually shows Sunday-Saturday.
                // Analytics "Last 7 Days" implies rolling window.
                // Let's stick to selected option label "Last 7 Days" for consistency?
                // User asked to review "Week View". Week View is strict calendar week (Sun-Sat).
                // "Last 7 Days" is different.
                // However, to match "How tasks are displayed", users typically check specific days.
                // Let's us rolling window [now-6, now] to match the implicit "Trend" expectation,
                // BUT use the 'View Logic' for determining if a task exists on those days.
                rangeEnd = new Date(startOfToday);
                rangeEnd.setHours(23, 59, 59, 999);
                break;
            case TimeRange.MONTH_30:
                rangeStart = new Date(startOfToday);
                rangeStart.setDate(rangeStart.getDate() - 29);
                rangeEnd = new Date(startOfToday);
                rangeEnd.setHours(23, 59, 59, 999);
                break;
            case TimeRange.MONTH:
                rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
                rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                rangeEnd.setHours(23, 59, 59, 999);
                break;
            case TimeRange.YEAR:
                rangeStart = new Date(now.getFullYear(), 0, 1);
                rangeEnd = new Date(now.getFullYear(), 11, 31);
                rangeEnd.setHours(23, 59, 59, 999);
                break;
            default:
                // ALL TIME
                rangeStart = null;
                rangeEnd = null;
        }

        let computedInstances: Task[] = [];
        let completedCount = 0;
        let activeCount = 0;
        let missedOverdueCount = 0;
        let archivedCount = 0;

        if (timeRange === TimeRange.ALL) {
            // "All Time": Use classic filtering (Existence based)
            // Active = Status TODO/IN_PROGRESS
            // Completed = Status DONE
            // Missed = Expired + Overdue
            const allTasks = tasks.filter(t => t.status !== Status.ARCHIVED);
            completedCount = allTasks.filter(t => t.status === Status.DONE).length;
            activeCount = allTasks.filter(t => t.status === Status.TODO || t.status === Status.IN_PROGRESS).length;

            // Overdue globally
            const overdue = allTasks.filter(t => {
                if (t.status === Status.DONE || t.status === Status.EXPIRED) return false;
                if (!t.dueDate) return false;
                const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
                return d < startOfToday;
            }).length;
            const expired = allTasks.filter(t => t.status === Status.EXPIRED).length;
            missedOverdueCount = overdue + expired;

            computedInstances = allTasks; // mixing statuses
            archivedCount = tasks.filter(t => t.status === Status.ARCHIVED).length;

        } else if (rangeStart && rangeEnd) {
            // RANGE LOGIC: Simulate View Projection
            // Iterate days
            const loopDate = new Date(rangeStart);
            const instances: Task[] = [];

            // Helper to check deduplication
            // If we add a task for "Monday", make sure we don't add it twice if logic overlaps
            // But we iterate days, so day-buckets prevent overlap unless we flatten.

            while (loopDate <= rangeEnd) {
                const currentDayStart = new Date(loopDate);
                currentDayStart.setHours(0, 0, 0, 0);

                tasks.forEach(task => {
                    if (task.status === Status.ARCHIVED) return;

                    // 1. Check if this is a "Completed History" event for this day
                    if (task.status === Status.DONE) {
                        // Priority: completedAt > dueDate > createdAt (as last resort)
                        // User request: "assume it was done the planned day" if timestamp missing.
                        let targetDate: Date | null = null;

                        if (task.completedAt) {
                            targetDate = new Date(task.completedAt);
                        } else if (task.dueDate) {
                            targetDate = new Date(task.dueDate);
                        }

                        if (targetDate) {
                            targetDate.setHours(0, 0, 0, 0);
                            if (targetDate.getTime() === currentDayStart.getTime()) {
                                instances.push(task);
                            }
                        }
                        return;
                    }

                    // 2. Check if this is an "Expiring/Missed" event for this day?
                    if (task.status === Status.EXPIRED) {
                        // When did it expire? usually we don't track `expiredAt`.
                        // We track `dueDate`. If `dueDate` was this day, it was missed this day.
                        if (task.dueDate) {
                            const dDate = new Date(task.dueDate);
                            dDate.setHours(0, 0, 0, 0);
                            if (dDate.getTime() === currentDayStart.getTime()) {
                                instances.push(task);
                            }
                        }
                        return;
                    }

                    // 3. Active (TODO/IN_PROGRESS) - Recurring Logic
                    // Use the helper to see if it occurs on this day
                    // NOTE: `doesTaskOccurOnDate` handles recurrence AND single instances (dueDate check)
                    if (doesTaskOccurOnDate(task, currentDayStart)) {
                        // It occurs. Now, is there ALREADY a completed history task for this specific instance?
                        // (e.g. I have "Daily Standup" recurring. I completed it today.
                        //  Function `doesTaskOccurOnDate` says YES it occurs today.
                        //  But I shouldn't count it as "Active" if I already have a DONE task for it.)

                        const hasHistory = tasks.some(t =>
                            t.status === Status.DONE &&
                            t.title === task.title &&
                            t.dueDate &&
                            new Date(t.dueDate).setHours(0, 0, 0, 0) === currentDayStart.getTime()
                            && t.id !== task.id // different ID (the history item)
                        );

                        if (!hasHistory) {
                            // It is an Active Instance for this day!
                            // Create a virtual instance if needed, or push original
                            // For counting, just pushing original is fine, but we might want Unique IDs for list?
                            // Pushing original means `id` duplicates in the `instances` array (same task multiple days).
                            // This is fine for Counts.
                            instances.push(task);
                        }
                    }
                });

                loopDate.setDate(loopDate.getDate() + 1);
            }

            computedInstances = instances;

            // Post-process counts from instances

            // 1. In-View Metrics
            completedCount = computedInstances.filter(t => t.status === Status.DONE).length;
            activeCount = computedInstances.filter(t => t.status === Status.TODO || t.status === Status.IN_PROGRESS).length;
            const missedInView = computedInstances.filter(t => t.status === Status.EXPIRED).length;

            // 2. Drag-Along / Backlog Overdue
            // Tasks that are Active (TODO/IN_PROGRESS) but were due BEFORE the rangeStart.
            // These are strictly "Overdue" and NOT in the view (filtered out by date range).
            // This prevents double counting.
            const backlogOverdueTasks = tasks.filter(t => {
                if (t.status !== Status.TODO && t.status !== Status.IN_PROGRESS) return false;
                if (t.status === Status.ARCHIVED) return false;
                if (!t.dueDate) return false;
                const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);

                // Strict check: Due Date < Range Start
                // If Range Start is today, and tasks due yesterday -> Backlog.
                // If Range Start is Last Week, tasks due 2 weeks ago -> Backlog.
                // Tasks due Last Week -> Are in `computedInstances` (Active).
                return d < (rangeStart || new Date(0)); // new Date(0) fallback shouldn't happen here
            });

            // Merge for Charts
            // We want to visualize the Total Workload = In-View + Backlog.
            // Because 'computedInstances' might contain duplicates (recurrence), but 'backlogOverdueTasks' are singular.
            // This is acceptable for "Volume" analysis.
            const allAnalyzedTasks = [...computedInstances, ...backlogOverdueTasks];

            missedOverdueCount = missedInView + backlogOverdueTasks.length;
            archivedCount = tasks.filter(t => t.status === Status.ARCHIVED).length;

            // Re-assign computedInstances to the merged set so Priority/Category charts use it?
            // YES. The user wants "missed and overdue include in all panels".
            computedInstances = allAnalyzedTasks;
        }

        // derived stats
        const total = activeCount + completedCount + missedOverdueCount;


        const gradedTotal = completedCount + missedOverdueCount;
        const rate = gradedTotal > 0 ? Math.round((completedCount / gradedTotal) * 100) : 0;

        const byPriority = {
            [Priority.HIGH]: computedInstances.filter(t => t.priority === Priority.HIGH && t.status !== Status.ARCHIVED).length,
            [Priority.MEDIUM]: computedInstances.filter(t => t.priority === Priority.MEDIUM && t.status !== Status.ARCHIVED).length,
            [Priority.LOW]: computedInstances.filter(t => t.priority === Priority.LOW && t.status !== Status.ARCHIVED).length,
        };

        const byStatus = {
            [Status.TODO]: activeCount, // Approximately
            [Status.IN_PROGRESS]: computedInstances.filter(t => t.status === Status.IN_PROGRESS).length,
            [Status.DONE]: completedCount,
            [Status.EXPIRED]: missedOverdueCount, // Grouping overdue into expired/missed bucket
        };

        const taskLists = {
            completed: computedInstances.filter(t => t.status === Status.DONE),
            // Active List: Must exclude Backlog Overdue tasks if they were merged into computedInstances.
            // Backlog Overdue tasks are TODO/IN_PROGRESS but due before rangeStart.
            active: computedInstances.filter(t => {
                if (t.status !== Status.TODO && t.status !== Status.IN_PROGRESS) return false;
                // Exclude if it's strictly a backlog item (due < range Start)
                // BUT wait, `computedInstances` now HAS them merged in.
                // WE need to distinguish "Active Scheduled In View" vs "Backlog Overdue".
                // Active Count used `activeCount` variable calculated BEFORE merge.
                // We should replicate that logic or use the `instances` array if we had kept it.
                // Since we didn't keep it, we re-check date.
                if (rangeStart && t.dueDate) {
                    const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
                    if (d < rangeStart) return false; // It's backlog overdue
                }
                return true;
            }),
            // Missed/Overdue List: 
            // 1. Expired In View
            // 2. Backlog Overdue (which are in computedInstances now as TODO/IN_PROGRESS)
            missedOverdue: computedInstances.filter(t => {
                if (t.status === Status.EXPIRED) return true;
                if (t.status === Status.TODO || t.status === Status.IN_PROGRESS) {
                    if (rangeStart && t.dueDate) {
                        const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
                        if (d < rangeStart) return true; // It's backlog overdue
                    }
                }
                return false;
            })
        };



        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0); return d;
        }).reverse();

        const activity = last7Days.map(date => {
            const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayStart = date.getTime();
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);
            const dayEnd = nextDay.getTime();

            const count = tasks.filter(t => {
                if (t.status !== Status.DONE && t.status !== Status.ARCHIVED) return false;

                // Priority: completedAt > dueDate > createdAt
                let targetTime = t.createdAt; // Default fallback

                if (t.status === Status.DONE) {
                    if (t.completedAt) {
                        targetTime = t.completedAt;
                    } else if (t.dueDate) {
                        targetTime = new Date(t.dueDate).getTime(); // dueDate is string ISO usually, check type
                        // Check if t.dueDate is string or number? in Task type it is string ISO. 
                        // But wait, t.createdAt is number (timestamp).
                        // t.completedAt is number (timestamp).
                        // So we need to convert dueDate string to timestamp.
                        // However, let's double check types.ts
                        // Using new Date().getTime() is safe.
                    }
                }

                // Correction: t.dueDate is string ISO. 
                // We need strict types.
                if (t.status === Status.DONE) {
                    if (t.completedAt) {
                        targetTime = t.completedAt;
                    } else if (t.dueDate) {
                        // Use noon to avoid timezone edge cases with day boundaries? 
                        // Actually "Planned Day" usually means 00:00 local.
                        // But we want it to fall into the "dayStart" to "dayEnd" bucket.
                        // "dayStart" is set to 00:00 of that day.
                        // If dueDate is "2023-10-10T..."
                        // new Date(t.dueDate).getTime() might be 00:00 UTC or Local?
                        // It is usually ISO string.
                        targetTime = new Date(t.dueDate).getTime();
                    }
                }

                return targetTime >= dayStart && targetTime < dayEnd;
            }).length;
            return { day: dayStr, count };
        });

        const byCategory: Record<string, number> = {};
        const tagColors: Record<string, string> = {};

        // Use computedInstances for category distribution if range selected, or allTasks (filteredTasks replacement) if ALL??
        // Wait, filteredTasks is gone.
        // We have `computedInstances` which serves the purpose of "Tasks in View".
        // BUT for "All Time", we defined `computedInstances` to be `allTasks`.
        // So we can use `computedInstances`.

        computedInstances.forEach(t => {
            if (t.tags && t.tags.length > 0) {
                t.tags.forEach(tag => {
                    byCategory[tag.label] = (byCategory[tag.label] || 0) + 1;
                    tagColors[tag.label] = tag.color;
                });
            } else {
                byCategory['Uncategorized'] = (byCategory['Uncategorized'] || 0) + 1;
                tagColors['Uncategorized'] = '#9ca3af'; // gray-400
            }
        });

        return {
            total,
            completed: completedCount,
            active: activeCount,
            archived: archivedCount,
            missedOverdue: missedOverdueCount,
            rate,
            byPriority,
            byStatus,
            activity,
            byCategory,
            tagColors,
            taskLists
        };
    }, [tasks, timeRange]);

    const getStatusPercentage = (count: number, total: number) => total > 0 ? (count / total) * 100 : 0;

    const handleCardClick = (title: string, taskList: Task[]) => {
        setActiveModal({ title, taskIds: taskList.map(t => t.id) });
    };

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                            Productivity Analytics
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Track your progress and habits over time
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                            >
                                <option value={TimeRange.ALL}>All Time</option>
                                <option value={TimeRange.TODAY}>Today</option>
                                <option value={TimeRange.WEEK}>Last 7 Days</option>
                                <option value={TimeRange.MONTH_30}>Last 30 Days</option>
                                <option value={TimeRange.MONTH}>This Month</option>
                                <option value={TimeRange.YEAR}>Year to Date</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Completion Rate"
                        value={`${metrics.rate}%`}
                        icon={<CheckCircle size={24} className="text-green-600" />}
                        color="bg-green-100 dark:bg-green-900/30"
                    />

                    <div onClick={() => handleCardClick('Completed Tasks', metrics.taskLists.completed)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                        <MetricCard
                            title="Completed Tasks"
                            value={metrics.completed}
                            icon={<CheckCircle size={24} className="text-blue-600" />}
                            color="bg-blue-100 dark:bg-blue-900/30"
                        />
                    </div>

                    <div onClick={() => handleCardClick('Active Tasks', metrics.taskLists.active)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                        <MetricCard
                            title="Active Tasks"
                            value={metrics.active}
                            icon={<Clock size={24} className="text-yellow-600" />}
                            color="bg-yellow-100 dark:bg-yellow-900/30"
                        />
                    </div>

                    <div onClick={() => handleCardClick('Missed / Overdue', metrics.taskLists.missedOverdue)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                        <MetricCard
                            title="Missed / Overdue"
                            value={metrics.missedOverdue}
                            icon={<AlertCircle size={24} className="text-orange-600" />}
                            color="bg-orange-100 dark:bg-orange-900/30"
                        />
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Priority Breakdown */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">Tasks by Priority</h3>
                        <div className="space-y-6">
                            <PriorityBar label="High Priority" count={metrics.byPriority[Priority.HIGH]} total={metrics.total} color="bg-red-500" />
                            <PriorityBar label="Medium Priority" count={metrics.byPriority[Priority.MEDIUM]} total={metrics.total} color="bg-yellow-500" />
                            <PriorityBar label="Low Priority" count={metrics.byPriority[Priority.LOW]} total={metrics.total} color="bg-blue-500" />
                        </div>
                    </div>

                    {/* Status Distribution (Pie Approximation) */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                            Task Status
                        </h3>
                        <div className="flex items-center justify-around">
                            {/* CSS Conic Gradient Ring */}
                            <div className="relative w-40 h-40 rounded-full" style={{
                                background: `conic-gradient(
                #3b82f6 0% ${getStatusPercentage(metrics.byStatus[Status.TODO], metrics.total)}%, 
                #f59e0b ${getStatusPercentage(metrics.byStatus[Status.TODO], metrics.total)}% ${getStatusPercentage(metrics.byStatus[Status.TODO] + metrics.byStatus[Status.IN_PROGRESS], metrics.total)}%, 
                #22c55e ${getStatusPercentage(metrics.byStatus[Status.TODO] + metrics.byStatus[Status.IN_PROGRESS], metrics.total)}% ${getStatusPercentage(metrics.byStatus[Status.TODO] + metrics.byStatus[Status.IN_PROGRESS] + metrics.byStatus[Status.DONE], metrics.total)}%,
                #ef4444 ${getStatusPercentage(metrics.byStatus[Status.TODO] + metrics.byStatus[Status.IN_PROGRESS] + metrics.byStatus[Status.DONE], metrics.total)}% 100%
                )`
                            }}>
                                <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center flex-col">
                                    <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{metrics.total}</span>
                                    <span className="text-xs text-gray-500">Total Tasks</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> To Do</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> In Progress</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Done</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Missed / Overdue</div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Activity */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">Recent Activity</h3>
                        <div className="h-48 flex items-end justify-between gap-2">
                            {metrics.activity.map((day, i) => {
                                const max = Math.max(...metrics.activity.map(d => d.count), 1); // Avoid div by zero
                                const height = `${(day.count / max) * 100}%`;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-lg relative flex-1 flex items-end overflow-hidden">
                                            <div
                                                style={{ height: height }}
                                                className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t-lg transition-all duration-500 ease-out group-hover:bg-indigo-600"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{day.day}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{day.count}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Distribution (Tags) */}
                    <div className="col-span-1 lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <Filter size={18} className="text-gray-400" /> Category Distribution
                        </h3>
                        {Object.keys(metrics.byCategory).length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No tags found.</p>
                        ) : (
                            <div className="flex items-end gap-3 h-48 overflow-x-auto pb-2 custom-scrollbar">
                                {Object.entries(metrics.byCategory).map(([label, count]: [string, any]) => {
                                    const max = Math.max(...Object.values(metrics.byCategory) as number[], 1);
                                    const height = (count / max) * 100;
                                    const color = getTagColorHex(metrics.tagColors[label]);
                                    return (
                                        <div key={label} className="flex-1 min-w-[60px] flex flex-col items-center justify-end gap-2 group">
                                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 transition-opacity">{count}</div>
                                            <div className="h-32 w-full flex items-end justify-center rounded-t-lg bg-gray-50/50 dark:bg-gray-700/30">
                                                <div
                                                    className="w-full rounded-t-lg hover:opacity-80 transition-opacity relative"
                                                    style={{ height: `${height}%`, minHeight: '4px', backgroundColor: `${color}40` }}
                                                >
                                                    <div className="absolute bottom-0 w-full h-[4px] rounded-t-md opacity-60" style={{ backgroundColor: color }}></div>
                                                    <div className="absolute inset-0 rounded-t-lg" style={{ borderTop: `2px solid ${color}` }}></div>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium truncate w-full text-center" title={label}>{label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                </div>

                <DrillDownModal
                    isOpen={activeModal !== null}
                    onClose={() => setActiveModal(null)}
                    title={activeModal?.title || ''}
                    tasks={activeModal && activeModal.taskIds ? tasks.filter(t => activeModal.taskIds.includes(t.id)) : []}
                    onEditTask={(task) => {
                        setActiveModal(null);
                        onEditTask(task);
                    }}
                    onToggleDone={onToggleDone}
                />
            </div>
        </div>
    );
};

function MetricCard({ title, value, icon, color }: any) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                {icon}
            </div>
        </div>
    );
}

function PriorityBar({ label, count, total, color }: any) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-300">{label}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{count}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}></div>
            </div>
        </div>
    );
}

function CategoryBar({ label, count, total, color }: any) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
            <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{count}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full opacity-80" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, backgroundColor: color }}></div>
                </div>
            </div>
        </div>
    );
}

const getStatusPercentage = (val: number, total: number) => {
    if (!total) return 0;
    return (val / total) * 100;
}
