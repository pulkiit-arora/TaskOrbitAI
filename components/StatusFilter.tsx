import React from 'react';
import { Status } from '../types';
import { Circle, Check, Zap, AlertCircle } from 'lucide-react';

interface StatusFilterProps {
    selectedStatuses: Status[];
    onChange: (statuses: Status[]) => void;
    className?: string;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({ selectedStatuses, onChange, className = '' }) => {
    const toggleStatus = (status: Status) => {
        if (selectedStatuses.includes(status)) {
            onChange(selectedStatuses.filter(s => s !== status));
        } else {
            onChange([...selectedStatuses, status]);
        }
    };

    const isSelected = (status: Status) => selectedStatuses.includes(status);

    // Helper to render pill
    const FilterPill = ({
        status,
        icon: Icon,
        label,
        activeClass,
        inactiveClass
    }: {
        status: Status;
        icon: React.ElementType;
        label: string;
        activeClass: string;
        inactiveClass: string;
    }) => (
        <button
            type="button"
            onClick={() => toggleStatus(status)}
            className={`inline-flex items-center gap-1.5 rounded-full border text-xs px-2.5 py-1 transition-all shadow-sm ${isSelected(status) ? activeClass : inactiveClass
                }`}
            title={`Filter by ${label}`}
        >
            <Icon size={12} className={isSelected(status) ? 'stroke-[2.5]' : 'stroke-2'} />
            <span className="hidden sm:inline font-medium">{label}</span>
        </button>
    );

    return (
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
            {/* 
        Divider between other filters and Status Filters? 
        The parent typically handles layout, but let's provide a visual separator if needed?
        No, let's keep this clean.
      */}
            <FilterPill
                status={Status.TODO}
                icon={Circle}
                label="Planned"
                activeClass="border-gray-400 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100"
                inactiveClass="border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
            />
            <FilterPill
                status={Status.IN_PROGRESS}
                icon={Zap}
                label="Active"
                activeClass="border-blue-400 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                inactiveClass="border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/10 dark:border-blue-800/50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            />
            <FilterPill
                status={Status.DONE}
                icon={Check}
                label="Completed"
                activeClass="border-green-400 bg-green-100 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
                inactiveClass="border-green-200 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/10 dark:border-green-800/50 dark:text-green-400 dark:hover:bg-green-900/20"
            />
            <FilterPill
                status={Status.EXPIRED}
                icon={AlertCircle}
                label="Missed"
                activeClass="border-orange-400 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300"
                inactiveClass="border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/10 dark:border-orange-800/50 dark:text-orange-400 dark:hover:bg-orange-900/20"
            />
        </div>
    );
};
