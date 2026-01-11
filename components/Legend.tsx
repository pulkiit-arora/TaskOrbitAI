import React from 'react';
import { ArrowUp, ArrowDown, Minus, RefreshCw, Info } from 'lucide-react';
import { DropdownMenu, DropdownHeader, DropdownItem } from './DropdownMenu';

export const Legend: React.FC = () => {
    return (
        <DropdownMenu
            icon={<Info size={16} />}
            label={<span className="hidden sm:inline">Legend</span>}
            className="text-gray-600 dark:text-gray-300"
            align="left"
        >
            <DropdownHeader>Priorities</DropdownHeader>
            <div className="px-4 py-2 text-sm flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <ArrowUp size={14} className="text-red-500" />
                    <span className="text-gray-700 dark:text-gray-200">High Priority</span>
                </div>
                <div className="flex items-center gap-2">
                    <Minus size={14} className="text-yellow-500" />
                    <span className="text-gray-700 dark:text-gray-200">Medium Priority</span>
                </div>
                <div className="flex items-center gap-2">
                    <ArrowDown size={14} className="text-blue-500" />
                    <span className="text-gray-700 dark:text-gray-200">Low Priority</span>
                </div>
            </div>

            <DropdownHeader>Types</DropdownHeader>
            <div className="px-4 py-2 text-sm flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-200">Recurring Task</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-orange-400"><RefreshCw size={14} className="stroke-[2.5]" /></span>
                    <span className="text-gray-700 dark:text-gray-200">Detached Exception</span>
                </div>
            </div>
        </DropdownMenu>
    );
};
