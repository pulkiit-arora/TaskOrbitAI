import React, { useMemo } from 'react';
import { Task } from '../types';
import { calculateXP } from '../utils/xpUtils';
import { Zap } from 'lucide-react';

interface XPBarProps {
    tasks: Task[];
}

export const XPBar: React.FC<XPBarProps> = ({ tasks }) => {
    const xp = useMemo(() => calculateXP(tasks), [tasks]);

    return (
        <div className="hidden md:flex items-center gap-2" title={`${xp.totalXP} total XP`}>
            <div className="flex items-center gap-1.5">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded text-white">
                    <Zap size={10} />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Lv.{xp.level}</span>
            </div>
            <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-700"
                    style={{ width: `${xp.progress * 100}%` }}
                />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden lg:inline">{xp.title}</span>
        </div>
    );
};
