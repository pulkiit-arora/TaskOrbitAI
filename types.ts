export enum Status {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED'
}

export type ViewMode = 'board' | 'week' | 'month' | 'today' | 'analytics';

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

export interface Task {
  id: string;
  seriesId?: string; // ID linking recurrence instances together
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate?: string; // ISO Date string
  recurrence: Recurrence;
  // Interval for recurrence (e.g., every 2 months). Defaults to 1 when not provided.
  recurrenceInterval?: number;
  // For weekly recurrence: array of weekdays to occur on (0 = Sunday, 6 = Saturday).
  recurrenceWeekdays?: number[];
  // For monthly recurrence: specific day of month (1-31). If absent, the original dueDate's day is used.
  recurrenceMonthDay?: number;
  // For monthly-by-weekday rules: nth (1..4 or -1 for last) and weekday (0=Sun..6=Sat)
  recurrenceMonthNth?: number; // e.g., 1 = first, 2 = second, -1 = last
  recurrenceMonthWeekday?: number; // 0..6
  recurrenceMonths?: number[]; // 0..11, specific months to occur in
  recurrenceStart?: string; // ISO Date string
  recurrenceEnd?: string; // ISO Date string
  createdAt: number;
  // Progress comments for the task. Users can add multiple comments to track progress.
  comments?: TaskComment[];
  // Array of ISO date strings to exclude from recurrence (deleted/moved occurrences)
  excludedDates?: string[];
  // Indicates if this task was detached from a recurrence (is an exception)
  isRecurringException?: boolean;
  // If detached, this stores the original recurrence type for display purposes
  originalRecurrence?: Recurrence;
  tags?: Tag[];
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