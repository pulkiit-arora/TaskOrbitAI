
import React, { useMemo } from 'react';
import { Task, Status, Priority } from '../types';
import { CheckCircle, Clock, AlertCircle, Activity, TrendingUp, Calendar, Filter } from 'lucide-react';

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

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks }) => {
    const [timeRange, setTimeRange] = React.useState(TimeRange.ALL);

    const metrics = useMemo(() => {
        // 1. Filter tasks by date first
        const now = new Date();
        const filteredTasks = tasks.filter(t => {
            if (timeRange === TimeRange.ALL) return true;

            const taskDate = new Date(t.createdAt);
            // Note: Ideally we track 'completedAt' for completed tasks, etc.
            // But for general analytics of "When was this task relevant?", `createdAt` is a decent proxy for existence
            // or we can just filter strictly by "action happened in this range".
            // Let's stick to simple "Created or Completed in this range"?
            // Actually, standard is usually just "Active in this range" or "Created in this range".
            // To keep it simple and consistent with "Productivity", let's check createdAt.

            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            switch (timeRange) {
                case TimeRange.TODAY:
                    return taskDate >= startOfDay;
                case TimeRange.WEEK: {
                    const weekAgo = new Date(now);
                    weekAgo.setDate(now.getDate() - 7);
                    return taskDate >= weekAgo;
                }
                case TimeRange.MONTH_30: {
                    const monthAgo = new Date(now);
                    monthAgo.setDate(now.getDate() - 30);
                    return taskDate >= monthAgo;
                }
                case TimeRange.MONTH: {
                    return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
                }
                case TimeRange.YEAR: {
                    return taskDate.getFullYear() === now.getFullYear();
                }
                default:
                    return true;
            }
        });

        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status === Status.DONE).length;
        const active = filteredTasks.filter(t => t.status === Status.TODO || t.status === Status.IN_PROGRESS).length;
        const archived = filteredTasks.filter(t => t.status === Status.ARCHIVED).length;
        const expired = filteredTasks.filter(t => t.status === Status.EXPIRED).length;

        // Calculate Completion Rate
        const actionableTotal = completed + active + expired;
        const rate = actionableTotal > 0 ? Math.round((completed / actionableTotal) * 100) : 0;

        // Priority Distribution
        const byPriority = {
            [Priority.HIGH]: filteredTasks.filter(t => t.priority === Priority.HIGH && t.status !== Status.ARCHIVED).length,
            [Priority.MEDIUM]: filteredTasks.filter(t => t.priority === Priority.MEDIUM && t.status !== Status.ARCHIVED).length,
            [Priority.LOW]: filteredTasks.filter(t => t.priority === Priority.LOW && t.status !== Status.ARCHIVED).length,
        };

        // Status Distribution (Active)
        const byStatus = {
            [Status.TODO]: filteredTasks.filter(t => t.status === Status.TODO).length,
            [Status.IN_PROGRESS]: filteredTasks.filter(t => t.status === Status.IN_PROGRESS).length,
            [Status.DONE]: completed,
            [Status.EXPIRED]: expired,
        };

        // Weekly Activity (Last 7 days from NOW, unrelated to filter? Or adaptive?)
        // If filter is specific, maybe show activity over THAT range? 
        // For now, let's keep "Weekly Activity" as a fixed "Last 7 Days" chart because it's explicitly labeled as such.
        // However, if the user selects "Year to Date", they might want "Monthly Activity". 
        // Let's stick to the existing visual for now to avoid scope creep, but calculate counts based on the filtered set if valid?
        // Actually, "Last 7 Days" chart implies a fixed window. Let's leave it as "Recent Activity" fixed window to show *current* momentum regardless of filter.
        // BUT the data source `filteredTasks` might exclude the last 7 days if I select "Last Year" (not an option yet).
        // Let's use `tasks` (all tasks) for the "Last 7 Days" activity chart to ensure it always shows recent momentum, 
        // OR we change the chart to "Activity Distribution" over the filtered range.
        // User asked for "Select Year to Date ... to see performance", implying the whole view should update.
        // So let's update the chart to be "Activity over Time" and adapt the buckets?
        // Complexity: High to adapt buckets. 
        // DECISION: Keep "Last 7 Days" chart as "Recent Trends" using ALL tasks, 
        // but update the "Key Metrics" and "Distributions" using `filteredTasks`.
        // This gives context "How am I doing generally right now" vs "How did I do in that period".

        // Re-calculating last 7 days from ALL tasks to maintain "Recent Activity" context
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            return d;
        }).reverse();

        const activity = last7Days.map(date => {
            const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
            const count = tasks.filter(t => { // Use 'tasks' (all) or 'filteredTasks'?
                // If I select "Today", the chart becomes 1 bar?
                // Let's stick to ALL filtered tasks for the counts to be consistent with the view provided.
                // Wait, if I filter "Today", "Last 7 days" chart will be empty except today.
                // That is correct behavior for a filter.

                if (t.status !== Status.DONE && t.status !== Status.ARCHIVED) return false;
                const tDate = new Date(t.createdAt);
                return tDate.getDate() === date.getDate() &&
                    tDate.getMonth() === date.getMonth() &&
                    tDate.getFullYear() === date.getFullYear();
            }).length; // Using original tasks ensures this chart always shows recent context.
            return { day: dayStr, count };
        });

        // Category (Tag) Distribution
        const byCategory: Record<string, number> = {};
        const tagColors: Record<string, string> = {};

        filteredTasks.forEach(t => {
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

        return { total, completed, active, archived, expired, rate, byPriority, byStatus, activity, byCategory, tagColors };
    }, [tasks, timeRange]);

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Activity className="text-blue-600" />
                            Productivity Analytics
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Track your performance and task habits.</p>
                    </div>

                    <div className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer py-1 px-2"
                        >
                            <option value={TimeRange.ALL}>All Time</option>
                            <option value={TimeRange.TODAY}>Today</option>
                            <option value={TimeRange.WEEK}>Last 7 Days</option>
                            <option value={TimeRange.MONTH_30}>Last 30 Days</option>
                            <option value={TimeRange.MONTH}>This Month</option>
                            <option value={TimeRange.YEAR}>Year to Date</option>
                        </select>
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Completion Rate"
                        value={`${metrics.rate}%`}
                        icon={<TrendingUp size={20} />}
                        color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    />
                    <MetricCard
                        title="Completed Tasks"
                        value={metrics.completed}
                        icon={<CheckCircle size={20} />}
                        color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    />
                    <MetricCard
                        title="Active Tasks"
                        value={metrics.active}
                        icon={<Clock size={20} />}
                        color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    />
                    <MetricCard
                        title="Missed/Expired"
                        value={metrics.expired}
                        icon={<AlertCircle size={20} />}
                        color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Priority Breakdown */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <Filter size={18} className="text-gray-400" /> Priority Distribution
                        </h3>
                        <div className="space-y-4">
                            <PriorityBar label="High Priority" count={metrics.byPriority[Priority.HIGH]} total={metrics.total} color="bg-red-500" />
                            <PriorityBar label="Medium Priority" count={metrics.byPriority[Priority.MEDIUM]} total={metrics.total} color="bg-yellow-500" />
                            <PriorityBar label="Low Priority" count={metrics.byPriority[Priority.LOW]} total={metrics.total} color="bg-blue-500" />
                        </div>
                    </div>

                    {/* Status Distribution (Pie Approximation) */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <Activity size={18} className="text-gray-400" /> Task Status
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
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Expired</div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Weekly Activity */}
                {/* New Tasks Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                        <Calendar size={18} className="text-gray-400" /> New Tasks (Last 7 Days)
                    </h3>
                    <div className="flex items-end justify-between h-40 gap-2">
                        {metrics.activity.map((day, idx) => {
                            const max = Math.max(...metrics.activity.map(a => a.count), 1);
                            const height = (day.count / max) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">{day.count}</div>
                                    <div
                                        className="w-full bg-blue-100 dark:bg-blue-900 rounded-t-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors relative"
                                        style={{ height: `${height}%`, minHeight: '4px' }}
                                    >
                                        <div className="absolute bottom-0 w-full bg-blue-500 h-[4px] rounded-t-md opacity-20"></div>
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium">{day.day}</span>
                                </div>
                            )
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
                                const color = metrics.tagColors[label] || '#9ca3af';
                                return (
                                    <div key={label} className="flex-1 min-w-[60px] flex flex-col items-center justify-end gap-2 group">
                                        <div className="text-xs font-bold text-gray-800 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                                        <div
                                            className="w-full rounded-t-lg hover:opacity-80 transition-opacity relative"
                                            style={{ height: `${height}%`, minHeight: '4px', backgroundColor: `${color}40` }}
                                        >
                                            <div className="absolute bottom-0 w-full h-[4px] rounded-t-md opacity-60" style={{ backgroundColor: color }}></div>
                                            <div className="absolute inset-0 rounded-t-lg" style={{ borderTop: `2px solid ${color}` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium truncate w-full text-center" title={label}>{label}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

const MetricCard = ({ title, value, icon, color }: any) => (
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

const PriorityBar = ({ label, count, total, color }: any) => (
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

const CategoryBar = ({ label, count, total, color }: any) => (
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

const getStatusPercentage = (val: number, total: number) => {
    if (!total) return 0;
    return (val / total) * 100;
}
