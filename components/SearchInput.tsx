import React, { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Task } from '../types';

interface SearchInputProps {
  tasks: Task[];
  onSearchResults: (results: Task[]) => void;
 placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  tasks,
  onSearchResults,
  placeholder = "Search tasks...",
  className = ""
}) => {
  const [query, setQuery] = useState('');

  const filteredTasks = useMemo(() => {
    if (!query.trim()) {
      return tasks;
    }

    const lowercaseQuery = query.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(lowercaseQuery) ||
      task.description.toLowerCase().includes(lowercaseQuery)
    );
  }, [tasks, query]);

  useEffect(() => {
    onSearchResults(filteredTasks);
  }, [filteredTasks, onSearchResults]);

  const clearSearch = () => {
    setQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query.trim() && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>
      
      {query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-3 z-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {filteredTasks.length} of {tasks.length} tasks
            </span>
            {filteredTasks.length === 0 && (
              <span className="text-gray-400 text-xs">No results found</span>
            )}
            {filteredTasks.length > 0 && (
              <span className="text-green-600 text-xs">
                {filteredTasks.length === 1 ? '1 result' : `${filteredTasks.length} results`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
