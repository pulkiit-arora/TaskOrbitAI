export enum Status {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ARCHIVED = 'ARCHIVED'
}

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

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate?: string; // ISO Date string
  recurrence: Recurrence;
  recurrenceStart?: string; // ISO Date string
  recurrenceEnd?: string; // ISO Date string
  createdAt: number;
}

export interface AISuggestion {
  title: string;
  description: string;
  priority: Priority;
}