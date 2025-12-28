import React from 'react';
import { Button } from './Button';
import { SearchInput } from './SearchInput';
import { CheckSquare, Archive, Plus, Layout, Calendar, ChevronLeft, ChevronRight, Grid, Download, Upload, Filter } from 'lucide-react';
import { Task, Priority } from '../types';

type ViewMode = 'board' | 'week' | 'month';

interface AppHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentDate: Date;
  navigateDate: (direction: 'prev' | 'next' | 'today') => void;
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
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0 transition-colors duration-200 flex flex-col md:flex-row items-center justify-between sticky top-0 z-20 gap-4">
      {/* Logo & Primary Actions */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <CheckSquare size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent truncate">
              TaskOrbit AI
            </h1>  <p className="text-xs text-gray-500 mt-1">Personal Task Manager</p>
          </div>
        </div>

        {/* Mobile Archive Button */}
        <div className="flex gap-2 md:hidden">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive size={20} className={showArchived ? 'text-blue-600' : 'text-gray-500'} />
          </Button>
        </div>
      </div>

      {/* Center Section: View Switcher & Navigator */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto justify-center">
          <button
            onClick={() => setViewMode('board')}
            className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'board'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <Layout size={18} />
            <span className="inline">Board</span>
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'week'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <Grid size={18} />
            <span className="inline">Week</span>
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'month'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <Calendar size={18} />
            <span className="inline">Month</span>
          </button>
        </div>

        {viewMode !== 'board' && (
          <>
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm w-full sm:w-auto justify-between sm:justify-start">
              <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-lg border-r border-gray-100 dark:border-gray-700">
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center">
                <span className="px-4 text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[140px] text-center">
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
                </span>
              </div>
              <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-lg border-l border-gray-100 dark:border-gray-700">
                <ChevronRight size={18} />
              </button>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigateDate('today')}
              className="hidden sm:flex"
              title="Go to Today"
            >
              Today
            </Button>
          </>
        )}
      </div>

      {/* Right Section: Search & Actions */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        {/* Global Search Input */}
        <div className="w-full md:w-64">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search tasks..."
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          title={showArchived ? 'Hide Archived' : 'Show Archived'}
        >
          <Archive size={20} className={showArchived ? 'text-blue-600' : 'text-gray-500'} />
        </Button>
        <Button onClick={onAddTask} className="w-full md:w-auto justify-center">
          <Plus size={18} className="mr-2" />
          Add Task
        </Button>
      </div>
    </header >
  );
};
