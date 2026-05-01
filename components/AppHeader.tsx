import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { SearchInput } from './SearchInput';
import { CheckSquare, Archive, Plus, Layout, Calendar, ChevronLeft, ChevronRight, Grid, Download, Upload, Filter, BarChart2, ClipboardList, Crosshair } from 'lucide-react';
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

    <header className="glass px-4 py-3 flex-shrink-0 transition-all duration-300 sticky top-0 z-30 shadow-sm border-b border-white/20 dark:border-gray-700/30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative min-h-[50px]">

        {/* Left Section: View Switcher & Date Nav */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-shrink-0 z-10">
          <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-xl max-w-full overflow-x-auto custom-scrollbar justify-start sm:justify-center shadow-inner">
            <button
              onClick={() => setViewMode('today')}
              className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${viewMode === 'today'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <CheckSquare size={18} />
              <span className="hidden xl:inline">Today</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${viewMode === 'week'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <Grid size={18} />
              <span className="hidden xl:inline">Week</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${viewMode === 'month'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <Calendar size={18} />
              <span className="hidden xl:inline">Month</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${viewMode === 'board'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <Layout size={18} />
              <span className="hidden xl:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${viewMode === 'analytics'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <BarChart2 size={18} />
              <span className="hidden xl:inline">Analytics</span>
            </button>
            <button
              onClick={() => setViewMode('planner')}
              className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${viewMode === 'planner'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <ClipboardList size={18} />
              <span className="hidden xl:inline">Planner</span>
            </button>
            <button
              onClick={() => setViewMode('eisenhower')}
              className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${viewMode === 'eisenhower'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <Crosshair size={18} />
              <span className="hidden xl:inline">Matrix</span>
            </button>
          </div>

          {(viewMode === 'week' || viewMode === 'month') && (
            <div className="flex items-center bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-sm w-full sm:w-auto justify-between sm:justify-start relative backdrop-blur-md">
              <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-xl border-r border-gray-200/50 dark:border-gray-700/50 transition-colors">
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

              <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-xl border-l border-gray-200/50 dark:border-gray-700/50 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {(viewMode === 'week' || viewMode === 'month') && (
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
          {viewMode !== 'analytics' && (
            <div className="w-full md:w-48 lg:w-64">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search..."
              />
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? 'Hide Archived' : 'Show Archived'}
            className="flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full w-10 h-10 p-0 flex items-center justify-center transition-all duration-200"
          >
            <Archive size={20} className={showArchived ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'} />
          </Button>

          <Button onClick={onAddTask} className="w-auto justify-center flex-shrink-0 shadow-glow hover:scale-105 transition-transform duration-200 bg-primary-600 hover:bg-primary-700 text-white rounded-xl">
            <Plus size={18} className="mr-2" />
            <span className="hidden sm:inline font-semibold">Add Task</span>
            <span className="inline sm:hidden font-semibold">Add</span>
          </Button>
        </div>
      </div>
    </header >
  );
};
