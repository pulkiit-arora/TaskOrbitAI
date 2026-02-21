import React, { useMemo } from 'react';
import { Task, Recurrence } from '../types';
import { doesTaskOccurOnDate } from '../utils/taskUtils';
import { Calendar } from 'lucide-react';

interface RecurrencePreviewProps {
    task: Partial<Task>;
}

export const RecurrencePreview: React.FC<RecurrencePreviewProps> = ({ task }) => {
    if (!task.recurrence || task.recurrence === Recurrence.NONE) return null;

    const months = useMemo(() => {
        const result: { month: Date; days: { date: Date; hasOccurrence: boolean }[] }[] = [];
        const today = new Date();

        for (let m = 0; m < 3; m++) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            const days: { date: Date; hasOccurrence: boolean }[] = [];

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
                let hasOccurrence = false;
                try {
                    hasOccurrence = doesTaskOccurOnDate(task as Task, date);
                } catch {
                    hasOccurrence = false;
                }
                days.push({ date, hasOccurrence });
            }

            result.push({ month: monthDate, days });
        }

        return result;
    }, [task.recurrence, task.recurrenceInterval, task.recurrenceWeekdays,
    task.recurrenceMonthDay, task.dueDate, task.recurrenceStart]);

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} className="text-blue-500" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recurrence Preview
                </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {months.map((m, idx) => (
                    <MiniMonth key={idx} month={m.month} days={m.days} />
                ))}
            </div>
        </div>
    );
};

const MiniMonth: React.FC<{
    month: Date;
    days: { date: Date; hasOccurrence: boolean }[];
}> = ({ month, days }) => {
    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div>
            <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1 text-center">
                {month.toLocaleString(undefined, { month: 'short', year: 'numeric' })}
            </p>
            <div className="grid grid-cols-7 gap-px">
                {dayNames.map((d, i) => (
                    <div key={i} className="text-[8px] text-gray-400 text-center">{d}</div>
                ))}
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {days.map((d, i) => {
                    const isToday = d.date.getTime() === today.getTime();
                    return (
                        <div
                            key={i}
                            className={`w-4 h-4 flex items-center justify-center rounded-full relative
                ${isToday ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                        >
                            <span className="text-[8px] text-gray-500 dark:text-gray-400">{d.date.getDate()}</span>
                            {d.hasOccurrence && (
                                <div className="absolute bottom-0 w-1 h-1 rounded-full bg-blue-500" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
