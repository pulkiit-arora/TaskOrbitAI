import React from 'react';
import { Task, Priority, Recurrence, Status } from '../types';
import { formatRecurrenceSummary } from '../utils/taskUtils';
import Tooltip from './Tooltip';
import { CommentPopover } from './CommentPopover';
import { Calendar, RefreshCw, MoreVertical, Archive, ArrowRight, ArrowLeft, Trash2, ArrowUp, ArrowDown, Minus, MessageSquare, Check, Circle, XCircle } from 'lucide-react';

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
  completedCount?: number;
  missedCount?: number;
  onToggleDone?: (id: string) => void;
  compactPriority?: boolean;
  layoutMode?: 'default' | 'sidebar';
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onMove,
  onArchive,
  onDelete,
  isVirtual = false,
  showFutureIndicator = false,
  showStrikethrough = true,
  hideMoveButtons = false,
  completedCount,
  missedCount,
  onToggleDone,
  compactPriority = false,
  layoutMode = 'default'
}) => {
  const priorityColor = {
    [Priority.HIGH]: 'bg-red-100 text-red-800 border-red-200',
    [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [Priority.LOW]: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const isOverdue = !isVirtual && task.dueDate && new Date(task.dueDate) < new Date() && task.status !== Status.DONE && task.status !== Status.ARCHIVED && task.status !== Status.EXPIRED;
  const isDone = task.status === Status.DONE;
  const isExpired = task.status === Status.EXPIRED;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleDone) {
      onToggleDone(task.id);
    }
  };

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

  const SidebarLayout = () => (
    <div className="flex w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 overflow-hidden min-h-[88px]">
      {/* Left Indicator Column */}
      <div className={`w-8 flex flex-col items-center justify-between py-2 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-700 ${task.priority === Priority.HIGH ? 'bg-red-50/20' : task.priority === Priority.MEDIUM ? 'bg-yellow-50/20' : 'bg-blue-50/20'}`}>
        {/* Priority (Top) */}
        <div title={`${task.priority} Priority`}>
          {task.priority === Priority.HIGH && <ArrowUp size={14} className="text-red-500" strokeWidth={3} />}
          {task.priority === Priority.MEDIUM && <Minus size={14} className="text-yellow-500" strokeWidth={3} />}
          {task.priority === Priority.LOW && <ArrowDown size={14} className="text-blue-500" strokeWidth={3} />}
        </div>

        {/* Checkbox (Middle) */}
        {onToggleDone && (
          <button
            onClick={handleToggle}
            onMouseDown={handleButtonMouseDown}
            className={`transition-colors flex items-center justify-center p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${isDone ? 'text-green-500' : 'text-gray-300 hover:text-green-500'} ${isExpired ? 'text-orange-500' : ''}`}
          >
            {isDone ? <Check size={16} className="stroke-[3]" /> : (isExpired ? <XCircle size={16} /> : <Circle size={16} />)}
          </button>
        )}

        {/* Delete/Action (Bottom) */}
        {!isVirtual && (
          <button
            onClick={(e) => handleButtonClick(e, () => onDelete(task.id))}
            onMouseDown={handleButtonMouseDown}
            className="text-gray-300 hover:text-red-500 transition-colors p-1"
            title="Delete Task"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Right Content Column */}
      <div className="flex-1 p-2 min-w-0 flex flex-col justify-center">
        <div className="flex items-start gap-2 h-full">
          <div className="flex-1 min-w-0">
            <h3
              className={`font-medium text-sm text-gray-800 dark:text-gray-100 leading-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 ${isDone || isExpired ? 'line-through text-gray-500' : ''}`}
              onClick={(e) => handleButtonClick(e, () => onEdit(task))}
              onMouseDown={handleButtonMouseDown}
            >
              <span className="line-clamp-2 break-words text-left">{task.title}</span>
              {/* Recurrence Stats Pills */}
              {task.recurrence !== Recurrence.NONE && (
                <div className="flex gap-1 flex-shrink-0 ml-1">
                  {completedCount !== undefined && completedCount > 0 && (
                    <Tooltip content={`${completedCount} completion${completedCount === 1 ? '' : 's'} so far`}>
                      <span className="flex items-center gap-0.5 text-[9px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1 py-0.5 rounded border border-green-100 dark:border-green-800">
                        <span className="font-bold">{completedCount}</span>
                        <span className="text-[8px] uppercase opacity-80">D</span>
                      </span>
                    </Tooltip>
                  )}
                  {missedCount !== undefined && missedCount > 0 && (
                    <Tooltip content={`${missedCount} time${missedCount === 1 ? '' : 's'} missed`}>
                      <span className="flex items-center gap-0.5 text-[9px] bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1 py-0.5 rounded border border-orange-100 dark:border-orange-800">
                        <span className="font-bold">{missedCount}</span>
                        <span className="text-[8px] uppercase opacity-80">M</span>
                      </span>
                    </Tooltip>
                  )}
                </div>
              )}
              {task.recurrence !== Recurrence.NONE && !task.isRecurringException && (
                <Tooltip content={formatRecurrenceSummary(task)}>
                  <RefreshCw size={10} className="text-purple-400 flex-shrink-0" />
                </Tooltip>
              )}
              {task.isRecurringException && (
                <Tooltip content={`Detached from series: ${formatRecurrenceSummary(task)}`}>
                  <RefreshCw size={10} className="text-orange-400 flex-shrink-0 stroke-[2.5]" />
                </Tooltip>
              )}
              {task.comments && task.comments.length > 0 && (
                <CommentPopover comments={task.comments}>
                  <MessageSquare size={10} className="text-gray-400 flex-shrink-0 cursor-pointer hover:text-blue-600 transition-colors" />
                </CommentPopover>
              )}
            </h3>

            {/* Footer Row: Date & Tags */}
            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
              {task.dueDate && (
                <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-500' : ''}`}>
                  <Calendar size={10} />
                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                </span>
              )}
              {task.tags && task.tags.length > 0 && (
                <div className="flex gap-1">
                  {task.tags.map(tag => (
                    <div key={tag.id} className={`w-1.5 h-1.5 rounded-full ${tag.color.split(' ')[0].replace('100', '400')}`} title={tag.label} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DefaultLayout = () => (
    <div
      draggable={!isVirtual && task.status !== Status.ARCHIVED}
      onDragStart={handleDragStart}
      className={`group relative bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200
        ${!isVirtual ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        ${task.status === Status.ARCHIVED ? 'opacity-75' : ''}
      `}
    >
      <div className="flex gap-2">
        {onToggleDone && (
          <button
            onClick={handleToggle}
            onMouseDown={handleButtonMouseDown}
            className={`flex-shrink-0 mt-0.5 transition-colors 
              ${isDone ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}
              ${isExpired ? 'text-orange-500' : ''}`}
          >
            {isDone ? <Check size={20} className="stroke-[3]" /> : (isExpired ? <XCircle size={20} /> : <Circle size={20} />)}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold text-gray-800 dark:text-gray-100 mb-1 leading-tight transition-colors duration-200 cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5`}
            onClick={(e) => handleButtonClick(e, () => onEdit(task))}
            onMouseDown={handleButtonMouseDown}
          >
            <span className={`flex items-center gap-2 flex-1 ${showStrikethrough && (task.status === 'DONE' || task.status === 'EXPIRED') ? 'line-through text-gray-500' : ''}`}>
              {task.priority === Priority.HIGH && (
                <span className={`flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 ${compactPriority ? 'px-1' : ''}`} title="High Priority">
                  <ArrowUp size={12} strokeWidth={2.5} /> {!compactPriority && "High"}
                </span>
              )}
              {task.priority === Priority.MEDIUM && (
                <span className={`flex items-center gap-1 text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-400 ${compactPriority ? 'px-1' : ''}`} title="Medium Priority">
                  <Minus size={12} strokeWidth={2.5} /> {!compactPriority && "Medium"}
                </span>
              )}
              {task.priority === Priority.LOW && (
                <span className={`flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400 ${compactPriority ? 'px-1' : ''}`} title="Low Priority">
                  <ArrowDown size={12} strokeWidth={2.5} /> {!compactPriority && "Low"}
                </span>
              )}
              <span className="flex-1 font-semibold text-sm truncate">{task.title}</span>
            </span>

            {/* Recurrence Stats Pills */}
            {task.recurrence !== Recurrence.NONE && (
              <div className="flex gap-1 flex-shrink-0">
                {completedCount !== undefined && completedCount > 0 && (
                  <Tooltip content={`${completedCount} completion${completedCount === 1 ? '' : 's'} so far`}>
                    <span className="flex items-center gap-1 text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800">
                      <span className="font-bold">{completedCount}</span>
                      <span className="text-[9px] uppercase opacity-80">Done</span>
                    </span>
                  </Tooltip>
                )}
                {missedCount !== undefined && missedCount > 0 && (
                  <Tooltip content={`${missedCount} time${missedCount === 1 ? '' : 's'} missed`}>
                    <span className="flex items-center gap-1 text-[10px] bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-800">
                      <span className="font-bold">{missedCount}</span>
                      <span className="text-[9px] uppercase opacity-80">Miss</span>
                    </span>
                  </Tooltip>
                )}
              </div>
            )}

            {task.recurrence !== Recurrence.NONE && !task.isRecurringException && (
              <Tooltip content={formatRecurrenceSummary(task)}>
                <span className="text-gray-400 flex-shrink-0">
                  <RefreshCw size={14} />
                </span>
              </Tooltip>
            )}
            {task.isRecurringException && (
              <Tooltip content={`Detached from series: ${formatRecurrenceSummary(task)}`}>
                <span className="text-orange-400 flex-shrink-0">
                  <RefreshCw size={14} className="stroke-[2.5]" />
                </span>
              </Tooltip>
            )}
            {task.comments && task.comments.length > 0 && (
              <CommentPopover comments={task.comments}>
                <span className="ml-2 text-gray-400 flex items-center gap-1 text-xs hover:text-blue-600 transition-colors bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded-full border border-gray-100 dark:border-gray-700">
                  <MessageSquare size={12} />
                  <span className="text-[10px] font-medium">{task.comments.length}</span>
                </span>
              </CommentPopover>
            )}
            {showFutureIndicator && <span className="ml-2 text-[10px] font-normal text-gray-400 bg-gray-100 px-1 rounded flex-shrink-0">(Future)</span>}
          </h3>
          {/* recurrence summary shown on hover tooltip only */}

          {task.description && (
            <p className={`text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-3 mt-1 pointer-events-none ${showStrikethrough && (task.status === 'DONE' || task.status === 'EXPIRED') ? 'line-through' : ''}`}>
              {task.description}
            </p>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 mt-2">
              {task.tags.map(tag => (
                <span key={tag.id} className={`text-xs px-2 py-1 rounded-md border font-medium ${tag.color} opacity-90`}>
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

  return layoutMode === 'sidebar' ? <SidebarLayout /> : <DefaultLayout />;
};