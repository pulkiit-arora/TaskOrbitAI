import React from 'react';
import { Task, Priority, Status, Recurrence, Tag } from '../types';
import { isNthWeekdayOfMonth, doesTaskOccurOnDate } from '../utils/taskUtils';
import { Check, Circle, Plus, ArrowUp, ArrowDown, Minus, RefreshCw, Filter, Tag as TagIcon, XCircle, LayoutGrid, List, MessageSquare, Flame, Clock } from 'lucide-react';
import { StatusFilter } from './StatusFilter';
import { TagFilterBar } from './TagFilterBar';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onToggleDone: (taskId: string, onDate?: string) => void;
  onAddTask: (date: Date) => void;
  onDropTask?: (taskId: string, date: Date) => void;
  priorityFilter?: Priority[];
  setPriorityFilter?: (priorities: Priority[]) => void;
  statusFilter?: Status[];
  setStatusFilter?: (statuses: Status[]) => void;
  tags?: Tag[];
  tagFilter?: string[];
  setTagFilter?: (tags: string[]) => void;
  onUpdateTag?: (tag: Tag) => void;
  onDeleteTag?: (tagId: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({ currentDate, tasks, onEditTask, onToggleDone, onAddTask, onDropTask, priorityFilter, setPriorityFilter, statusFilter, setStatusFilter, tags = [], tagFilter = [], setTagFilter, onUpdateTag, onDeleteTag }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  let totalSlots = [...blanks, ...days];
  const remainingSlots = 7 - (totalSlots.length % 7);
  if (remainingSlots < 7) {
    totalSlots = [...totalSlots, ...Array(remainingSlots).fill(null)];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const isOpen = (t: Task) => t.status !== Status.DONE && t.status !== Status.ARCHIVED;

  // Build overdue list
  const overdueTasks: Task[] = (() => {
    const result: Task[] = [];
    const MAX_LOOKBACK_DAYS = 365;
    const lookbackStart = new Date(today);
    lookbackStart.setDate(lookbackStart.getDate() - MAX_LOOKBACK_DAYS);

    tasks.forEach(task => {
      if (task.status === Status.ARCHIVED || task.status === Status.EXPIRED) return;

      if (task.recurrence === Recurrence.NONE) {
        if (task.dueDate && isOpen(task) && new Date(task.dueDate) < today) {
          result.push(task);
        }
        return;
      }

      const scanStart = new Date(Math.max(lookbackStart.getTime(),
        task.recurrenceStart ? new Date(task.recurrenceStart).setHours(0, 0, 0, 0) :
          task.dueDate ? new Date(task.dueDate).setHours(0, 0, 0, 0) :
            task.createdAt));
      scanStart.setHours(0, 0, 0, 0);

      for (let d = new Date(scanStart); d < today; d.setDate(d.getDate() + 1)) {
        if (doesTaskOccurOnDate(task, d)) {
          const dateTime = new Date(d).setHours(0, 0, 0, 0);
          const hasHistoryRecord = tasks.some(t =>
            (t.status === Status.DONE || t.status === Status.EXPIRED) &&
            t.title === task.title &&
            t.dueDate &&
            new Date(t.dueDate).setHours(0, 0, 0, 0) === dateTime
          );
          if (!hasHistoryRecord) {
            result.push({
              ...task,
              id: `${task.id}-virtual-${d.getTime()}`,
              dueDate: new Date(d).toISOString(),
              status: Status.TODO
            });
          }
        }
      }
    });

    return result;
  })();

  const finalDueThisMonthCount = tasks.reduce((acc, task) => {
    if (task.status === Status.ARCHIVED) return acc;
    if (task.recurrence === Recurrence.NONE) {
      if (task.status === Status.DONE) return acc;
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        d.setHours(0, 0, 0, 0);
        if (d >= monthStart && d <= monthEnd) return acc + 1;
      }
      return acc;
    }
    if (task.status === Status.DONE) return acc;
    let occurrences = 0;
    const dim = getDaysInMonth(year, month);
    for (let i = 1; i <= dim; i++) {
      const d = new Date(year, month, i);
      d.setHours(0, 0, 0, 0);
      if (doesTaskOccurOnDate(task, d)) {
        const hasDoneInstance = tasks.some(t =>
          t.status === Status.DONE &&
          t.title === task.title &&
          t.dueDate &&
          new Date(t.dueDate).setHours(0, 0, 0, 0) === d.getTime()
        );
        if (!hasDoneInstance) {
          occurrences++;
        }
      }
    }
    return acc + occurrences;
  }, 0);

  const dueThisMonthCount = finalDueThisMonthCount;
  const missingDueTasks = tasks.filter(t => !t.dueDate && isOpen(t));

  const [filterMode, setFilterMode] = React.useState<'all' | 'overdue' | 'month' | 'nodue'>('all');
  const [viewLayout, setViewLayout] = React.useState<'grid' | 'list'>('grid');
  const toggleOverdue = () => setFilterMode(m => (m === 'overdue' ? 'all' : 'overdue'));
  const toggleMonth = () => setFilterMode(m => (m === 'month' ? 'all' : 'month'));
  const toggleNoDue = () => setFilterMode(m => (m === 'nodue' ? 'all' : 'nodue'));

  // [Enhancement 12] Drag feedback state
  const [dragOverDay, setDragOverDay] = React.useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, day?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (day !== undefined) setDragOverDay(day);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    setDragOverDay(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onDropTask) {
      const dropDate = new Date(year, month, day);
      onDropTask(taskId, dropDate);
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
          due.setHours(0, 0, 0, 0);
          const check = new Date(date);
          check.setHours(0, 0, 0, 0);
          isRealInstance = due.getTime() === check.getTime();
        }

        const baseTaskId = task.id;
        const occurrenceISO = date.toISOString();

        if (!isRealInstance) {
          const occStart = new Date(occurrenceISO); occStart.setHours(0, 0, 0, 0);
          const hasHistoryRecord = tasks.some(tt => {
            if (!tt.dueDate) return false;
            const dd = new Date(tt.dueDate); dd.setHours(0, 0, 0, 0);
            return dd.getTime() === occStart.getTime() && tt.title === task.title && tt.recurrence === Recurrence.NONE && tt.id !== task.id;
          });
          if (hasHistoryRecord) {
            return;
          }
        }

        let displayStatus = Status.TODO;
        if (isRealInstance) {
          displayStatus = task.status;
        } else if (task.recurrence !== Recurrence.NONE) {
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
          baseTask: task,
          occurrenceISO
        });
      }
    });
    return dayTasks;
  };

  // [Enhancement 11] Streak helper — check if a day has all recurring tasks completed
  const getDayStreak = (day: number): number => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    if (date > today) return 0;
    const dayTasks = getTasksForDay(day);
    const recurringTasks = dayTasks.filter(d => d.task.recurrence !== Recurrence.NONE || d.isVirtual);
    if (recurringTasks.length === 0) return 0;
    const allDone = recurringTasks.every(d => d.task.status === Status.DONE);
    return allDone ? recurringTasks.length : 0;
  };


  // [Enhancement 10] Deadline countdown helper
  const getDeadlineCountdown = (task: Task): string | null => {
    if (!task.dueDate || task.status === Status.DONE) return null;
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d left';
    if (diffDays === 2) return '2d left';
    return null;
  };

  const priorityColor = {
    [Priority.HIGH]: 'border-red-200 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50',
    [Priority.MEDIUM]: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/50',
    [Priority.LOW]: 'border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50',
  };

  // [Enhancement 8] Week number calculation
  const getWeekNumber = (day: number): number => {
    const date = new Date(year, month, day);
    const startOfYear = new Date(year, 0, 1);
    const diffInMs = date.getTime() - startOfYear.getTime();
    return Math.ceil((diffInMs / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="mb-3 flex items-center justify-between px-3 pt-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">

          <button
            type="button"
            onClick={toggleOverdue}
            className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'overdue' ? 'border-red-400 bg-red-100 text-red-800' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'} `}
          >
            Overdue: {overdueTasks.length}
          </button>
          <button
            type="button"
            onClick={toggleMonth}
            className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'month' ? 'border-blue-400 bg-blue-100 text-blue-800' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'} `}
          >
            Due this month: {dueThisMonthCount}
          </button>
          <button
            type="button"
            onClick={toggleNoDue}
            className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'nodue' ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'} `}
          >
            No due date: {missingDueTasks.length}
          </button>

          {setStatusFilter && statusFilter && (
            <>
              <div className="h-4 w-px bg-gray-300 mx-1"></div>
              <StatusFilter
                selectedStatuses={statusFilter}
                onChange={setStatusFilter}
              />
            </>
          )}

          {setPriorityFilter && priorityFilter && (
            <>
              <div className="h-4 w-px bg-gray-300 mx-1"></div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Priority:</span>
                <button
                  onClick={() => {
                    const newFilter = priorityFilter.includes(Priority.HIGH)
                      ? priorityFilter.filter(p => p !== Priority.HIGH)
                      : [...priorityFilter, Priority.HIGH];
                    setPriorityFilter(newFilter);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${priorityFilter.includes(Priority.HIGH)
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-700'
                    } `}
                >
                  High
                </button>
                <button
                  onClick={() => {
                    const newFilter = priorityFilter.includes(Priority.MEDIUM)
                      ? priorityFilter.filter(p => p !== Priority.MEDIUM)
                      : [...priorityFilter, Priority.MEDIUM];
                    setPriorityFilter(newFilter);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${priorityFilter.includes(Priority.MEDIUM)
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-200 hover:text-yellow-700'
                    } `}
                >
                  Med
                </button>
                <button
                  onClick={() => {
                    const newFilter = priorityFilter.includes(Priority.LOW)
                      ? priorityFilter.filter(p => p !== Priority.LOW)
                      : [...priorityFilter, Priority.LOW];
                    setPriorityFilter(newFilter);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${priorityFilter.includes(Priority.LOW)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200 hover:text-blue-700'
                    } `}
                >
                  Low
                </button>
              </div>
            </>
          )}

          {setTagFilter && tags && tags.length > 0 && (
            <>
              <div className="h-4 w-px bg-gray-300 mx-1"></div>
              <div className="flex items-center gap-2">
                <TagIcon size={14} className="text-gray-500" />
                <TagFilterBar
                  tags={tags}
                  selectedTags={tagFilter}
                  onToggleTag={(tagId) => {
                    const newFilter = tagFilter.includes(tagId)
                      ? tagFilter.filter(t => t !== tagId)
                      : [...tagFilter, tagId];
                    setTagFilter(newFilter);
                  }}
                  onUpdateTag={onUpdateTag}
                  onDeleteTag={onDeleteTag}
                  onClear={() => setTagFilter([])}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg">
          <button
            onClick={() => setViewLayout('grid')}
            className={`p-1 rounded-md transition-colors ${viewLayout === 'grid' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewLayout('list')}
            className={`p-1 rounded-md transition-colors ${viewLayout === 'list' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>
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
              <div key={task.id} className={`group flex items-center gap-2 px-2 py-2 rounded border transition-all ${priorityColor[task.priority]} `}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.id.includes('-virtual-')) {
                      const baseId = task.id.substring(0, task.id.indexOf('-virtual-'));
                      onToggleDone(baseId, task.dueDate);
                    } else {
                      onToggleDone(task.id);
                    }
                  }}
                  className={`flex-shrink-0 text-gray-400 hover:text-green-600 ${task.status === Status.DONE ? 'text-green-600' : ''} `}
                  title="Toggle done"
                >
                  {task.status === Status.DONE ? <Check size={14} className="stroke-[3]" /> : <Circle size={14} />}
                </button>
                <button
                  onClick={() => onEditTask(task)}
                  className={`text-left text-xs truncate flex-1 font-medium ${task.status === Status.DONE || task.status === Status.EXPIRED ? 'line-through text-gray-500' : ''} `}
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
              <div key={task.id} className={`group flex items-center gap-2 px-2 py-2 rounded border transition-all ${priorityColor[task.priority]} `}>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleDone(task.id); }}
                  className={`flex-shrink-0 text-gray-400 hover:text-green-600 ${task.status === Status.DONE ? 'text-green-600' : ''} `}
                  title="Toggle done"
                >
                  {task.status === Status.DONE ? <Check size={14} className="stroke-[3]" /> : <Circle size={14} />}
                </button>
                <button
                  onClick={() => onEditTask(task)}
                  className={`text-left text-xs truncate flex-1 font-medium ${task.status === Status.DONE || task.status === Status.EXPIRED ? 'line-through text-gray-500' : ''} `}
                >
                  {task.title}
                </button>
              </div>
            ))}
        </div>
      )}

      {filterMode === 'month' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
          <div className="text-xs text-gray-500 italic px-1 mb-2">
            Showing active and projected tasks for this month.
          </div>
          {(() => {
            const monthTasks: Task[] = [];
            const dim = getDaysInMonth(year, month);

            for (let i = 1; i <= dim; i++) {
              const d = new Date(year, month, i);
              d.setHours(0, 0, 0, 0);
              const dateISO = d.toISOString();

              tasks.forEach(task => {
                if (task.status === Status.ARCHIVED) return;
                if (doesTaskOccurOnDate(task, d)) {
                  const hasDone = tasks.some(t => t.status === Status.DONE && t.title === task.title && t.dueDate && new Date(t.dueDate).setHours(0, 0, 0, 0) === d.getTime());
                  if (hasDone) return;
                  if (task.status === Status.DONE && task.recurrence !== Recurrence.NONE && task.dueDate && new Date(task.dueDate).setHours(0, 0, 0, 0) !== d.getTime()) return;

                  const isReal = task.dueDate && new Date(task.dueDate).setHours(0, 0, 0, 0) === d.getTime();
                  monthTasks.push({
                    ...task,
                    id: isReal ? task.id : `${task.id}-virtual-${d.getTime()}`,
                    dueDate: dateISO,
                    status: isReal ? task.status : Status.TODO
                  });
                }
              });
            }

            if (monthTasks.length === 0) {
              return <div className="text-xs text-gray-400 italic px-1">No tasks due this month</div>;
            }

            return monthTasks.sort((a, b) => {
              const aDone = a.status === Status.DONE ? 1 : 0;
              const bDone = b.status === Status.DONE ? 1 : 0;
              if (aDone !== bDone) return aDone - bDone;
              const priorityWeight: Record<string, number> = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
              const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
              if (pDiff !== 0) return pDiff;
              const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
              const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
              if (ad !== bd) return ad - bd;
              return (b.createdAt || 0) - (a.createdAt || 0);
            }).map(task => (
              <div key={task.id} className={`group flex items-center gap-2 px-2 py-2 rounded border transition-all ${priorityColor[task.priority]} `}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.id.includes('-virtual-')) {
                      const baseId = task.id.substring(0, task.id.indexOf('-virtual-'));
                      onToggleDone(baseId, task.dueDate);
                    } else {
                      onToggleDone(task.id, task.dueDate);
                    }
                  }}
                  className={`flex-shrink-0 text-gray-400 hover:text-green-600 ${task.status === Status.DONE ? 'text-green-600' : ''} `}
                >
                  {task.status === Status.DONE ? <Check size={14} /> : <Circle size={14} />}
                </button>
                <button onClick={() => onEditTask(task)} className="text-left text-xs truncate flex-1 font-medium">
                  {task.title}
                </button>
                {/* [Enhancement 10] Deadline countdown in month list */}
                {(() => {
                  const countdown = getDeadlineCountdown(task);
                  if (!countdown) return null;
                  return (
                    <span className="flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-medium whitespace-nowrap">
                      <Clock size={10} /> {countdown}
                    </span>
                  );
                })()}
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {new Date(task.dueDate!).getDate()} {new Date(task.dueDate!).toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Weekday Headers */}
      {filterMode === 'all' && viewLayout === 'grid' && (
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewLayout === 'list' && filterMode === 'all' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900 p-2 md:p-4 space-y-4">
          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            if (dayTasks.length === 0) return null;

            const date = new Date(year, month, day);
            const isToday = day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();
            const streakCount = getDayStreak(day);

            const sortedTasks = dayTasks.sort((a, b) => {
              const getStatusWeight = (s: Status) => {
                if (s === Status.DONE) return 2;
                if (s === Status.EXPIRED) return 1;
                return 0;
              };
              const aWeight = getStatusWeight(a.task.status);
              const bWeight = getStatusWeight(b.task.status);
              if (aWeight !== bWeight) return aWeight - bWeight;

              const priorityWeight: Record<string, number> = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
              const pDiff = (priorityWeight[b.task.priority] || 0) - (priorityWeight[a.task.priority] || 0);
              if (pDiff !== 0) return pDiff;

              const ad = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Infinity;
              const bd = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Infinity;
              if (ad !== bd) return ad - bd;

              return (b.task.createdAt || 0) - (a.task.createdAt || 0);
            });

            return (
              <div
                key={day}
                ref={isToday ? (el) => {
                  if (el && viewLayout === 'list') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                } : null}
                className={`bg-white dark:bg-gray-800 rounded-xl border ${isToday ? 'border-blue-400 dark:border-blue-500 ring-1 ring-blue-400' : 'border-gray-200 dark:border-gray-700'} overflow-hidden shadow-sm`}
              >
                <div className={`px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' : 'bg-gray-50/50 dark:bg-gray-800'}`}>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className={`${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-lg">
                      {date.getDate()}
                    </span>
                    {/* [Enhancement 11] Streak flame in list view */}
                    {streakCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 font-bold">
                        <Flame size={10} className="fill-orange-400" /> {streakCount}
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => onAddTask(date)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-600 transition-colors"
                    title="Add Task"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {sortedTasks.map(({ task, isVirtual, baseTaskId, baseTask, occurrenceISO }) => {
                    const isDone = task.status === Status.DONE;
                    const isExpired = task.status === Status.EXPIRED;
                    const isInProgress = task.status === Status.IN_PROGRESS;
                    const occurrenceDate = new Date(occurrenceISO);
                    occurrenceDate.setHours(0, 0, 0, 0);
                    const todayCheck = new Date();
                    todayCheck.setHours(0, 0, 0, 0);
                    const shouldShowVirtualIndicator = isVirtual && occurrenceDate > todayCheck;
                    const countdown = getDeadlineCountdown(task);

                    let completedCount = 0;
                    let missedCount = 0;
                    if (task.recurrence !== Recurrence.NONE) {
                      const searchId = isVirtual ? baseTaskId : task.id;
                      const history = tasks.filter(t => t.seriesId === searchId);
                      completedCount = history.filter(t => t.status === Status.DONE).length;
                      missedCount = history.filter(t => t.status === Status.EXPIRED).length;
                    }

                    return (
                      <div
                        key={task.id}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all 
                                 ${isDone ? 'bg-gray-50 border-transparent' : isExpired ? 'bg-orange-50/50 border-orange-100' : 'bg-white hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700'}
                                 ${shouldShowVirtualIndicator ? 'opacity-70 border-dashed' : ''}
                                 ${isInProgress ? 'border-blue-200 bg-blue-50/30' : ''}
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
                                     ${isDone ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}
                                     ${isExpired ? 'text-orange-500' : ''}
                                     ${isInProgress ? 'text-blue-500' : ''}`}
                        >
                          {isDone ? <Check size={18} className="stroke-[3]" /> : (isExpired ? <XCircle size={18} /> : <Circle size={18} />)}
                        </button>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEditTask(task)}>
                          <div className={`flex items-center gap-2 mb-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {task.priority === Priority.HIGH && (
                              <span className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 flex-shrink-0">
                                <ArrowUp size={12} strokeWidth={2.5} /> High
                              </span>
                            )}
                            {task.priority === Priority.MEDIUM && (
                              <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-400 flex-shrink-0">
                                <Minus size={12} strokeWidth={2.5} /> Medium
                              </span>
                            )}
                            {task.priority === Priority.LOW && (
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400 flex-shrink-0">
                                <ArrowDown size={12} strokeWidth={2.5} /> Low
                              </span>
                            )}
                            <span className="font-semibold text-sm truncate flex-1">{task.title}</span>
                            {task.isRecurringException && (
                              <RefreshCw size={12} className="text-orange-400 stroke-[2.5]" title="Exception" />
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {task.description && <span className="truncate max-w-[200px] opacity-80">{task.description}</span>}
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex gap-1 flex-wrap">
                              {task.tags && task.tags.length > 0 ? (
                                task.tags.map(tag => (
                                  <span key={tag.id} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${tag.color} opacity-90`}>
                                    {tag.label}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium border-gray-300 bg-gray-100 text-gray-500 opacity-90">
                                  No Category
                                </span>
                              )}
                            </div>

                            {/* [Enhancement 10] Deadline countdown */}
                            {countdown && (
                              <span className="flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-medium whitespace-nowrap">
                                <Clock size={10} /> {countdown}
                              </span>
                            )}

                            {task.recurrence !== Recurrence.NONE && (
                              <>
                                {completedCount > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800 flex-shrink-0" title={`${completedCount} completion${completedCount === 1 ? '' : 's'} so far`}>
                                    <span className="font-bold">{completedCount}</span>
                                    <span className="text-[9px] uppercase opacity-80">Done</span>
                                  </span>
                                )}
                                {missedCount > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-800 flex-shrink-0" title={`${missedCount} time${missedCount === 1 ? '' : 's'} missed`}>
                                    <span className="font-bold">{missedCount}</span>
                                    <span className="text-[9px] uppercase opacity-80">Miss</span>
                                  </span>
                                )}
                              </>
                            )}
                            {task.comments && task.comments.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded-full border border-gray-100 dark:border-gray-700 text-gray-500">
                                <MessageSquare size={10} /> {task.comments.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {days.every(d => getTasksForDay(d).length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <List size={32} />
              </div>
              <p>No tasks for this month.</p>
            </div>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      {filterMode === 'all' && viewLayout === 'grid' && (
        <div className="grid grid-cols-7 auto-rows-[minmax(140px,1fr)] flex-1 bg-gray-200 dark:bg-gray-700 gap-[1px] overflow-y-auto custom-scrollbar">
          {totalSlots.map((slot, index) => {
            if (slot === null) {
              return <div key={`blank-${index}`} className="bg-gray-50/50 dark:bg-gray-900/50" />;
            }

            const day = slot as number;
            const date = new Date(year, month, day);
            const isToday = day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            // [Enhancement 8] Week number — show on Sunday (first cell of each row)
            const isSunday = date.getDay() === 0;
            const weekNum = isSunday ? getWeekNumber(day) : null;

            const dayTasks = getTasksForDay(day).sort((a, b) => {
              const getStatusWeight = (s: Status) => {
                if (s === Status.DONE) return 3;
                if (s === Status.EXPIRED) return 2;
                return 1;
              };
              const aWeight = getStatusWeight(a.task.status);
              const bWeight = getStatusWeight(b.task.status);
              if (aWeight !== bWeight) return aWeight - bWeight;
              const priorityWeight: Record<string, number> = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
              const pDiff = (priorityWeight[b.task.priority] || 0) - (priorityWeight[a.task.priority] || 0);
              if (pDiff !== 0) return pDiff;
              const ad = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Infinity;
              const bd = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Infinity;
              if (ad !== bd) return ad - bd;
              return (b.task.createdAt || 0) - (a.task.createdAt || 0);
            });

            // [Enhancement 7] Task count dots — show dots when > 4 tasks
            const showDots = dayTasks.length > 4;
            const visibleTasks = showDots ? dayTasks.slice(0, 3) : dayTasks;
            const hiddenCount = dayTasks.length - visibleTasks.length;

            // [Enhancement 11] Streak
            const streakCount = getDayStreak(day);

            // [Enhancement 12] Drag highlight
            const isDragTarget = dragOverDay === day;

            return (
              <div
                key={index}
                className={`group min-h-[140px] flex flex-col border-b border-r border-gray-200 dark:border-gray-700 transition-all bg-white dark:bg-gray-800
                  ${isToday ? 'ring-2 ring-inset ring-blue-500/50 z-10' : ''}
                  ${isDragTarget ? 'ring-2 ring-inset ring-green-400 bg-green-50/50 dark:bg-green-900/20 scale-[1.02]' : ''}
                `}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className={`p-2 flex justify-between items-start sticky top-0 z-10 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    {/* [Enhancement 8] Week number label on Sunday cells */}
                    {weekNum !== null && (
                      <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 mr-0.5">W{weekNum}</span>
                    )}
                    <span className={`text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center ${isToday
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-900 dark:text-gray-100'
                      } `}>
                      {day}
                    </span>
                    {/* [Enhancement 11] Streak flame icon */}
                    {streakCount > 0 && (
                      <span className="flex items-center text-orange-500" title={`${streakCount} recurring tasks completed!`}>
                        <Flame size={12} className="fill-orange-400" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {dayTasks.length > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800">
                        {dayTasks.length}
                      </span>
                    )}
                    <button
                      onClick={() => onAddTask(date)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      title="Add task on this day"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar max-h-[160px] flex-1 px-1">
                  {visibleTasks.map(({ task, isVirtual, baseTaskId, baseTask, occurrenceISO }) => {
                    const isDone = task.status === Status.DONE;
                    const isExpired = task.status === Status.EXPIRED;
                    const isInProgress = task.status === Status.IN_PROGRESS;
                    const occurrenceDate = new Date(occurrenceISO);
                    occurrenceDate.setHours(0, 0, 0, 0);
                    const todayCheck = new Date();
                    todayCheck.setHours(0, 0, 0, 0);
                    const shouldShowVirtualIndicator = isVirtual && occurrenceDate > todayCheck;
                    const countdown = getDeadlineCountdown(task);

                    return (
                      <div
                        key={task.id}
                        title={`${task.title}${task.description ? '\n' + task.description : ''}${isInProgress ? '\n📍 In Progress' : ''} `}
                        className={`group flex items-center gap-2 px-1.5 py-1 rounded border transition-all 
                        ${isDone ? 'bg-gray-100 border-gray-100' : isExpired ? 'bg-orange-50 border-orange-200' : priorityColor[task.priority]} 
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
                             ${isExpired ? 'text-orange-600' : ''}
                             ${isInProgress ? 'text-blue-600' : ''} `}
                        >
                          {isDone ? <Check size={14} className="stroke-[3]" /> : (isExpired ? <XCircle size={14} className="stroke-[2.5]" /> : <Circle size={14} />)}
                        </button>

                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <button
                            onClick={() => onEditTask(task)}
                            className={`text-left text-xs truncate flex-1 font-medium cursor-pointer flex items-center gap-1
                               ${isDone || isExpired ? 'line-through text-gray-500' : ''}
                            `}
                          >
                            {task.priority === Priority.HIGH && (
                              <ArrowUp size={12} className="text-red-500 flex-shrink-0" title={`Priority: ${task.priority}`} />
                            )}
                            {task.priority === Priority.MEDIUM && (
                              <Minus size={12} className="text-yellow-500 flex-shrink-0" title={`Priority: ${task.priority}`} />
                            )}
                            {task.priority === Priority.LOW && (
                              <ArrowDown size={12} className="text-blue-500 flex-shrink-0" title={`Priority: ${task.priority}`} />
                            )}
                            <span className="truncate">{task.title}</span>
                          </button>
                          {/* [Enhancement 10] Deadline countdown badge */}
                          {countdown && (
                            <span className="text-[9px] text-orange-600 bg-orange-50 px-1 py-0.5 rounded border border-orange-100 font-medium whitespace-nowrap flex-shrink-0">
                              {countdown}
                            </span>
                          )}
                          {task.isRecurringException && (
                            <span className="text-orange-400 flex-shrink-0" title="Detached from recurrence">
                              <RefreshCw size={12} className="stroke-[2.5]" />
                            </span>
                          )}
                          {isInProgress && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0 whitespace-nowrap">In Progress</span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-orange-100 text-orange-700 border border-orange-200 flex-shrink-0 whitespace-nowrap">Missed</span>
                          )}
                          <div className="flex gap-0.5 flex-shrink-0">
                            {task.tags && task.tags.length > 0 ? (
                              task.tags.map(tag => (
                                <div key={tag.id} className={`w-1.5 h-1.5 rounded-full ${tag.color.split(' ')[0].replace('100', '500')} `} />
                              ))
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-60" title="Uncategorized" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* [Enhancement 7] Task count dots for overflow */}
                  {showDots && (
                    <div className="flex items-center gap-1 px-1 py-1">
                      <div className="flex gap-1">
                        {dayTasks.slice(3).map((d, i) => {
                          const pColor = d.task.status === Status.DONE ? 'bg-green-400'
                            : d.task.priority === Priority.HIGH ? 'bg-red-400'
                              : d.task.priority === Priority.MEDIUM ? 'bg-yellow-400'
                                : 'bg-blue-400';
                          return <div key={i} className={`w-2 h-2 rounded-full ${pColor}`} />;
                        })}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">+{hiddenCount} more</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )
      }
    </div >
  );
};