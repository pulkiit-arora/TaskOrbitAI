import React from 'react';
import { Task } from '../types';
import { getTopStreaks, getStreakBadge, StreakInfo } from '../utils/streakUtils';
import { Flame, Trophy, Star } from 'lucide-react';

interface StreakPanelProps {
    tasks: Task[];
}

export const StreakPanel: React.FC<StreakPanelProps> = ({ tasks }) => {
    const topStreaks = getTopStreaks(tasks, 5);

    if (topStreaks.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Streaks</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Complete recurring tasks consistently to build streaks! 🔥
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Top Streaks</h3>
            </div>

            <div className="space-y-3">
                {topStreaks.map((streak, index) => (
                    <StreakItem key={streak.taskId} streak={streak} rank={index + 1} />
                ))}
            </div>
        </div>
    );
};

const StreakItem: React.FC<{ streak: StreakInfo; rank: number }> = ({ streak, rank }) => {
    const badge = getStreakBadge(streak.currentStreak);

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            {/* Rank indicator */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    rank === 2 ? 'bg-gray-100 text-gray-600' :
                        rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-50 text-gray-500'
                }`}>
                {rank}
            </div>

            {/* Task info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {streak.taskTitle}
                    </span>
                    {badge && <span className="text-sm">{badge}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Current: <strong className="text-orange-600 dark:text-orange-400">{streak.currentStreak}</strong></span>
                    <span>Best: <strong>{streak.longestStreak}</strong></span>
                </div>
            </div>

            {/* Streak fire indicator */}
            {streak.currentStreak >= 3 && (
                <div className="flex items-center gap-0.5">
                    {[...Array(Math.min(streak.currentStreak, 5))].map((_, i) => (
                        <Flame
                            key={i}
                            className={`w-3 h-3 ${i < 3 ? 'text-orange-500' :
                                    i < 4 ? 'text-red-500' :
                                        'text-purple-500'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
