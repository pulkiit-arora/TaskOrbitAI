import React from 'react';
import { ArrowUp, ArrowDown, Minus, RefreshCw } from 'lucide-react';

export const Legend: React.FC = () => {
    return (
        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1" title="High Priority">
                <ArrowUp size={10} className="text-red-500" />
                <span className="hidden lg:inline">High</span>
            </div>
            <div className="flex items-center gap-1" title="Medium Priority">
                <Minus size={10} className="text-yellow-500" />
                <span className="hidden lg:inline">Med</span>
            </div>
            <div className="flex items-center gap-1" title="Low Priority">
                <ArrowDown size={10} className="text-blue-500" />
                <span className="hidden lg:inline">Low</span>
            </div>
            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-1" title="Recurring Series">
                <RefreshCw size={10} className="text-gray-400" />
                <span className="hidden lg:inline">Recurring</span>
            </div>
            <div className="flex items-center gap-1" title="Detached Exception">
                <span className="text-orange-400"><RefreshCw size={10} className="stroke-[2.5]" /></span>
                <span className="hidden lg:inline">Detached</span>
            </div>
        </div>
    );
};
