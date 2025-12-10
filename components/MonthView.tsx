import React from 'react';
import { Task, Priority, Status, Recurrence } from '../types';
import { isNthWeekdayOfMonth } from '../utils/taskUtils';
import { Check, Circle, Plus, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onToggleDone: (taskId: string, onDate?: string) => void;
  onAddTask?: (date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({ currentDate, tasks, onEditTask, onToggleDone, onAddTask }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Create array for empty cells before start of month
  const blanks = Array(firstDay).fill(null);
  
  // Create array of day numbers
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Combine logic
  let totalSlots = [...blanks, ...days];
  
  // Fill remaining slots to complete the week rows (so grid looks complete)
  const remainingSlots = 7 - (totalSlots.length % 7);
  if (remainingSlots < 7) {
      totalSlots = [...totalSlots, ...Array(remainingSlots).fill(null)];
  }

  // Summary: overdue and due-this-week (relative to the week of currentDate)
  const today = new Date();
  today.setHours(0,0,0,0);
  const weekStart = new Date(currentDate);
  weekStart.setHours(0,0,0,0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23,59,59,999);

  const isOpen = (t: Task) => t.status !== Status.DONE && t.status !== Status.ARCHIVED;
  const overdueTasks = tasks.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today);
  const dueThisWeekTasks = tasks.filter(t => {
    if (!t.dueDate || !isOpen(t)) return false;
    const d = new Date(t.dueDate);
    d.setHours(0,0,0,0);
    return d >= weekStart && d <= weekEnd;
  });
  const missingDueTasks = tasks.filter(t => !t.dueDate && isOpen(t));

  // Filter mode for Month view
  const [filterMode, setFilterMode] = React.useState<'all' | 'overdue' | 'week' | 'nodue'>('all');
  const toggleOverdue = () => setFilterMode(m => (m === 'overdue' ? 'all' : 'overdue'));
  const toggleWeek = () => setFilterMode(m => (m === 'week' ? 'all' : 'week'));
  const toggleNoDue = () => setFilterMode(m => (m === 'nodue' ? 'all' : 'nodue'));

  const doesTaskOccurOnDate = (task: Task, date: Date): boolean => {
      const checkDate = new Date(date);
      checkDate.setHours(0,0,0,0);
      
      const startAnchor = task.recurrenceStart 
        ? new Date(task.recurrenceStart) 
        : (task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt));
      startAnchor.setHours(0,0,0,0);

      let endAnchor: Date | null = null;
      if (task.recurrenceEnd) {
          endAnchor = new Date(task.recurrenceEnd);
          endAnchor.setHours(23,59,59,999);
      }

      if (checkDate < startAnchor) return false;
      if (endAnchor && checkDate > endAnchor) return false;

      const interval = task.recurrenceInterval && task.recurrenceInterval > 0 ? Math.floor(task.recurrenceInterval) : 1;
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysDiff = Math.round((checkDate.getTime() - startAnchor.getTime()) / msPerDay);

      switch (task.recurrence) {
        case Recurrence.NONE: {
          if (!task.dueDate) return false;
          const due = new Date(task.dueDate);
          due.setHours(0,0,0,0);
          return due.getTime() === checkDate.getTime();
        }

        case Recurrence.DAILY:
          return (daysDiff % interval) === 0;

        case Recurrence.WEEKLY: {
          const startAnchorWeekStart = new Date(startAnchor);
          startAnchorWeekStart.setDate(startAnchor.getDate() - startAnchor.getDay());
          startAnchorWeekStart.setHours(0, 0, 0, 0);
          const weekDiff = Math.floor((checkDate.getTime() - startAnchorWeekStart.getTime()) / (7 * msPerDay));
          if (task.recurrenceWeekdays && task.recurrenceWeekdays.length > 0) {
            if (!task.recurrenceWeekdays.includes(checkDate.getDay())) return false;
            return (weekDiff % interval) === 0;
          }
          if (checkDate.getDay() !== startAnchor.getDay()) return false;
          return (weekDiff % interval) === 0;
        }

        case Recurrence.MONTHLY: {
          const monthDiff = (checkDate.getFullYear() - startAnchor.getFullYear()) * 12 + (checkDate.getMonth() - startAnchor.getMonth());
          if (typeof task.recurrenceMonthNth === 'number' && typeof task.recurrenceMonthWeekday === 'number') {
            if (!isNthWeekdayOfMonth(checkDate, task.recurrenceMonthNth, task.recurrenceMonthWeekday)) return false;
            return (monthDiff % interval) === 0;
          }
          if (task.recurrenceMonthDay && Number.isInteger(task.recurrenceMonthDay)) {
            if (checkDate.getDate() !== task.recurrenceMonthDay) return false;
            return (monthDiff % interval) === 0;
          }
          if (checkDate.getDate() !== startAnchor.getDate()) return false;
          return (monthDiff % interval) === 0;
        }

        case Recurrence.QUARTERLY: {
          const monthDiff = (checkDate.getFullYear() - startAnchor.getFullYear()) * 12 + (checkDate.getMonth() - startAnchor.getMonth());
          const quarterInterval = 3 * interval;
          if (checkDate.getDate() !== startAnchor.getDate()) return false;
          return (monthDiff % quarterInterval) === 0;
        }

        case Recurrence.YEARLY: {
          const yearDiff = checkDate.getFullYear() - startAnchor.getFullYear();
          if (checkDate.getMonth() !== startAnchor.getMonth() || checkDate.getDate() !== startAnchor.getDate()) return false;
          return (yearDiff % interval) === 0;
        }

        default:
          return false;
      }
  };

  const getTasksForDay = (day: number) => {
    const date = new Date(year, month, day);
    const dayTasks: { task: Task; isVirtual: boolean; baseTaskId: string; baseTask: Task; occurrenceISO: string }[] = [];

    tasks.forEach(task => {
        if (task.status === Status.ARCHIVED) return;

        if (doesTaskOccurOnDate(task, date)) {
            let isRealInstance = false;
            if (task.dueDate) {
                const due = new Date(task.dueDate);
                due.setHours(0,0,0,0);
                const check = new Date(date);
                check.setHours(0,0,0,0);
                isRealInstance = due.getTime() === check.getTime();
            }

            // Skip virtual occurrences for DONE recurring tasks - the new TODO task will project forward
            if (task.status === Status.DONE) {
                if (!isRealInstance) {
                    return; // Don't show virtual occurrences of DONE tasks
                }
                // Show only the real DONE instance on its actual due date
            }

            const baseTaskId = task.id;
            const occurrenceISO = date.toISOString();

            // If a history record (non-recurring instance) exists for this same date, skip projecting a virtual copy
            // A history record is a non-recurring task with the same title on the same date, but different ID
            if (!isRealInstance) {
              const occStart = new Date(occurrenceISO); occStart.setHours(0,0,0,0);
              const hasHistoryRecord = tasks.some(tt => {
                if (!tt.dueDate) return false;
                const dd = new Date(tt.dueDate); dd.setHours(0,0,0,0);
                // Match non-recurring tasks with same title on same date (but different ID)
                // Status doesn't matter - could be DONE, IN_PROGRESS, or TODO
                return dd.getTime() === occStart.getTime() && tt.title === task.title && tt.recurrence === Recurrence.NONE && tt.id !== task.id;
              });
              if (hasHistoryRecord) {
                return; // skip adding virtual duplicate - the actual history record will be shown instead
              }
            }

            // For recurring tasks that are DONE, always show future occurrences as TODO (new instances)
            let displayStatus = Status.TODO;
            if (isRealInstance) {
              displayStatus = task.status; // Real instance keeps its actual status
            } else if (task.recurrence !== Recurrence.NONE) {
              // Virtual occurrences of recurring tasks are always TODO, even if the base task is DONE
              displayStatus = Status.TODO;
            }

            const displayTask = isRealInstance ? task : {
                ...task,
                id: `${task.id}-virtual-${date.getTime()}`,
                dueDate: occurrenceISO,
                status: displayStatus
            };

            dayTasks.push({
                task: displayTask,
                isVirtual: !isRealInstance,
                baseTaskId,
                baseTask: task, // Store the original task for editing
                occurrenceISO
            });
        }
    });
    return dayTasks;
  };

  const priorityColor = {
    [Priority.HIGH]: 'border-red-200 bg-red-50 text-red-900',
    [Priority.MEDIUM]: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    [Priority.LOW]: 'border-blue-200 bg-blue-50 text-blue-900',
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="mb-3 flex items-center gap-2 px-3 pt-3">
        <span className="text-sm text-gray-600 font-medium">Summary</span>
        <button
          type="button"
          onClick={toggleOverdue}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'overdue' ? 'border-red-400 bg-red-100 text-red-800' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
        >
          Overdue: {overdueTasks.length}
        </button>
        <button
          type="button"
          onClick={toggleWeek}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'week' ? 'border-blue-400 bg-blue-100 text-blue-800' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
        >
          Due this week: {dueThisWeekTasks.length}
        </button>
        <button
          type="button"
          onClick={toggleNoDue}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'nodue' ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          No due date: {missingDueTasks.length}
        </button>
      </div>

      {filterMode === 'overdue' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
          {overdueTasks.length === 0 && (
            <div className="text-xs text-gray-400 italic px-1">No overdue tasks 🎉</div>
          )}
          {overdueTasks
            .slice()
            .sort((a, b) => {
              const ad = a.dueDate ? new Date(a.dueDate).getTime() : -Infinity;
              const bd = b.dueDate ? new Date(b.dueDate).getTime() : -Infinity;
              if (ad !== bd) return ad - bd;
              const pw: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
              const pDiff = pw[b.priority] - pw[a.priority];
              if (pDiff !== 0) return pDiff;
              return b.createdAt - a.createdAt;
            })
            .map(task => (
              <div key={task.id} className={`group flex items-center gap-2 px-2 py-2 rounded border transition-all ${priorityColor[task.priority]}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleDone(task.id); }}
                  className={`flex-shrink-0 text-gray-400 hover:text-green-600 ${task.status === Status.DONE ? 'text-green-600' : ''}`}
                  title="Toggle done"
                >
                  {task.status === Status.DONE ? <Check size={14} className="stroke-[3]" /> : <Circle size={14} />}
                </button>
                <button
                  onClick={() => onEditTask(task)}
                  className={`text-left text-xs truncate flex-1 font-medium ${task.status === Status.DONE ? 'line-through text-gray-500' : ''}`}
                >
                  {task.title}
                </button>
                {task.dueDate && (
                  <span className="text-[10px] text-gray-500">{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                )}
              </div>
            ))}
        </div>
      )}

      {filterMode === 'nodue' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
          {missingDueTasks.length === 0 && (
            <div className="text-xs text-gray-400 italic px-1">No tasks without due date</div>
          )}
          {missingDueTasks
            .slice()
            .sort((a, b) => {
              const pw: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
              const pDiff = pw[b.priority] - pw[a.priority];
              if (pDiff !== 0) return pDiff;
              return b.createdAt - a.createdAt;
            })
            .map(task => (
              <div key={task.id} className={`group flex items-center gap-2 px-2 py-2 rounded border transition-all ${priorityColor[task.priority]}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleDone(task.id); }}
                  className={`flex-shrink-0 text-gray-400 hover:text-green-600 ${task.status === Status.DONE ? 'text-green-600' : ''}`}
                  title="Toggle done"
                >
                  {task.status === Status.DONE ? <Check size={14} className="stroke-[3]" /> : <Circle size={14} />}
                </button>
                <button
                  onClick={() => onEditTask(task)}
                  className={`text-left text-xs truncate flex-1 font-medium ${task.status === Status.DONE ? 'line-through text-gray-500' : ''}`}
                >
                  {task.title}
                </button>
              </div>
            ))}
        </div>
      )}

      {filterMode === 'week' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
          {dueThisWeekTasks.length === 0 && (
            <div className="text-xs text-gray-400 italic px-1">No tasks due this week 🎉</div>
          )}
          {dueThisWeekTasks
            .slice()
            .sort((a, b) => {
              const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
              const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
              if (ad !== bd) return ad - bd;
              const pw: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
              const pDiff = pw[b.priority] - pw[a.priority];
              if (pDiff !== 0) return pDiff;
              return b.createdAt - a.createdAt;
            })
            .map(task => (
              <div key={task.id} className={`group flex items-center gap-2 px-2 py-2 rounded border transition-all ${priorityColor[task.priority]}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleDone(task.id); }}
                  className={`flex-shrink-0 text-gray-400 hover:text-green-600 ${task.status === Status.DONE ? 'text-green-600' : ''}`}
                  title="Toggle done"
                >
                  {task.status === Status.DONE ? <Check size={14} className="stroke-[3]" /> : <Circle size={14} />}
                </button>
                <button
                  onClick={() => onEditTask(task)}
                  className={`text-left text-xs truncate flex-1 font-medium ${task.status === Status.DONE ? 'line-through text-gray-500' : ''}`}
                >
                  {task.title}
                </button>
                {task.dueDate && (
                  <span className="text-[10px] text-gray-500">{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                )}
              </div>
            ))}
        </div>
      )}
      {/* Weekday Headers */}
      {filterMode === 'all' && (
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>
      )}

      {/* Calendar Grid */}
      {filterMode === 'all' && (
      <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-gray-200 gap-[1px]">
        {totalSlots.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} className="bg-gray-50/50" />;
          }

          const dayTasks = getTasksForDay(day);
          const isToday = new Date().getDate() === day && 
                         new Date().getMonth() === month && 
                         new Date().getFullYear() === year;

          return (
            <div key={`day-${day}`} className={`group min-h-[100px] bg-white p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                  {day}
                </span>
                {onAddTask && (
                  <button
                    onClick={() => {
                      const date = new Date(year, month, day);
                      date.setHours(12, 0, 0, 0);
                      onAddTask(date);
                    }}
                    className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition-colors opacity-60 group-hover:opacity-100"
                    title="Add task"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar max-h-[120px]">
                {dayTasks.map(({ task, isVirtual, baseTaskId, baseTask, occurrenceISO }) => {
                  const isDone = task.status === Status.DONE;
                  const isInProgress = task.status === Status.IN_PROGRESS;
                  
                  // Don't show virtual indicator for recurring tasks if due date is today or earlier
                  const occurrenceDate = new Date(occurrenceISO);
                  occurrenceDate.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const shouldShowVirtualIndicator = isVirtual && occurrenceDate > today;
                  
                  return (
                    <div
                      key={task.id}
                      title={`${task.title}${task.description ? '\n' + task.description : ''}${isInProgress ? '\n📍 In Progress' : ''}`}
                      className={`group flex items-center gap-2 px-1.5 py-1 rounded border transition-all 
                        ${isDone ? 'bg-gray-100 border-gray-100' : priorityColor[task.priority]} 
                        ${shouldShowVirtualIndicator ? 'opacity-60 border-dashed bg-white' : 'hover:shadow-sm'}
                        ${isInProgress ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-300' : ''}
                      `}
                    >
                      <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isVirtual) {
                              onToggleDone(baseTaskId, occurrenceISO);
                            } else {
                              onToggleDone(task.id);
                            }
                        }}
                        className={`flex-shrink-0 transition-colors 
                            ${isVirtual ? 'text-gray-300 hover:text-green-600 cursor-pointer' : 'text-gray-400 hover:text-green-600 cursor-pointer'}
                            ${isDone ? 'text-green-600' : ''}
                            ${isInProgress ? 'text-blue-600' : ''}`}
                      >
                         {isDone ? <Check size={14} className="stroke-[3]" /> : <Circle size={14} />}
                      </button>
                      
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <button 
                          onClick={() => onEditTask(task)}
                          className={`text-left text-xs truncate flex-1 font-medium cursor-pointer flex items-center gap-1
                              ${isDone ? 'line-through text-gray-500' : ''}
                          `}
                        >
                          {task.priority === Priority.HIGH && (
                            <ArrowUp 
                              size={12} 
                              className="text-red-500 flex-shrink-0" 
                              title={`Priority: ${task.priority}`}
                            />
                          )}
                          {task.priority === Priority.MEDIUM && (
                            <Minus 
                              size={12} 
                              className="text-yellow-500 flex-shrink-0" 
                              title={`Priority: ${task.priority}`}
                            />
                          )}
                          {task.priority === Priority.LOW && (
                            <ArrowDown 
                              size={12} 
                              className="text-blue-500 flex-shrink-0" 
                              title={`Priority: ${task.priority}`}
                            />
                          )}
                          <span className="truncate">{task.title}</span>
                        </button>
                        {isInProgress && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0 whitespace-nowrap">In Progress</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};