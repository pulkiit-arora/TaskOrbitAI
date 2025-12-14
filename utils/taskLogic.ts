
import { Task, Status, Recurrence } from '../types';
import { calculateNextDueDate } from './taskUtils';

/**
 * Processes a status change for a task, handling recurrence logic.
 * 
 * @param tasks Current list of tasks
 * @param taskId ID of the task being updated
 * @param newStatus New status to apply
 * @returns Updated list of tasks (including any new recurring tasks created)
 */
export const processTaskStatusChange = (tasks: Task[], taskId: string, newStatus: Status): Task[] => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return tasks;

    // Case 1: Un-completing a recurring task (DONE -> TODO)
    // We desire to remove the *next* auto-generated task if it exists, to avoid duplicates.
    if (task.status === Status.DONE && newStatus === Status.TODO && task.recurrence !== Recurrence.NONE) {
        const baseDueISO = task.dueDate || new Date().toISOString();
        const anchorISO = task.recurrenceStart || task.dueDate || new Date(task.createdAt).toISOString();

        const expectedNextDue = calculateNextDueDate(
            baseDueISO,
            task.recurrence,
            task.recurrenceInterval || 1,
            task.recurrenceWeekdays,
            task.recurrenceMonthDay,
            anchorISO,
            task.recurrenceMonthNth,
            task.recurrenceMonthWeekday
        ).toISOString();

        let removed = false;
        // Filter out the auto-generated next task
        const pruned = tasks.filter(t => {
            if (removed) return true; // Only remove one
            const isAutoNext = (
                t.id !== task.id &&
                t.status === Status.TODO &&
                t.recurrence === task.recurrence &&
                (t.recurrenceInterval || 1) === (task.recurrenceInterval || 1) &&
                JSON.stringify(t.recurrenceWeekdays || []) === JSON.stringify(task.recurrenceWeekdays || []) &&
                (t.recurrenceMonthDay || null) === (task.recurrenceMonthDay || null) &&
                t.title === task.title &&
                t.description === task.description &&
                t.priority === task.priority &&
                (task.dueDate ? t.dueDate === expectedNextDue : true)
            );
            if (isAutoNext) {
                removed = true;
                return false;
            }
            return true;
        });

        // Fallback: if exact match not found, look for similar Todo candidates to remove? 
        // The original code had a fallback logic here.
        if (!removed && !task.dueDate) {
            const candidates = tasks.filter(t => (
                t.id !== task.id &&
                t.status === Status.TODO &&
                t.recurrence === task.recurrence &&
                t.title === task.title
            ));
            if (candidates.length > 0) {
                // Remove the latest one created? Logic was: sort by createdAt descending, take first.
                // We can replicate that logic but let's stick to safe "pruned" for now from the original.
                // Actually, let's include the secondary pruner to match original behavior 1:1 if possible,
                // or improve it. For now, strict replication of original behavior:
                const bestCandidate = candidates.sort((a, b) => b.createdAt - a.createdAt)[0];
                if (bestCandidate) {
                    return tasks.filter(t => t.id !== bestCandidate.id).map(t => t.id === taskId ? ({ ...t, status: newStatus }) : t);
                }
            }
        }

        return pruned.map(t => t.id === taskId ? ({ ...t, status: newStatus }) : t);
    }

    // Case 2: Completing a recurring task (TODO/IN_PROGRESS -> DONE)
    if (newStatus === Status.DONE && task.recurrence !== Recurrence.NONE && task.status !== Status.DONE) {
        const anchorISO2 = task.recurrenceStart || task.dueDate || new Date(task.createdAt).toISOString();
        const nextDueDate = calculateNextDueDate(
            task.dueDate || new Date().toISOString(),
            task.recurrence,
            task.recurrenceInterval || 1,
            task.recurrenceWeekdays,
            task.recurrenceMonthDay,
            anchorISO2,
            task.recurrenceMonthNth,
            task.recurrenceMonthWeekday
        );

        const nextTask: Task = {
            ...task,
            id: crypto.randomUUID(),
            status: Status.TODO,
            dueDate: nextDueDate.toISOString(),
            recurrenceInterval: task.recurrenceInterval,
            recurrenceWeekdays: task.recurrenceWeekdays,
            recurrenceMonthDay: task.recurrenceMonthDay,
            recurrenceMonthNth: task.recurrenceMonthNth,
            recurrenceMonthWeekday: task.recurrenceMonthWeekday,
            createdAt: Date.now()
        };
        return [...tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t), nextTask];
    }

    // Case 3: Simple status update
    return tasks.map(t => t.id === taskId ? ({ ...t, status: newStatus }) : t);
};
