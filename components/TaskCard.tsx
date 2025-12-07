import React from 'react';
import { Task, Priority, Recurrence } from '../types';
import { Calendar, RefreshCw, MoreVertical, Archive, ArrowRight, ArrowLeft, Trash2, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onMove: (taskId: string, direction: 'prev' | 'next') => void;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isVirtual?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onMove, onArchive, onDelete, isVirtual = false }) => {
  const priorityColor = {
    [Priority.HIGH]: 'bg-red-100 text-red-800 border-red-200',
    [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [Priority.LOW]: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const isOverdue = !isVirtual && task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'ARCHIVED';

  const handleDragStart = (e: React.DragEvent) => {
    if (isVirtual) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Crucial: Stop propagation on mouse down so the draggable parent doesn't intercept the click
  const handleButtonMouseDown = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  // Removed preventDefault() to ensure click events fire reliably on all browsers
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div 
      draggable={!isVirtual && task.status !== 'ARCHIVED'}
      onDragStart={handleDragStart}
      className={`group relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200
        ${!isVirtual ? 'cursor-grab active:cursor-grabbing' : 'opacity-60 border-dashed'}
        ${task.status === 'ARCHIVED' ? 'opacity-75' : ''}
      `}
    >
      <h3 
        className={`font-semibold text-gray-800 mb-1 leading-tight transition-colors duration-200 cursor-pointer group-hover:text-blue-600 flex items-center gap-1.5`} 
        onClick={(e) => handleButtonClick(e, () => onEdit(task))}
        onMouseDown={handleButtonMouseDown}
      >
        {task.priority === Priority.HIGH && (
          <ArrowUp 
            size={14} 
            className="text-red-500 flex-shrink-0" 
            title={`Priority: ${task.priority}`}
          />
        )}
        {task.priority === Priority.MEDIUM && (
          <Minus 
            size={14} 
            className="text-yellow-500 flex-shrink-0" 
            title={`Priority: ${task.priority}`}
          />
        )}
        {task.priority === Priority.LOW && (
          <ArrowDown 
            size={14} 
            className="text-blue-500 flex-shrink-0" 
            title={`Priority: ${task.priority}`}
          />
        )}
        <span className="flex-1">{task.title}</span>
        {task.recurrence !== Recurrence.NONE && (
          <span className="text-gray-400 flex-shrink-0" title={`Recurs ${task.recurrence}`}>
            <RefreshCw size={14} />
          </span>
        )}
        {isVirtual && <span className="ml-2 text-[10px] font-normal text-gray-400 bg-gray-100 px-1 rounded flex-shrink-0">(Future)</span>}
      </h3>
      
      {task.description && (
        <p className="text-gray-500 text-xs line-clamp-2 mb-3 pointer-events-none">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar size={12} />
              <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 relative z-10">
          {/* Controls - show edit button for all tasks, other controls only for non-virtual */}
          {!isVirtual && task.status !== 'TODO' && task.status !== 'ARCHIVED' && (
            <button 
              type="button"
              onMouseDown={handleButtonMouseDown}
              onPointerDown={handleButtonMouseDown}
              onClick={(e) => handleButtonClick(e, () => onMove(task.id, 'prev'))}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors duration-150 cursor-pointer" 
              title="Move Back"
            >
              <ArrowLeft size={14} className="pointer-events-none" />
            </button>
          )}
          
          <button 
            type="button"
            onMouseDown={handleButtonMouseDown}
            onPointerDown={handleButtonMouseDown}
            onClick={(e) => handleButtonClick(e, () => onEdit(task))}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors duration-150 cursor-pointer" 
            title="Edit"
          >
            <MoreVertical size={14} className="pointer-events-none" />
          </button>

          {!isVirtual && task.status !== 'DONE' && task.status !== 'ARCHIVED' && (
            <button 
              type="button"
              onMouseDown={handleButtonMouseDown}
              onPointerDown={handleButtonMouseDown}
              onClick={(e) => handleButtonClick(e, () => onMove(task.id, 'next'))}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors duration-150 cursor-pointer" 
              title="Move Forward"
            >
              <ArrowRight size={14} className="pointer-events-none" />
            </button>
          )}
          
          {!isVirtual && task.status === 'DONE' && (
            <button 
              type="button"
              onMouseDown={handleButtonMouseDown}
              onPointerDown={handleButtonMouseDown}
              onClick={(e) => handleButtonClick(e, () => onArchive(task.id))}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors duration-150 cursor-pointer" 
              title="Archive"
            >
              <Archive size={14} className="pointer-events-none" />
            </button>
          )}

          {!isVirtual && (
            <button 
              type="button"
              onMouseDown={handleButtonMouseDown}
              onPointerDown={handleButtonMouseDown}
              onClick={(e) => handleButtonClick(e, () => onDelete(task.id))}
              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors duration-150 cursor-pointer" 
              title="Delete"
            >
              <Trash2 size={14} className="pointer-events-none" />
            </button>
          )}
        </div>
      </div>
      
      {isOverdue && (
        <div className="absolute top-[-4px] right-[-4px]">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}
    </div>
  );
};