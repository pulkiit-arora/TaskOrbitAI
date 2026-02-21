import React, { useMemo } from 'react';
import { Task, Status } from '../types';

interface HeatmapPanelProps {
    tasks: Task[];
}

export const HeatmapPanel: React.FC<HeatmapPanelProps> = ({ tasks }) => {
    const { grid, maxCount, monthLabels } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build map of completions per day for the past 365 days
        const countMap: Record<string, number> = {};

        tasks.forEach(task => {
            if (task.status === Status.DONE || task.status === Status.EXPIRED) {
                const dateKey = task.completedAt
                    ? new Date(task.completedAt).toISOString().split('T')[0]
                    : task.dueDate
                        ? new Date(task.dueDate).toISOString().split('T')[0]
                        : null;
                if (dateKey) {
                    countMap[dateKey] = (countMap[dateKey] || 0) + 1;
                }
            }
        });

        // Generate grid: 53 columns × 7 rows
        const cells: { date: string; count: number; dayOfWeek: number }[] = [];
        let max = 0;

        // Start from 364 days ago
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 364);
        // Align to Sunday
        startDate.setDate(startDate.getDate() - startDate.getDay());

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().split('T')[0];
            const count = countMap[key] || 0;
            if (count > max) max = count;
            cells.push({ date: key, count, dayOfWeek: d.getDay() });
        }

        // Build week columns
        const weeks: typeof cells[] = [];
        let currentWeek: typeof cells = [];
        cells.forEach((cell, i) => {
            currentWeek.push(cell);
            if (cell.dayOfWeek === 6 || i === cells.length - 1) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        // Month labels
        const months: { label: string; col: number }[] = [];
        let lastMonth = -1;
        weeks.forEach((week, colIdx) => {
            const firstCell = week[0];
            if (firstCell) {
                const m = new Date(firstCell.date).getMonth();
                if (m !== lastMonth) {
                    months.push({
                        label: new Date(firstCell.date).toLocaleString(undefined, { month: 'short' }),
                        col: colIdx,
                    });
                    lastMonth = m;
                }
            }
        });

        return { grid: weeks, maxCount: max, monthLabels: months };
    }, [tasks]);

    const getColor = (count: number): string => {
        if (count === 0) return 'bg-gray-100 dark:bg-gray-700';
        const ratio = maxCount > 0 ? count / maxCount : 0;
        if (ratio <= 0.25) return 'bg-green-200 dark:bg-green-900';
        if (ratio <= 0.5) return 'bg-green-400 dark:bg-green-700';
        if (ratio <= 0.75) return 'bg-green-500 dark:bg-green-500';
        return 'bg-green-600 dark:bg-green-400';
    };

    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🟩 Productivity Heatmap
                <span className="text-xs font-normal text-gray-400">Past 12 months</span>
            </h3>

            <div className="overflow-x-auto">
                <div className="inline-flex flex-col gap-1" style={{ minWidth: 'max-content' }}>
                    {/* Month labels */}
                    <div className="flex gap-0.5 ml-8 mb-1">
                        {monthLabels.map((m, i) => (
                            <span
                                key={i}
                                className="text-[10px] text-gray-400 dark:text-gray-500"
                                style={{ position: 'relative', left: m.col * 13 - (i > 0 ? monthLabels[i - 1].col * 13 + 30 : 0) }}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-0.5">
                        {/* Day labels */}
                        <div className="flex flex-col gap-0.5 mr-1">
                            {dayLabels.map((label, i) => (
                                <div key={i} className="w-7 h-[11px] flex items-center justify-end pr-1">
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        {grid.map((week, colIdx) => (
                            <div key={colIdx} className="flex flex-col gap-0.5">
                                {Array.from({ length: 7 }, (_, rowIdx) => {
                                    const cell = week.find(c => c.dayOfWeek === rowIdx);
                                    if (!cell) return <div key={rowIdx} className="w-[11px] h-[11px]" />;
                                    return (
                                        <div
                                            key={rowIdx}
                                            className={`w-[11px] h-[11px] rounded-sm ${getColor(cell.count)} transition-colors`}
                                            title={`${cell.date}: ${cell.count} task${cell.count !== 1 ? 's' : ''} completed`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-1 mt-2 ml-8">
                        <span className="text-[10px] text-gray-400 mr-1">Less</span>
                        <div className="w-[11px] h-[11px] rounded-sm bg-gray-100 dark:bg-gray-700" />
                        <div className="w-[11px] h-[11px] rounded-sm bg-green-200 dark:bg-green-900" />
                        <div className="w-[11px] h-[11px] rounded-sm bg-green-400 dark:bg-green-700" />
                        <div className="w-[11px] h-[11px] rounded-sm bg-green-500 dark:bg-green-500" />
                        <div className="w-[11px] h-[11px] rounded-sm bg-green-600 dark:bg-green-400" />
                        <span className="text-[10px] text-gray-400 ml-1">More</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
