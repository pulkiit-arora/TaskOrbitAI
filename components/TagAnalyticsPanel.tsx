import React, { useMemo } from 'react';
import { Task, Status } from '../types';
import { Tag as TagIcon } from 'lucide-react';

interface TagAnalyticsPanelProps {
    tasks: Task[];
}

interface TagStat {
    label: string;
    color: string;
    total: number;
    completed: number;
    rate: number;
}

export const TagAnalyticsPanel: React.FC<TagAnalyticsPanelProps> = ({ tasks }) => {
    const tagStats = useMemo<TagStat[]>(() => {
        const statsMap: Record<string, { label: string; color: string; total: number; completed: number }> = {};

        tasks.forEach(task => {
            if (task.status === Status.ARCHIVED) return;

            const taskTags = task.tags && task.tags.length > 0
                ? task.tags
                : [{ id: 'uncategorized', label: 'Uncategorized', color: 'bg-gray-400' }];

            taskTags.forEach(tag => {
                if (!statsMap[tag.id]) {
                    statsMap[tag.id] = { label: tag.label, color: tag.color, total: 0, completed: 0 };
                }
                statsMap[tag.id].total++;
                if (task.status === Status.DONE) statsMap[tag.id].completed++;
            });
        });

        return Object.values(statsMap)
            .map(s => ({ ...s, rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0 }))
            .sort((a, b) => b.total - a.total);
    }, [tasks]);

    const maxTotal = Math.max(...tagStats.map(s => s.total), 1);

    const getBarColor = (color: string): string => {
        const colorMap: Record<string, string> = {
            'bg-red-500': 'bg-red-500', 'bg-blue-500': 'bg-blue-500', 'bg-green-500': 'bg-green-500',
            'bg-yellow-500': 'bg-yellow-500', 'bg-purple-500': 'bg-purple-500', 'bg-pink-500': 'bg-pink-500',
            'bg-indigo-500': 'bg-indigo-500', 'bg-teal-500': 'bg-teal-500', 'bg-orange-500': 'bg-orange-500',
            'bg-gray-400': 'bg-gray-400',
        };
        return colorMap[color] || 'bg-blue-500';
    };

    if (tagStats.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TagIcon size={16} className="text-purple-500" />
                Task Distribution by Tag
            </h3>

            <div className="space-y-3">
                {tagStats.slice(0, 10).map(stat => (
                    <div key={stat.label}>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${getBarColor(stat.color)}`} />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{stat.label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                <span>{stat.completed}/{stat.total}</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{stat.rate}%</span>
                            </div>
                        </div>
                        <div className="flex gap-1 h-2">
                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${getBarColor(stat.color)} transition-all duration-500`}
                                    style={{ width: `${(stat.total / maxTotal) * 100}%`, opacity: 0.3 + (stat.rate / 100) * 0.7 }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
