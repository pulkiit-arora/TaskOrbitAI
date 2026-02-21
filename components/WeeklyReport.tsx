import React, { useMemo } from 'react';
import { Task, Status, Priority } from '../types';
import { CalendarDays, CheckCircle, AlertCircle, Flame, TrendingUp, Award } from 'lucide-react';

interface WeeklyReportProps {
    tasks: Task[];
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ tasks }) => {
    const report = useMemo(() => {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const completedThisWeek = tasks.filter(t => {
            if (t.status !== Status.DONE) return false;
            const completedDate = t.completedAt ? new Date(t.completedAt) : t.dueDate ? new Date(t.dueDate) : null;
            return completedDate && completedDate >= weekAgo && completedDate <= now;
        });

        const overdueCount = tasks.filter(t => {
            if (t.status === Status.DONE || t.status === Status.ARCHIVED) return false;
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < now;
        }).length;

        const highPriorityDone = completedThisWeek.filter(t => t.priority === Priority.HIGH).length;

        // Top tags
        const tagCounts: Record<string, number> = {};
        completedThisWeek.forEach(t => {
            (t.tags || []).forEach(tag => {
                tagCounts[tag.label] = (tagCounts[tag.label] || 0) + 1;
            });
        });
        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([label, count]) => ({ label, count }));

        // Streak info
        const activeTasks = tasks.filter(t => t.status !== Status.ARCHIVED);

        // Daily completion counts for sparkline
        const dailyCounts: number[] = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date(now);
            day.setDate(day.getDate() - i);
            const dayStr = day.toISOString().split('T')[0];
            const count = completedThisWeek.filter(t => {
                const d = t.completedAt ? new Date(t.completedAt) : t.dueDate ? new Date(t.dueDate) : null;
                return d && d.toISOString().split('T')[0] === dayStr;
            }).length;
            dailyCounts.push(count);
        }

        return {
            completed: completedThisWeek.length,
            overdue: overdueCount,
            highPriority: highPriorityDone,
            topTags,
            dailyCounts,
            dateRange: `${weekAgo.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        };
    }, [tasks]);

    const maxDaily = Math.max(...report.dailyCounts, 1);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();
    const orderedDays = [];
    for (let i = 6; i >= 0; i--) {
        const idx = (today - i + 7) % 7;
        orderedDays.push(dayNames[idx === 0 ? 6 : idx - 1]);
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800
      rounded-xl border border-indigo-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CalendarDays size={16} className="text-indigo-500" />
                    Weekly Report
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{report.dateRange}</span>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <CheckCircle size={16} className="text-green-500 mx-auto mb-1" />
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{report.completed}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed</div>
                </div>
                <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <AlertCircle size={16} className="text-orange-500 mx-auto mb-1" />
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{report.overdue}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overdue</div>
                </div>
                <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <Award size={16} className="text-red-500 mx-auto mb-1" />
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{report.highPriority}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">High Priority</div>
                </div>
            </div>

            {/* Mini bar chart */}
            <div className="mb-4">
                <div className="flex items-end justify-between gap-1 h-16">
                    {report.dailyCounts.map((count, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full rounded-t bg-indigo-400 dark:bg-indigo-500 transition-all duration-300"
                                style={{
                                    height: `${Math.max((count / maxDaily) * 100, count > 0 ? 15 : 4)}%`,
                                    minHeight: count > 0 ? '8px' : '2px',
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-1">
                    {orderedDays.map((d, i) => (
                        <span key={i} className="text-[9px] text-gray-400 dark:text-gray-500 flex-1 text-center">{d}</span>
                    ))}
                </div>
            </div>

            {/* Top tags */}
            {report.topTags.length > 0 && (
                <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Categories</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {report.topTags.map(tag => (
                            <span key={tag.label}
                                className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/40
                  text-indigo-700 dark:text-indigo-300 font-medium">
                                {tag.label} ({tag.count})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
