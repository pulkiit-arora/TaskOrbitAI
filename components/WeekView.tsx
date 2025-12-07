import React from 'react';
import { Task, Priority, Status, Recurrence } from '../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onMoveTask: (taskId: string, direction: 'prev' | 'next') => void;
  onArchiveTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask?: (date: Date) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({ currentDate, tasks, onEditTask, onMoveTask, onArchiveTask, onDeleteTask, onAddTask }) => {
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
  const overdueTasks = tasks.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today);
  const overdueCount = overdueTasks.length;
  const dueThisWeekTasks = tasks.filter(t => {
    if (!t.dueDate || !isOpen(t)) return false;
    const d = new Date(t.dueDate);
    return d >= weekStart && d <= weekEnd;
  });
  const dueThisWeekCount = dueThisWeekTasks.length;
  const missingDueTasks = tasks.filter(t => !t.dueDate && isOpen(t));
  const missingDueCount = missingDueTasks.length;

  // Filter mode: 'all' | 'overdue' | 'week' | 'nodue'
  const [filterMode, setFilterMode] = React.useState<'all' | 'overdue' | 'week' | 'nodue'>('all');
  const toggleOverdue = () => setFilterMode(m => (m === 'overdue' ? 'all' : 'overdue'));
  const toggleWeek = () => setFilterMode(m => (m === 'week' ? 'all' : 'week'));
  const toggleNoDue = () => setFilterMode(m => (m === 'nodue' ? 'all' : 'nodue'));

  const doesTaskOccurOnDate = (task: Task, date: Date): boolean => {
      // 1. Basic filtering: Archived tasks are hidden unless we want them? (Usually handled by parent)
      // Assuming parent filters 'ARCHIVED' based on toggle, but we still check for 'DONE' behavior.
      
      const checkDate = new Date(date);
      checkDate.setHours(0,0,0,0);
      
      // Determine start anchor
      const startAnchor = task.recurrenceStart 
        ? new Date(task.recurrenceStart) 
        : (task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt));
      startAnchor.setHours(0,0,0,0);

      // Determine end anchor
      let endAnchor: Date | null = null;
      if (task.recurrenceEnd) {
          endAnchor = new Date(task.recurrenceEnd);
          endAnchor.setHours(23,59,59,999);
      }

      // Check range
      if (checkDate < startAnchor) return false;
      if (endAnchor && checkDate > endAnchor) return false;

      // Check Recurrence Rule
      switch (task.recurrence) {
        case Recurrence.NONE:
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            due.setHours(0,0,0,0);
            return due.getTime() === checkDate.getTime();
        
        case Recurrence.DAILY:
            return true;
        
        case Recurrence.WEEKLY:
            return checkDate.getDay() === startAnchor.getDay();
        
        case Recurrence.MONTHLY:
            return checkDate.getDate() === startAnchor.getDate();
        
        case Recurrence.QUARTERLY:
            const monthDiff = (checkDate.getFullYear() - startAnchor.getFullYear()) * 12 + (checkDate.getMonth() - startAnchor.getMonth());
            return checkDate.getDate() === startAnchor.getDate() && (monthDiff % 3 === 0);
            
        case Recurrence.YEARLY:
            return checkDate.getDate() === startAnchor.getDate() && 
                   checkDate.getMonth() === startAnchor.getMonth();
            
        default:
            return false;
      }
  };

  const getTasksForDay = (date: Date) => {
    const dayTasks: { task: Task; isVirtual: boolean }[] = [];

    tasks.forEach(task => {
        // Skip archived in calendar views typically, unless explicitly desired. 
        // Logic passed from App says 'tasks' is already filtered for ARCHIVED if hidden.
        if (task.status === Status.ARCHIVED) return;

        if (doesTaskOccurOnDate(task, date)) {
            // Check if this is the REAL instance
            let isRealInstance = false;
            if (task.dueDate) {
                const due = new Date(task.dueDate);
                due.setHours(0,0,0,0);
                const check = new Date(date);
                check.setHours(0,0,0,0);
                isRealInstance = due.getTime() === check.getTime();
            }

            // Only show DONE tasks if they are the real instance (history). 
            // Don't show future recurring 'ghosts' if the main task is already DONE? 
            // Actually, if a task is recurring, the 'DONE' state usually applies to the last finished one,
            // and the system creates a new 'TODO' one. 
            // So if we have a TODO recurring task, we project it forward.
            
            if (task.status === Status.DONE && !isRealInstance) {
                return;
            }

            // If a DONE history exists for this same date (same title heuristic), skip projecting a virtual duplicate
            if (!isRealInstance) {
                const occStart = new Date(date); occStart.setHours(0,0,0,0);
                const hasDoneHistory = tasks.some(tt => {
                    if (tt.status !== Status.DONE || !tt.dueDate) return false;
                    const dd = new Date(tt.dueDate); dd.setHours(0,0,0,0);
                    return dd.getTime() === occStart.getTime() && tt.title === task.title;
                });
                if (hasDoneHistory) {
                    return; // skip adding virtual duplicate
                }
            }

            // Create a display copy
            const displayTask = isRealInstance ? task : {
                ...task,
                id: `${task.id}-virtual-${date.getTime()}`, // Virtual ID
                dueDate: date.toISOString(), // Project the date for display
                status: Status.TODO // Projected are always TODO
            };

            dayTasks.push({
                task: displayTask,
                isVirtual: !isRealInstance
            });
        }
    });

    return dayTasks;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="text-sm text-gray-600 font-medium">Summary</span>
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
              />
            ))}
        </div>
      )}

      {filterMode !== 'overdue' && filterMode !== 'week' && filterMode !== 'nodue' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-y-auto">
      {weekDays.map(day => {
        const dayTasks = getTasksForDay(day);
        const sortedDayTasks = dayTasks.slice().sort((a, b) => {
          const aDone = a.task.status === Status.DONE ? 1 : 0;
          const bDone = b.task.status === Status.DONE ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          const pw = (t: typeof a.task) => priorityWeight[t.priority];
          const pDiff = pw(b.task) - pw(a.task);
          if (pDiff !== 0) return pDiff;
          const ad = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Infinity;
          const bd = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Infinity;
          if (ad !== bd) return ad - bd;
          return b.task.createdAt - a.task.createdAt;
        });
        const isToday = new Date().toDateString() === day.toDateString();
        
        return (
          <div key={day.toISOString()} className={`flex flex-col rounded-xl border ${isToday ? 'border-blue-300 bg-blue-50/20' : 'border-gray-200 bg-gray-50'}`}>
            <div className={`p-3 border-b ${isToday ? 'border-blue-200 bg-blue-100/50' : 'border-gray-200 bg-gray-100/50'} rounded-t-xl`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                    {day.getDate()} <span className="text-sm font-normal text-gray-400">{day.toLocaleDateString('en-US', { month: 'short' })}</span>
                  </div>
                </div>
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
            
            <div className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-2">
              {sortedDayTasks.map(({ task, isVirtual }) => (
                <div key={task.id} className="space-y-1" style={{ contain: 'layout style paint' }}>
                  {task.status === Status.DONE && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">Done</span>
                  )}
                  <div className={`${task.status === Status.DONE ? 'line-through text-gray-500' : ''}`}>
                    <TaskCard 
                      task={task} 
                      onEdit={onEditTask} 
                      onMove={onMoveTask} 
                      onArchive={onArchiveTask} 
                      onDelete={onDeleteTask}
                      isVirtual={isVirtual}
                    />
                  </div>
                </div>
              ))}
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
      )}
    </div>
  );
};