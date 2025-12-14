import React from 'react';
import { Button } from './Button';
import { SearchInput } from './SearchInput';
import { CheckSquare, Archive, Plus, Layout, Calendar, ChevronLeft, ChevronRight, Grid, Download, Upload } from 'lucide-react';
import { Task } from '../types';

type ViewMode = 'board' | 'week' | 'month';

interface AppHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentDate: Date;
  navigateDate: (direction: 'prev' | 'next') => void;
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
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-20 gap-4">
      {/* Logo & Primary Actions */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <CheckSquare size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">TaskOrbit AI</h1>
            <p className="text-xs text-gray-500 mt-1">Personal Task Manager</p>
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
            className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'board' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Layout size={18} />
            <span className="inline">Board</span>
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Grid size={18} />
            <span className="inline">Week</span>
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Calendar size={18} />
            <span className="inline">Month</span>
          </button>
        </div>

        {viewMode !== 'board' && (
          <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm w-full sm:w-auto justify-between sm:justify-start">
            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-50 text-gray-700 rounded-l-lg border-r border-gray-100">
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 text-sm font-semibold text-gray-800 min-w-[140px] text-center">
              {viewMode === 'month'
                ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              }
            </span>
            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-50 text-gray-700 rounded-r-lg border-l border-gray-100">
              <ChevronRight size={18} />
            </button>
          </div>
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
    </header>
  );
};

