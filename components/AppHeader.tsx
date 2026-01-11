import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { SearchInput } from './SearchInput';
import { CheckSquare, Archive, Plus, Layout, Calendar, ChevronLeft, ChevronRight, Grid, Download, Upload, Filter } from 'lucide-react';
import { Task, Priority, ViewMode } from '../types';
import { DateNavigator } from './DateNavigator';


interface AppHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentDate: Date;
  navigateDate: (arg: 'prev' | 'next' | 'today' | Date) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  onAddTask: () => void;
  tasks: Task[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  viewMode,
  setViewMode,
  currentDate,
  navigateDate,
  showArchived,
  setShowArchived,
  onAddTask,
  tasks,
  searchQuery,
  setSearchQuery
}) => {
  const [isDateNavOpen, setIsDateNavOpen] = useState(false);
  const dateNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateNavRef.current && !dateNavRef.current.contains(event.target as Node)) {
        setIsDateNavOpen(false);
      }
    };
    if (isDateNavOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDateNavOpen]);

  return (

    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0 transition-colors duration-200 sticky top-0 z-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative min-h-[50px]">

        {/* Left Section: View Switcher & Date Nav */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-shrink-0 z-10">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto justify-center">
            <button
              onClick={() => setViewMode('today')}
              className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'today'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <CheckSquare size={18} />
              <span className="hidden xl:inline">Today</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'week'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Grid size={18} />
              <span className="hidden xl:inline">Week</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'month'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Calendar size={18} />
              <span className="hidden xl:inline">Month</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'board'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Layout size={18} />
              <span className="hidden xl:inline">Board</span>
            </button>
          </div>

          {(viewMode !== 'board' && viewMode !== 'today') && (
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm w-full sm:w-auto justify-between sm:justify-start relative">
              <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-lg border-r border-gray-100 dark:border-gray-700">
                <ChevronLeft size={18} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsDateNavOpen(!isDateNavOpen)}
                  className="px-3 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[120px] text-center whitespace-nowrap hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {viewMode === 'month'
                    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : (() => {
                      const d = new Date(currentDate);
                      const day = d.getDay();
                      const diff = d.getDate() - day;
                      const startOfWeek = new Date(d.setDate(diff));
                      return `Week of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                    })()
                  }
                </button>

                {isDateNavOpen && (
                  <div ref={dateNavRef} className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                    <DateNavigator
                      currentDate={currentDate}
                      onDateSelect={navigateDate}
                      onClose={() => setIsDateNavOpen(false)}
                    />
                  </div>
                )}
              </div>

              <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-lg border-l border-gray-100 dark:border-gray-700">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {(viewMode !== 'board' && viewMode !== 'today') && (
            <Button
              variant="secondary"
              onClick={() => navigateDate('today')}
              className="hidden xl:flex"
              title="Go to Today"
            >
              Today
            </Button>
          )}
        </div>

        {/* Right Section: Search & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-shrink-0 z-10">
          <div className="w-full md:w-48 lg:w-64">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search..."
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? 'Hide Archived' : 'Show Archived'}
            className="flex-shrink-0"
          >
            <Archive size={20} className={showArchived ? 'text-blue-600' : 'text-gray-500'} />
          </Button>

          <Button onClick={onAddTask} className="w-auto justify-center flex-shrink-0">
            <Plus size={18} className="mr-2" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="inline sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </header >
  );
};
