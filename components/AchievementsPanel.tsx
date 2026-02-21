import React, { useMemo } from 'react';
import { Task } from '../types';
import { evaluateAchievements, Achievement } from '../utils/achievementUtils';
import { Trophy } from 'lucide-react';

interface AchievementsPanelProps {
    tasks: Task[];
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ tasks }) => {
    const achievements = useMemo(() => evaluateAchievements(tasks), [tasks]);
    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" />
                    Achievements
                </h3>
                <span className="text-xs text-gray-400">{unlocked.length}/{achievements.length} unlocked</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                    style={{ width: `${(unlocked.length / achievements.length) * 100}%` }}
                />
            </div>

            {/* Unlocked achievements */}
            {unlocked.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Unlocked</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {unlocked.map(a => (
                            <AchievementBadge key={a.id} achievement={a} />
                        ))}
                    </div>
                </div>
            )}

            {/* Locked achievements */}
            {locked.length > 0 && (
                <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Locked</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {locked.map(a => (
                            <AchievementBadge key={a.id} achievement={a} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AchievementBadge: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    return (
        <div
            className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all
        ${achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border-yellow-200 dark:border-yellow-800 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                }`}
            title={`${achievement.title}: ${achievement.description}`}
        >
            <span className={`text-2xl mb-1 ${achievement.unlocked ? '' : 'grayscale'}`}>
                {achievement.icon}
            </span>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                {achievement.title}
            </span>
        </div>
    );
};
