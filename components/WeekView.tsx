import React from 'react';
import { Task, Priority, Status, Recurrence } from '../types';
import { TaskCard } from './TaskCard';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onMoveTask: (taskId: string, direction: 'prev' | 'next') => void;
  onArchiveTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({ currentDate, tasks, onEditTask, onMoveTask, onArchiveTask, onDeleteTask }) => {
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
    <div className="flex h-full gap-4 overflow-x-auto min-w-[1000px]">
      {weekDays.map(day => {
        const dayTasks = getTasksForDay(day);
        const isToday = new Date().toDateString() === day.toDateString();
        
        return (
          <div key={day.toISOString()} className={`flex-1 flex flex-col min-w-[200px] rounded-xl border ${isToday ? 'border-blue-300 bg-blue-50/20' : 'border-gray-200 bg-gray-50'}`}>
            <div className={`p-3 border-b ${isToday ? 'border-blue-200 bg-blue-100/50' : 'border-gray-200 bg-gray-100/50'} rounded-t-xl`}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                {day.getDate()} <span className="text-sm font-normal text-gray-400">{day.toLocaleDateString('en-US', { month: 'short' })}</span>
              </div>
            </div>
            
            <div className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-2">
              {dayTasks.map(({ task, isVirtual }) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onEdit={onEditTask} 
                  onMove={onMoveTask} 
                  onArchive={onArchiveTask} 
                  onDelete={onDeleteTask}
                  isVirtual={isVirtual}
                />
              ))}
              {dayTasks.length === 0 && (
                <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-gray-300 italic">No tasks</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};