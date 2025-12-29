import React from 'react';
import { Task, Priority, Recurrence } from '../types';
import { formatRecurrenceSummary } from '../utils/taskUtils';
import Tooltip from './Tooltip';
import { CommentPopover } from './CommentPopover';
import { Calendar, RefreshCw, MoreVertical, Archive, ArrowRight, ArrowLeft, Trash2, ArrowUp, ArrowDown, Minus, MessageSquare } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onMove: (taskId: string, direction: 'prev' | 'next') => void;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isVirtual?: boolean;
  showFutureIndicator?: boolean;
  showStrikethrough?: boolean;
  hideMoveButtons?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onMove, onArchive, onDelete, isVirtual = false, showFutureIndicator = false, showStrikethrough = true, hideMoveButtons = false }) => {
  const priorityColor = {
    [Priority.HIGH]: 'bg-red-100 text-red-800 border-red-200',
    [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [Priority.LOW]: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const isOverdue = !isVirtual && task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'ARCHIVED' && task.status !== 'EXPIRED';

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
      className={`group relative bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200
        ${!isVirtual ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        ${task.status === 'ARCHIVED' ? 'opacity-75' : ''}
      `}
    >
      <h3
        className={`font-semibold text-gray-800 dark:text-gray-100 mb-1 leading-tight transition-colors duration-200 cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5`}
        onClick={(e) => handleButtonClick(e, () => onEdit(task))}
        onMouseDown={handleButtonMouseDown}
      >
        <span className={`flex items-center gap-1.5 flex-1 ${showStrikethrough && task.status === 'DONE' ? 'line-through text-gray-500' : ''}`}>
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
        </span>
        {task.recurrence !== Recurrence.NONE && (
          <Tooltip content={formatRecurrenceSummary(task)}>
            <span className="text-gray-400 flex-shrink-0">
              <RefreshCw size={14} />
            </span>
          </Tooltip>
        )}
        {task.isRecurringException && (
          <Tooltip content="This task is detached from its recurrence series">
            <span className="text-orange-400 flex-shrink-0">
              <RefreshCw size={14} className="stroke-[2.5]" />
            </span>
          </Tooltip>
        )}
        {task.comments && task.comments.length > 0 && (
          <CommentPopover comments={task.comments}>
            <span className="ml-2 text-gray-400 flex items-center gap-1 text-xs hover:text-blue-600 transition-colors">
              <MessageSquare size={14} />
              <span className="text-[11px]">{task.comments.length}</span>
            </span>
          </CommentPopover>
        )}
        {showFutureIndicator && <span className="ml-2 text-[10px] font-normal text-gray-400 bg-gray-100 px-1 rounded flex-shrink-0">(Future)</span>}
      </h3>
      {/* recurrence summary shown on hover tooltip only */}

      {task.description && (
        <p className={`text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-3 pointer-events-none ${showStrikethrough && task.status === 'DONE' ? 'line-through' : ''}`}>
          {task.description}
        </p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map(tag => (
            <span key={tag.id} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tag.color}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
              <Calendar size={12} />
              <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 relative z-10">
          {/* Controls - show edit button for all tasks, other controls only for non-virtual */}
          {!isVirtual && !hideMoveButtons && task.status !== 'TODO' && task.status !== 'ARCHIVED' && (
            <button
              type="button"
              onMouseDown={handleButtonMouseDown}
              onPointerDown={handleButtonMouseDown}
              onClick={(e) => handleButtonClick(e, () => onMove(task.id, 'prev'))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 transition-colors duration-150 cursor-pointer"
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
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 transition-colors duration-150 cursor-pointer"
            title="Edit"
          >
            <MoreVertical size={14} className="pointer-events-none" />
          </button>

          {!isVirtual && !hideMoveButtons && task.status !== 'DONE' && task.status !== 'ARCHIVED' && (
            <button
              type="button"
              onMouseDown={handleButtonMouseDown}
              onPointerDown={handleButtonMouseDown}
              onClick={(e) => handleButtonClick(e, () => onMove(task.id, 'next'))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 transition-colors duration-150 cursor-pointer"
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
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 transition-colors duration-150 cursor-pointer"
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
              className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150 cursor-pointer"
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