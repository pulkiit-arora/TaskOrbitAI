import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateNavigatorProps {
    currentDate: Date;
    onDateSelect: (date: Date) => void;
    onClose: () => void;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({ currentDate, onDateSelect, onClose }) => {
    const [viewYear, setViewYear] = useState(currentDate.getFullYear());

    const tempDate = new Date();
    const currentYear = tempDate.getFullYear();
    const currentMonth = tempDate.getMonth();

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(currentDate);
        newDate.setFullYear(viewYear);
        newDate.setMonth(monthIndex);
        // Keep day as is unless it exceeds month length, forcing it to last valid day
        // Actually best to set to 1st of month to avoid overflow if current is 31st and target is Feb
        newDate.setDate(1);
        onDateSelect(newDate);
        onClose();
    };

    const handleToday = () => {
        onDateSelect(new Date());
        onClose();
    };

    return (
        <div className="p-4 w-72">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => setViewYear(prev => prev - 1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{viewYear}</span>
                <button
                    onClick={() => setViewYear(prev => prev + 1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                {months.map((month, index) => {
                    const isCurrentMonth = viewYear === currentYear && index === currentMonth;
                    const isSelectedMonth = viewYear === currentDate.getFullYear() && index === currentDate.getMonth();

                    return (
                        <button
                            key={month}
                            onClick={() => handleMonthSelect(index)}
                            className={`
                        p-2 text-sm rounded-lg transition-colors
                        ${isSelectedMonth
                                    ? 'bg-blue-600 text-white'
                                    : isCurrentMonth
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }
                    `}
                        >
                            {month.slice(0, 3)}
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleToday}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                    Go to Today
                </button>
                <button
                    onClick={onClose}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
