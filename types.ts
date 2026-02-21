export enum Status {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED'
}

export type ViewMode = 'board' | 'week' | 'month' | 'today' | 'analytics' | 'planner' | 'eisenhower';

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum Recurrence {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface TimeEntry {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  label?: string;
}

export interface Task {
  id: string;
  seriesId?: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate?: string;
  recurrence: Recurrence;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  recurrenceMonthDay?: number;
  recurrenceMonthNth?: number;
  recurrenceMonthWeekday?: number;
  recurrenceMonths?: number[];
  recurrenceStart?: string;
  recurrenceEnd?: string;
  createdAt: number;
  comments?: TaskComment[];
  excludedDates?: string[];
  isRecurringException?: boolean;
  originalRecurrence?: Recurrence;
  tags?: Tag[];
  completedAt?: number;
  // Subtasks for checklist functionality
  subtasks?: Subtask[];
  // Task dependencies - IDs of tasks that block this one
  blockedBy?: string[];
  // Pinning
  pinned?: boolean;
  // Snooze/Defer
  snoozedUntil?: string;
  // Time tracking
  timeEntries?: TimeEntry[];
  // Daily planner
  estimatedMinutes?: number;
  planOrder?: number;
  // Custom board status
  customStatus?: string;
}

export interface AISuggestion {
  title: string;
  description: string;
  priority: Priority;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: Priority;
  recurrence: Recurrence;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  tags?: Tag[];
  subtasks?: Subtask[];
  createdAt: number;
}