import React from 'react';
import { Task, Priority, Status, Recurrence } from '../types';
import { Check, Circle } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onToggleDone: (taskId: string, onDate?: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({ currentDate, tasks, onEditTask, onToggleDone }) => {
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

  const getTasksForDay = (day: number) => {
    const date = new Date(year, month, day);
    const dayTasks: { task: Task; isVirtual: boolean; baseTaskId: string; occurrenceISO: string }[] = [];

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

            if (task.status === Status.DONE && !isRealInstance) {
                return;
            }

            const baseTaskId = task.id;
            const occurrenceISO = date.toISOString();

            // If a DONE history exists for this same date (same title match heuristic), skip projecting a virtual copy
            if (!isRealInstance) {
              const occStart = new Date(occurrenceISO); occStart.setHours(0,0,0,0);
              const hasDoneHistory = tasks.some(tt => {
                if (tt.status !== Status.DONE || !tt.dueDate) return false;
                const dd = new Date(tt.dueDate); dd.setHours(0,0,0,0);
                return dd.getTime() === occStart.getTime() && tt.title === task.title;
              });
              if (hasDoneHistory) {
                return; // skip adding virtual duplicate
              }
            }

            const displayTask = isRealInstance ? task : {
                ...task,
                id: `${task.id}-virtual-${date.getTime()}`,
                dueDate: occurrenceISO,
                status: Status.TODO
            };

            dayTasks.push({
                task: displayTask,
                isVirtual: !isRealInstance,
                baseTaskId,
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
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
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
            <div key={`day-${day}`} className={`min-h-[100px] bg-white p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                  {day}
                </span>
              </div>
              
              <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar max-h-[120px]">
                {dayTasks.map(({ task, isVirtual, baseTaskId, occurrenceISO }) => {
                  const isDone = task.status === Status.DONE;
                  return (
                    <div
                      key={task.id}
                      className={`group flex items-center gap-2 px-1.5 py-1 rounded border transition-all 
                        ${isDone ? 'bg-gray-100 border-gray-100 opacity-60' : priorityColor[task.priority]} 
                        ${isVirtual ? 'opacity-60 border-dashed bg-white' : 'hover:shadow-sm'}
                      `}
                    >
                      <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            // Allow toggling even for virtual occurrences by targeting the base task id
                            if (isVirtual) {
                              onToggleDone(baseTaskId, occurrenceISO);
                            } else {
                              onToggleDone(task.id);
                            }
                        }}
                        className={`flex-shrink-0 transition-colors 
                            ${isVirtual ? 'text-gray-300 hover:text-green-600 cursor-pointer' : 'text-gray-400 hover:text-green-600 cursor-pointer'}
                            ${isDone ? 'text-green-600' : ''}`}
                      >
                         {isDone ? <Check size={14} className="stroke-[3]" /> : <Circle size={14} />}
                      </button>
                      
                      <button 
                        onClick={() => !isVirtual && onEditTask(task)}
                        disabled={isVirtual}
                        className={`text-left text-xs truncate flex-1 font-medium 
                            ${isDone ? 'line-through text-gray-500' : ''}
                            ${isVirtual ? 'cursor-default' : 'cursor-pointer'}
                        `}
                      >
                        {task.title}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};