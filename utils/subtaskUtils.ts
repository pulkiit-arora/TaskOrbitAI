import { Task, Status, Subtask } from '../types';

/**
 * Calculate subtask completion progress.
 * Returns { completed, total, percentage }
 */
export const getSubtaskProgress = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) {
        return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = task.subtasks.filter(s => s.completed).length;
    const total = task.subtasks.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
};

/**
 * Check if a task is blocked by any incomplete dependencies.
 */
export const isTaskBlocked = (task: Task, allTasks: Task[]): boolean => {
    if (!task.blockedBy || task.blockedBy.length === 0) return false;
    return task.blockedBy.some(blockerId => {
        const blocker = allTasks.find(t => t.id === blockerId);
        return blocker && blocker.status !== Status.DONE && blocker.status !== Status.ARCHIVED;
    });
};

/**
 * Get the list of tasks that are blocking this task.
 */
export const getBlockingTasks = (task: Task, allTasks: Task[]): Task[] => {
    if (!task.blockedBy || task.blockedBy.length === 0) return [];
    return task.blockedBy
        .map(id => allTasks.find(t => t.id === id))
        .filter((t): t is Task => t !== undefined && t.status !== Status.DONE && t.status !== Status.ARCHIVED);
};

/**
 * Get all tasks that this task is blocking (reverse lookup).
 */
export const getBlockedTasks = (taskId: string, allTasks: Task[]): Task[] => {
    return allTasks.filter(t => t.blockedBy?.includes(taskId));
};

/**
 * Create a new subtask with auto-generated ID and order.
 */
export const createSubtask = (title: string, existingSubtasks: Subtask[] = []): Subtask => {
    const maxOrder = existingSubtasks.reduce((max, s) => Math.max(max, s.order), 0);
    return {
        id: crypto.randomUUID(),
        title,
        completed: false,
        order: maxOrder + 1
    };
};

/**
 * Toggle a subtask's completion status.
 */
export const toggleSubtask = (subtasks: Subtask[], subtaskId: string): Subtask[] => {
    return subtasks.map(s =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
};

/**
 * Delete a subtask by ID.
 */
export const deleteSubtask = (subtasks: Subtask[], subtaskId: string): Subtask[] => {
    return subtasks.filter(s => s.id !== subtaskId);
};

/**
 * Reorder subtasks - move item from one position to another.
 */
export const reorderSubtasks = (subtasks: Subtask[], fromIndex: number, toIndex: number): Subtask[] => {
    const result = [...subtasks];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result.map((s, i) => ({ ...s, order: i }));
};
