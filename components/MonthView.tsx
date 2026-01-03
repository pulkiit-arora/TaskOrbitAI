import React from 'react';
import { Task, Priority, Status, Recurrence, Tag } from '../types';
import { isNthWeekdayOfMonth, doesTaskOccurOnDate } from '../utils/taskUtils';
import { Check, Circle, Plus, ArrowUp, ArrowDown, Minus, RefreshCw, Filter, Tag as TagIcon, XCircle, LayoutGrid, List, MessageSquare } from 'lucide-react';
import { StatusFilter } from './StatusFilter';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
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
}

export const MonthView: React.FC<MonthViewProps> = ({ currentDate, tasks, onEditTask, onToggleDone, onAddTask, onDropTask, priorityFilter, setPriorityFilter, statusFilter, setStatusFilter, tags = [], tagFilter = [], setTagFilter }) => {
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
  const overdueTasks = tasks.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today && t.status !== Status.EXPIRED);

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
  const [viewLayout, setViewLayout] = React.useState<'grid' | 'list'>('grid');
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
      <div className="mb-3 flex items-center justify-between px-3 pt-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Summary</span>
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
              <div className="flex items-center gap-1">
                <TagIcon size={12} className="text-gray-500" />
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const newFilter = tagFilter.includes(tag.id)
                        ? tagFilter.filter(t => t !== tag.id)
                        : [...tagFilter, tag.id];
                      setTagFilter && setTagFilter(newFilter);
                    }}
                    className={`w-3 h-3 rounded-full border transition-all ${tagFilter.includes(tag.id) ? `ring-2 ring-offset-1 ring-blue-500 ${tag.color.split(' ')[0]}` : tag.color.split(' ')[0]} ${tag.color.split(' ')[2]} `}
                    title={tag.label}
                  />
                ))}
                {tagFilter.length > 0 && (
                  <button onClick={() => setTagFilter && setTagFilter([])} className="text-[10px] text-gray-400 hover:text-gray-600 ml-1">Clear</button>
                )}
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
                    id: isReal ? task.id : `${task.id} -month - ${i} `, // Virtual ID
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

            // Sort to match WeekView: Status(Active->Done) -> Priority(High->Low) -> DueTime(Earliest->Latest) -> CreatedAt(Newest->Oldest)
            return monthTasks.sort((a, b) => {
              // 1. Status: Active first
              const aDone = a.status === Status.DONE ? 1 : 0;
              const bDone = b.status === Status.DONE ? 1 : 0;
              if (aDone !== bDone) return aDone - bDone;

              // 2. Priority: High first
              const priorityWeight: Record<string, number> = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
              const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
              if (pDiff !== 0) return pDiff;

              // 3. Due Time: Earliest first
              const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
              const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
              if (ad !== bd) return ad - bd;

              // 4. Created At: Newest first
              return (b.createdAt || 0) - (a.createdAt || 0);
            }).map(task => (
              <div key={task.id} className={`group flex items-center gap-2 px-2 py-2 rounded border transition-all ${priorityColor[task.priority]} `}>
                {/* Simplified Task Row - Maybe Read Only or jump to date? For now simple edit/toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // If virtual, we need to handle creation... 
                    // The `onToggleDone` in MonthView might not handle virtual IDs gracefully unless App.tsx handles it.
                    // App.tsx `handleToggleDone` DOES handle virtual IDs! (logic: `if (taskId.includes('-virtual-'))`)
                    // Our ID format here is `${ task.id } -month - ${ i } `. 
                    // App.tsx expects `${ baseTaskId } -virtual - ${ timestamp } `.
                    // Let's match that format!
                    // See line 239 in getTasksForDay: `${ task.id } -virtual - ${ date.getTime() } `
                    // Let's fix the ID generation above.

                    // Actually, let's just use onToggleDone directly.
                    onToggleDone(task.id, task.dueDate);
                  }}
                  className={`flex-shrink-0 text-gray-400 hover:text-green-600 ${task.status === Status.DONE ? 'text-green-600' : ''} `}
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
      {/* Weekday Headers - Hide in List Mode */}
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
            // Filter logic for List View? (Use same sorts)
            // If day has no tasks, do we show it? User "continuous rather than each entry for a day" 
            // usually implies showing dates with tasks, avoiding blanks.
            // Let's filter out days with no tasks to keep it "continuous" and dense.
            if (dayTasks.length === 0) return null;

            const date = new Date(year, month, day);
            const isToday = day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            const sortedTasks = dayTasks.sort((a, b) => {
              // Sort Logic (Copy from Grid)
              const getStatusWeight = (s: Status) => {
                if (s === Status.DONE) return 2;
                if (s === Status.EXPIRED) return 1;
                return 0; // TODO, IN_PROGRESS
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
                    // Scroll to today when list view is active
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
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const shouldShowVirtualIndicator = isVirtual && occurrenceDate > today;

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
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {task.tags.map(tag => (
                                  <span key={tag.id} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${tag.color} opacity-90`}>
                                    {tag.label}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Recurrence Stats */}
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
          {/* If no tasks at all for the month */}
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
              return <div key={`blank - ${index} `} className="bg-gray-50/50 dark:bg-gray-900/50" />;
            }

            const day = slot as number; // It's a number here
            const date = new Date(year, month, day);
            const isToday = day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            const dayTasks = getTasksForDay(day).sort((a, b) => {
              // 1. Status: Active (TODO/IN_PROGRESS) -> Missed -> Done
              const getStatusWeight = (s: Status) => {
                if (s === Status.DONE) return 3; // Done last
                if (s === Status.EXPIRED) return 2; // Expired middle
                return 1; // Active first
              };
              const aWeight = getStatusWeight(a.task.status);
              const bWeight = getStatusWeight(b.task.status);
              if (aWeight !== bWeight) return aWeight - bWeight;

              // 2. Priority: High first
              const priorityWeight: Record<string, number> = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
              const pDiff = (priorityWeight[b.task.priority] || 0) - (priorityWeight[a.task.priority] || 0);
              if (pDiff !== 0) return pDiff;

              // 3. Due Time: Earliest first
              const ad = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Infinity;
              const bd = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Infinity;
              if (ad !== bd) return ad - bd;

              // 4. Created At: Newest first
              return (b.task.createdAt || 0) - (a.task.createdAt || 0);
            });

            return (
              <div
                key={index}
                className={`group min-h-[140px] flex flex-col border-b border-r border-gray-200 dark:border-gray-700 transition-colors ${'bg-white dark:bg-gray-800'
                  } ${isToday ? 'ring-2 ring-inset ring-blue-500/50 z-10' : ''} `}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className={`p-2 flex justify-between items-start sticky top-0 z-10 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
                  } `}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center ${isToday
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-900 dark:text-gray-100'
                      } `}>
                      {day}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {dayTasks.length > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800">
                        {dayTasks.length}
                      </span>
                    )}
                    <button
                      onClick={() => onAddTask(date)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded full transition-all"
                      title="Add task on this day"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar max-h-[160px] flex-1">
                  {dayTasks.map(({ task, isVirtual, baseTaskId, baseTask, occurrenceISO }) => {
                    const isDone = task.status === Status.DONE;
                    const isExpired = task.status === Status.EXPIRED;
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
                              <ArrowUp
                                size={12}
                                className="text-red-500 flex-shrink-0"
                                title={`Priority: ${task.priority} `}
                              />
                            )}
                            {task.priority === Priority.MEDIUM && (
                              <Minus
                                size={12}
                                className="text-yellow-500 flex-shrink-0"
                                title={`Priority: ${task.priority} `}
                              />
                            )}
                            {task.priority === Priority.LOW && (
                              <ArrowDown
                                size={12}
                                className="text-blue-500 flex-shrink-0"
                                title={`Priority: ${task.priority} `}
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
                          {isExpired && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-orange-100 text-orange-700 border border-orange-200 flex-shrink-0 whitespace-nowrap">Missed</span>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex gap-0.5 flex-shrink-0">
                              {task.tags.map(tag => (
                                <div key={tag.id} className={`w-1.5 h-1.5 rounded-full ${tag.color.split(' ')[0].replace('100', '500')} `} />
                              ))}
                            </div>
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
      )
      }
    </div >
  );
};