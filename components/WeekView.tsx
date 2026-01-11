import React from 'react';
import { Task, Priority, Status, Recurrence, Tag } from '../types';
import { isNthWeekdayOfMonth, doesTaskOccurOnDate } from '../utils/taskUtils';
import { TaskCard } from './TaskCard';
import { Plus, Filter, Tag as TagIcon } from 'lucide-react';
import { StatusFilter } from './StatusFilter';
import { TagFilterBar } from './TagFilterBar';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onMoveTask: (taskId: string, direction: 'prev' | 'next') => void;
  onArchiveTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleDone: (taskId: string, onDate?: string) => void;
  onAddTask?: (date: Date) => void;
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

export const WeekView: React.FC<WeekViewProps> = ({ currentDate, tasks, onEditTask, onMoveTask, onArchiveTask, onDeleteTask, onToggleDone, onAddTask, onDropTask, priorityFilter, setPriorityFilter, statusFilter, setStatusFilter, tags = [], tagFilter = [], setTagFilter, onUpdateTag, onDeleteTag }) => {
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust so Sunday is day 0
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);

  // Generate array of 7 days starting from Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    d.setHours(12, 0, 0, 0); // Normalize to noon
    return d;
  });

  // Summary: overdue and due-this-week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(startOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const isOpen = (t: Task) => t.status !== Status.DONE && t.status !== Status.ARCHIVED;
  const overdueTasks = tasks.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today && t.status !== Status.EXPIRED);
  const overdueCount = overdueTasks.length;
  const dueThisWeekTasks = tasks.filter(t => {
    if (!t.dueDate || !isOpen(t)) return false;
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    // Check for exclusions (deleted/moved occurrences)
    if (t.excludedDates && t.excludedDates.some(exDate => {
      const ex = new Date(exDate);
      ex.setHours(0, 0, 0, 0);
      return ex.getTime() === d.getTime();
    })) {
      return false;
    }
    return d >= weekStart && d <= weekEnd;
  });



  // Combine real tasks and projected recurring tasks (avoid double counting base tasks if they fall in range)
  // Logic: 
  // 1. `dueThisWeekTasks` contains real tasks (todo/in-progress) that have a hard dueDate in this week.
  // 2. `recurringDueThisWeekCount` counts projected occurrences.
  // Problem: If a Base Task has a dueDate this week, it is in (1). `doesTaskOccurOnDate` will also return true for it in (2).
  // Fix: In (2), if it's the Base Task's actual due date, don't count it if it's already in (1).

  const finalDueThisWeekCount = tasks.reduce((acc, task) => {
    // We only care about open tasks for the count, primarily. 
    // EXCEPT: The user feedback says "count mismatch ... when I have a DONE task".
    // 1. If it's a DONE task (Status.DONE), it's completed. Should it subtract from "Due This Week"?
    //    Usually "Due This Week" implies "Tasks I still need to do".
    //    So `isOpen(task)` check at the top is correct for general Todo lists.
    // 2. However, for Recurring tasks:
    //    If we project an occurrence on Wednesday, but there is ALSO a completed history task for Wednesday.
    //    We should NOT count that occurrence.

    if (task.status === Status.ARCHIVED) return acc; // Always ignore archived

    // Case 1: Real Task (Non-recurring or ONE-OFF exception)
    if (task.recurrence === Recurrence.NONE) {
      if (task.status === Status.DONE) return acc; // Ignore completed real tasks
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        d.setHours(0, 0, 0, 0);
        if (d >= weekStart && d <= weekEnd) return acc + 1;
      }
      return acc;
    }

    // Case 2: Recurring Task - Count valid occurrences in the week
    // Only process if the BASE task itself is open (active series)
    if (task.status === Status.DONE) return acc;

    let occurrences = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      d.setHours(0, 0, 0, 0);

      if (doesTaskOccurOnDate(task, d)) {
        // It occurs. 
        // 1. Is it already counted as a real task (e.g. Base Task current due date)?
        //    (The Base task is Open, so if its dueDate falls here, we count it here).
        // 2. Is there a DONE history instance for this specific date?
        //    If `onToggleDone` created a history record for this date, we shouldn't show it as "Due".
        const hasDoneInstance = tasks.some(t =>
          t.status === Status.DONE &&
          t.title === task.title && // Heuristic: Same title. ID is different.
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

  const dueThisWeekCount = finalDueThisWeekCount;
  const missingDueTasks = tasks.filter(t => !t.dueDate && isOpen(t));
  const missingDueCount = missingDueTasks.length;

  // Filter mode: 'all' | 'overdue' | 'week' | 'nodue'
  const [filterMode, setFilterMode] = React.useState<'all' | 'overdue' | 'week' | 'nodue'>('all');
  const toggleOverdue = () => setFilterMode(m => (m === 'overdue' ? 'all' : 'overdue'));
  const toggleWeek = () => setFilterMode(m => (m === 'week' ? 'all' : 'week'));
  const toggleNoDue = () => setFilterMode(m => (m === 'nodue' ? 'all' : 'nodue'));




  const getTasksForDay = (date: Date) => {
    const dayTasks: { task: Task; isVirtual: boolean; baseTask: Task }[] = [];

    tasks.forEach(task => {
      // Skip archived in calendar views typically, unless explicitly desired. 
      // Logic passed from App says 'tasks' is already filtered for ARCHIVED if hidden.
      if (task.status === Status.ARCHIVED) return;

      if (doesTaskOccurOnDate(task, date)) {
        // Check if this is the REAL instance
        let isRealInstance = false;
        if (task.dueDate) {
          const due = new Date(task.dueDate);
          due.setHours(0, 0, 0, 0);
          const check = new Date(date);
          check.setHours(0, 0, 0, 0);
          isRealInstance = due.getTime() === check.getTime();
        }

        // If a history record (non-recurring instance) exists for this same date, skip projecting a virtual copy
        // A history record is a non-recurring task with the same title on the same date, but different ID
        if (!isRealInstance) {
          const occStart = new Date(date); occStart.setHours(0, 0, 0, 0);
          const hasHistoryRecord = tasks.some(tt => {
            if (!tt.dueDate) return false;
            const dd = new Date(tt.dueDate); dd.setHours(0, 0, 0, 0);
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

        // Create a display copy
        const displayTask = isRealInstance ? task : {
          ...task,
          id: `${task.id}-virtual-${date.getTime()}`, // Virtual ID
          dueDate: date.toISOString(), // Project the date for display
          status: displayStatus
        };

        dayTasks.push({
          task: displayTask,
          isVirtual: !isRealInstance,
          baseTask: task // Store the original task for editing
        });
      }
    });

    return dayTasks;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onDropTask) {
      onDropTask(taskId, date);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-3 flex items-center gap-2 px-1 flex-wrap">
        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Summary</span>
        <button
          type="button"
          onClick={toggleOverdue}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'overdue' ? 'border-red-400 bg-red-100 text-red-800' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
        >
          Overdue: {overdueCount}
        </button>
        <button
          type="button"
          onClick={toggleWeek}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'week' ? 'border-blue-400 bg-blue-100 text-blue-800' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
        >
          Due this week: {dueThisWeekCount}
        </button>
        <button
          type="button"
          onClick={toggleNoDue}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'nodue' ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          No due date: {missingDueCount}
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
                  }`}
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
                  }`}
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
                  }`}
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

      {filterMode === 'overdue' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {overdueTasks.length === 0 && (
            <div className="text-xs text-gray-400 italic px-1">No overdue tasks 🎉</div>
          )}
          {overdueTasks
            .slice()
            .sort((a, b) => {
              const ad = a.dueDate ? new Date(a.dueDate).getTime() : -Infinity;
              const bd = b.dueDate ? new Date(b.dueDate).getTime() : -Infinity;
              if (ad !== bd) return ad - bd; // oldest overdue first
              const pw: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
              const pDiff = pw[b.priority] - pw[a.priority];
              if (pDiff !== 0) return pDiff;
              return b.createdAt - a.createdAt;
            })
            .map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onMove={onMoveTask}
                onArchive={onArchiveTask}
                onDelete={onDeleteTask}
                hideMoveButtons={true}
                compactPriority={true}
                onToggleDone={(id) => onToggleDone(id)}
                layoutMode="sidebar"
              />
            ))}
        </div>
      )}

      {filterMode === 'week' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {dueThisWeekTasks.length === 0 && (
            <div className="text-xs text-gray-400 italic px-1">No tasks due this week 🎉</div>
          )}
          {dueThisWeekTasks
            .slice()
            .sort((a, b) => {
              const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
              const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
              if (ad !== bd) return ad - bd; // soonest first
              const pw: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
              const pDiff = pw[b.priority] - pw[a.priority];
              if (pDiff !== 0) return pDiff;
              return b.createdAt - a.createdAt;
            })
            .map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onMove={onMoveTask}
                onArchive={onArchiveTask}
                onDelete={onDeleteTask}
                hideMoveButtons={true}
                compactPriority={true}
                onToggleDone={(id) => onToggleDone(id)}
                layoutMode="sidebar"
              />
            ))}
        </div>
      )}

      {filterMode === 'nodue' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
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
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onMove={onMoveTask}
                onArchive={onArchiveTask}
                onDelete={onDeleteTask}
                hideMoveButtons={true}
                compactPriority={true}
                onToggleDone={(id) => onToggleDone(id)}
                layoutMode="sidebar"
              />
            ))}
        </div>
      )}

      {filterMode !== 'overdue' && filterMode !== 'week' && filterMode !== 'nodue' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-y-auto">
          {weekDays.map(day => {
            const dayTasks = getTasksForDay(day);
            const sortedDayTasks = dayTasks.slice().sort((a, b) => {
              const getStatusWeight = (s: Status) => {
                if (s === Status.DONE) return 2;
                if (s === Status.EXPIRED) return 1;
                return 0; // TODO, IN_PROGRESS
              };
              const aWeight = getStatusWeight(a.task.status);
              const bWeight = getStatusWeight(b.task.status);
              if (aWeight !== bWeight) return aWeight - bWeight;
              const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
              const pw = (t: typeof a.task) => priorityWeight[t.priority];
              const pDiff = pw(b.task) - pw(a.task);
              if (pDiff !== 0) return pDiff;
              const ad = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Infinity;
              const bd = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Infinity;
              if (ad !== bd) return ad - bd;
              return b.task.createdAt - a.task.createdAt;
            });
            const isToday = day.getDate() === new Date().getDate() &&
              day.getMonth() === new Date().getMonth() &&
              day.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col rounded-xl border ${isToday ? 'border-blue-300 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className={`p-3 border-b ${isToday ? 'border-blue-200 dark:border-blue-500/50 bg-blue-100/50 dark:bg-blue-900/50' : 'border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800'} rounded-t-xl`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>
                        {day.getDate()} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">{day.toLocaleDateString('en-US', { month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sortedDayTasks.length > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800">
                          {sortedDayTasks.length}
                        </span>
                      )}
                      {onAddTask && (
                        <button
                          onClick={() => onAddTask(day)}
                          className="p-1.5 rounded-md hover:bg-gray-200/50 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Add task"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-2">
                  {sortedDayTasks.map(({ task, isVirtual, baseTask }) => {
                    // Don't show virtual indicator for recurring tasks if due date is today or earlier
                    const taskDueDate = new Date(task.dueDate || Date.now());
                    taskDueDate.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const shouldShowVirtualIndicator = isVirtual && taskDueDate > today;

                    return (
                      <div key={task.id} className="space-y-1 overflow-visible">
                        <div>
                          <TaskCard
                            task={task}
                            onEdit={() => onEditTask(task)}
                            onMove={onMoveTask}
                            onArchive={onArchiveTask}
                            onDelete={onDeleteTask}
                            isVirtual={isVirtual}
                            showFutureIndicator={shouldShowVirtualIndicator}
                            hideMoveButtons={true}
                            compactPriority={true}
                            onToggleDone={() => isVirtual ? onToggleDone(baseTask.id, task.dueDate) : onToggleDone(task.id)}
                            layoutMode="sidebar"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {sortedDayTasks.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-xs text-gray-300 italic">No tasks</span>
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