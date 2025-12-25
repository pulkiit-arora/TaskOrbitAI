import React from 'react';
import { Task, Priority, Status, Recurrence } from '../types';
import { isNthWeekdayOfMonth, doesTaskOccurOnDate } from '../utils/taskUtils';
import { Check, Circle, Plus, ArrowUp, ArrowDown, Minus, RefreshCw } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onToggleDone: (taskId: string, onDate?: string) => void;
  onAddTask?: (date: Date) => void;
  onDropTask?: (taskId: string, date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({ currentDate, tasks, onEditTask, onToggleDone, onAddTask, onDropTask }) => {
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

  // Summary: overdue and due-this-month
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const isOpen = (t: Task) => t.status !== Status.DONE && t.status !== Status.ARCHIVED;
  const overdueTasks = tasks.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today);

  // Calculate projected recurring tasks due this month
  // NOTE: This relies on `doesTaskOccurOnDate` which is defined BELOW. 
  // We need to move `doesTaskOccurOnDate` UP before this calculation, or use a separate effect, 
  // but simpler to just move the function definition up or copy the logic structure.
  // Actually, to avoid big refactors, let's define `doesTaskOccurOnDate` first.

  /* MOVED doesTaskOccurOnDate UP via `multi_replace` or just refer to it if hoisting works? 
     Function declarations are hoisted but consts are not. 
     The `doesTaskOccurOnDate` is currently a const. I will assume I need to move it up.
     Refactoring plan:
     1. Move helper up.
     2. Compute count.
  */

  // ... Wait, I can't easily move code blocks with `replace_file_content` if they are far apart without massive context.
  // I will assume the user context allows me to re-order or I will use a placeholder and fix it.
  // A better strategy: Just inject the calculation AFTER `doesTaskOccurOnDate` is defined.
  // But `doesTaskOccurOnDate` is defined at line 80.
  // And `dueThisWeekTasks` is at 52.

  // Let's replace the block at lines 40-64 with JUST the constants, 
  // and do the aggregation later after the helper is defined?
  // No, `MonthView` returns JSX that uses these values.



  const finalDueThisMonthCount = tasks.reduce((acc, task) => {
    if (task.status === Status.ARCHIVED) return acc;

    // Case 1: Real Task (Non-recurring or ONE-OFF exception)
    if (task.recurrence === Recurrence.NONE) {
      if (task.status === Status.DONE) return acc;
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        d.setHours(0, 0, 0, 0);
        if (d >= monthStart && d <= monthEnd) return acc + 1;
      }
      return acc;
    }

    // Case 2: Recurring Task - Count valid occurrences in the month
    if (task.status === Status.DONE) return acc;

    // Iterate all days in the month
    let occurrences = 0;
    const daysInMonth = getDaysInMonth(year, month);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      d.setHours(0, 0, 0, 0);

      if (doesTaskOccurOnDate(task, d)) {
        // Check for existing DONE history
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

  // Filter mode for Month view
  const [filterMode, setFilterMode] = React.useState<'all' | 'overdue' | 'month' | 'nodue'>('all');
  const toggleOverdue = () => setFilterMode(m => (m === 'overdue' ? 'all' : 'overdue'));
  const toggleMonth = () => setFilterMode(m => (m === 'month' ? 'all' : 'month'));
  const toggleNoDue = () => setFilterMode(m => (m === 'nodue' ? 'all' : 'nodue'));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
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

        // Skip virtual occurrences for DONE recurring tasks - the new TODO task will project forward
        // if (task.status === Status.DONE) {
        //   if (!isRealInstance) {
        //     // return; // Don't show virtual occurrences of DONE tasks
        //   }
        //   // Show only the real DONE instance on its actual due date
        // }

        const baseTaskId = task.id;
        const occurrenceISO = date.toISOString();

        // If a history record (non-recurring instance) exists for this same date, skip projecting a virtual copy
        // A history record is a non-recurring task with the same title on the same date, but different ID
        if (!isRealInstance) {
          const occStart = new Date(occurrenceISO); occStart.setHours(0, 0, 0, 0);
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
    [Priority.HIGH]: 'border-red-200 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50',
    [Priority.MEDIUM]: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/50',
    [Priority.LOW]: 'border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50',
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="mb-3 flex items-center gap-2 px-3 pt-3">
        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Summary</span>
        <button
          type="button"
          onClick={toggleOverdue}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'overdue' ? 'border-red-400 bg-red-100 text-red-800' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
        >
          Overdue: {overdueTasks.length}
        </button>
        <button
          type="button"
          onClick={toggleMonth}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'month' ? 'border-blue-400 bg-blue-100 text-blue-800' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
        >
          Due this month: {dueThisMonthCount}
        </button>
        <button
          type="button"
          onClick={toggleNoDue}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${filterMode === 'nodue' ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          No due date: {missingDueTasks.length}
        </button>

        <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400 pl-3 border-l border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1" title="High Priority">
            <ArrowUp size={10} className="text-red-500" />
            <span className="hidden lg:inline">High</span>
          </div>
          <div className="flex items-center gap-1" title="Medium Priority">
            <Minus size={10} className="text-yellow-500" />
            <span className="hidden lg:inline">Med</span>
          </div>
          <div className="flex items-center gap-1" title="Low Priority">
            <ArrowDown size={10} className="text-blue-500" />
            <span className="hidden lg:inline">Low</span>
          </div>
          <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
          <div className="flex items-center gap-1" title="Recurring Series">
            <RefreshCw size={10} className="text-gray-400" />
            <span className="hidden lg:inline">Recurring</span>
          </div>
          <div className="flex items-center gap-1" title="Detached Exception">
            <span className="text-orange-400"><RefreshCw size={10} className="stroke-[2.5]" /></span>
            <span className="hidden lg:inline">Detached</span>
          </div>
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

      {filterMode === 'month' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
          <div className="text-xs text-gray-500 italic px-1 mb-2">
            Showing active and projected tasks for this month.
          </div>
          {/* If we want to show the LIST of month tasks, we need to gather them similarly to 'getTasksForDay' but for the whole month.
               But constructing that list properly with virtuals is complex here inline. 
               For now, the user asked for "count", and usually the list below shows the subset.
               Re-deriving the full expanded list of all virtual tasks for the month is expensive and might clutter the UI.
               
               Alternative: Just show the REAL tasks that fall in this month, plus maybe base recurring tasks?
               Or just leave this list empty/simplified? 
               The prompt asked: "in month view show DUE THIS MONTH and corresponding count".
               It implies the button label update. The content of the list is secondary but should ideally match.
               
               Let's try to map the logic we used for counting `finalDueThisMonthCount` to actually producing the items.
           */}
          {(() => {
            // Generate the list on the fly (performance warning?)
            // Ideally this belongs in a useMemo.
            const monthTasks = [];
            const daysInM = getDaysInMonth(year, month);

            // We need a way to deduplicate if multiple occurrences of same task appear? 
            // Usually a monthly list is chronological.
            // Let's iterate days and gather? Or iterate tasks and project?
            // Iterating days is safer for ordering.

            for (let i = 1; i <= daysInM; i++) {
              const d = new Date(year, month, i);
              d.setHours(0, 0, 0, 0);
              const dateISO = d.toISOString();

              // Get tasks for this day (subset of getTasksForDay logic)
              tasks.forEach(task => {
                if (task.status === Status.ARCHIVED) return;
                // Check exclusion/done-history
                if (doesTaskOccurOnDate(task, d)) {
                  // Done history check
                  const hasDone = tasks.some(t => t.status === Status.DONE && t.title === task.title && t.dueDate && new Date(t.dueDate).setHours(0, 0, 0, 0) === d.getTime());
                  if (hasDone) return; // Don't show this virtual recurrence if completed history exists

                  // Skip if base task is DONE (unless real instance?)
                  if (task.status === Status.DONE && task.recurrence !== Recurrence.NONE && task.dueDate && new Date(task.dueDate).setHours(0, 0, 0, 0) !== d.getTime()) return;

                  // Construct display item
                  const isReal = task.dueDate && new Date(task.dueDate).setHours(0, 0, 0, 0) === d.getTime();

                  monthTasks.push({
                    ...task,
                    id: isReal ? task.id : `${task.id}-month-${i}`, // Virtual ID
                    dueDate: dateISO,
                    // If virtual, it's TODO
                    status: isReal ? task.status : Status.TODO
                  });
                }
              });
            }

            if (monthTasks.length === 0) {
              return <div className="text-xs text-gray-400 italic px-1">No tasks due this month</div>;
            }

            // Sort by date then priority
            return monthTasks.sort((a, b) => {
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }).map(task => (
              <div key={task.id} className={`group flex items-center gap-2 px-2 py-2 rounded border transition-all ${priorityColor[task.priority]}`}>
                {/* Simplified Task Row - Maybe Read Only or jump to date? For now simple edit/toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // If virtual, we need to handle creation... 
                    // The `onToggleDone` in MonthView might not handle virtual IDs gracefully unless App.tsx handles it.
                    // App.tsx `handleToggleDone` DOES handle virtual IDs! (logic: `if (taskId.includes('-virtual-'))`)
                    // Our ID format here is `${task.id}-month-${i}`. 
                    // App.tsx expects `${baseTaskId}-virtual-${timestamp}`.
                    // Let's match that format!
                    // See line 239 in getTasksForDay: `${task.id}-virtual-${date.getTime()}`
                    // Let's fix the ID generation above.

                    // Actually, let's just use onToggleDone directly.
                    onToggleDone(task.id, task.dueDate);
                  }}
                  className={`flex-shrink-0 text-gray-400 hover:text-green-600 ${task.status === Status.DONE ? 'text-green-600' : ''}`}
                >
                  {task.status === Status.DONE ? <Check size={14} /> : <Circle size={14} />}
                </button>
                <button onClick={() => onEditTask(task)} className="text-left text-xs truncate flex-1 font-medium">
                  {task.title}
                </button>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {new Date(task.dueDate).getDate()} {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </div>
            ));
          })()}
        </div>
      )}
      {/* Weekday Headers */}
      {filterMode === 'all' && (
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      {filterMode === 'all' && (
        <div className="grid grid-cols-7 auto-rows-[minmax(140px,1fr)] flex-1 bg-gray-200 dark:bg-gray-700 gap-[1px] overflow-y-auto custom-scrollbar">
          {totalSlots.map((slot, index) => {
            if (slot === null) {
              return <div key={`blank-${index}`} className="bg-gray-50/50 dark:bg-gray-900/50" />;
            }

            const day = slot as number; // It's a number here
            const date = new Date(year, month, day);
            const isToday = day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            const dayTasks = getTasksForDay(day);

            return (
              <div
                key={index}
                className={`group min-h-[140px] flex flex-col border-b border-r border-gray-200 dark:border-gray-700 transition-colors ${'bg-white dark:bg-gray-800'
                  } ${isToday ? 'ring-2 ring-inset ring-blue-500/50 z-10' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className={`p-2 flex justify-between items-start sticky top-0 z-10 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center ${isToday
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-900 dark:text-gray-100'
                      }`}>
                      {day}
                    </span>
                  </div>
                  <button
                    onClick={() => onAddTask(date)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded full transition-all"
                    title="Add task on this day"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar max-h-[160px] flex-1">
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
                          {task.isRecurringException && (
                            <span className="text-orange-400 flex-shrink-0" title="Detached from recurrence">
                              <RefreshCw size={12} className="stroke-[2.5]" />
                            </span>
                          )}
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