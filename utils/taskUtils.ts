import { Task, Priority, Recurrence, Status } from '../types';

export const calculateNextDueDate = (currentDate: string, recurrence: Recurrence): Date => {
  const date = new Date(currentDate);
  switch (recurrence) {
    case Recurrence.DAILY: date.setDate(date.getDate() + 1); break;
    case Recurrence.WEEKLY: date.setDate(date.getDate() + 7); break;
    case Recurrence.MONTHLY: date.setMonth(date.getMonth() + 1); break;
    case Recurrence.QUARTERLY: date.setMonth(date.getMonth() + 3); break;
    case Recurrence.YEARLY: date.setFullYear(date.getFullYear() + 1); break;
  }
  return date;
};

export const sortTasks = (taskList: Task[], sortBy: 'priority' | 'dueDate'): Task[] => {
  return taskList.sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return b.createdAt - a.createdAt;
    } else {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      return b.createdAt - a.createdAt;
    }
  });
};

export const isOpen = (t: Task) => t.status !== Status.DONE && t.status !== Status.ARCHIVED;

