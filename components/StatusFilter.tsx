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
                status={Status.INBOX}
                icon={Circle}
                label="Inbox"
                activeClass="border-blue-400 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                inactiveClass="border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/10 dark:border-blue-800/50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            />
            <FilterPill
                status={Status.NEXT_ACTION}
                icon={Zap}
                label="Next Actions"
                activeClass="border-yellow-400 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300"
                inactiveClass="border-yellow-200 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/50 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
            />
            <FilterPill
                status={Status.WAITING}
                icon={Circle}
                label="Waiting"
                activeClass="border-orange-400 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300"
                inactiveClass="border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/10 dark:border-orange-800/50 dark:text-orange-400 dark:hover:bg-orange-900/20"
            />
            <FilterPill
                status={Status.SOMEDAY}
                icon={Circle}
                label="Someday"
                activeClass="border-purple-400 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300"
                inactiveClass="border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/10 dark:border-purple-800/50 dark:text-purple-400 dark:hover:bg-purple-900/20"
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
                activeClass="border-red-400 bg-red-100 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                inactiveClass="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            />
        </div>
    );
};
