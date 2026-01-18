import { Task, Status, Recurrence } from '../types';

export interface StreakInfo {
    taskId: string;
    taskTitle: string;
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate?: string;
    isActive: boolean;
}

/**
 * Calculate streak information for a recurring task.
 * A streak is the number of consecutive completions without missing.
 */
export function calculateStreak(task: Task, allTasks: Task[]): StreakInfo | null {
    // Only calculate streaks for recurring tasks
    if (task.recurrence === Recurrence.NONE) return null;

    // Get all history items for this series
    const seriesId = task.seriesId || task.id;
    const history = allTasks
        .filter(t => t.seriesId === seriesId || t.id === seriesId)
        .filter(t => t.status === Status.DONE || t.status === Status.EXPIRED)
        .sort((a, b) => {
            const dateA = a.completedAt || (a.dueDate ? new Date(a.dueDate).getTime() : a.createdAt);
            const dateB = b.completedAt || (b.dueDate ? new Date(b.dueDate).getTime() : b.createdAt);
            return dateA - dateB;
        });

    if (history.length === 0) {
        return {
            taskId: task.id,
            taskTitle: task.title,
            currentStreak: 0,
            longestStreak: 0,
            isActive: true
        };
    }

    // Calculate streaks by analyzing consecutive completions
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastCompletedDate: string | undefined;

    for (let i = 0; i < history.length; i++) {
        const item = history[i];

        if (item.status === Status.DONE) {
            tempStreak++;
            lastCompletedDate = item.dueDate || new Date(item.createdAt).toISOString();

            // Check if this is the most recent item (for current streak)
            if (i === history.length - 1) {
                currentStreak = tempStreak;
            }
        } else if (item.status === Status.EXPIRED) {
            // Streak broken
            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
            }
            tempStreak = 0;
            currentStreak = 0;
        }
    }

    // Final check for longest streak
    if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
    }

    return {
        taskId: task.id,
        taskTitle: task.title,
        currentStreak,
        longestStreak,
        lastCompletedDate,
        isActive: task.status !== Status.ARCHIVED && task.status !== Status.DONE
    };
}

/**
 * Get top streaks from all tasks, sorted by current streak.
 */
export function getTopStreaks(tasks: Task[], limit = 10): StreakInfo[] {
    // Get base recurring tasks (not history items)
    const recurringTasks = tasks.filter(t =>
        t.recurrence !== Recurrence.NONE &&
        !t.seriesId &&
        !t.isRecurringException
    );

    const streaks = recurringTasks
        .map(t => calculateStreak(t, tasks))
        .filter((s): s is StreakInfo => s !== null)
        .filter(s => s.currentStreak > 0 || s.longestStreak > 0)
        .sort((a, b) => {
            // Sort by current streak first, then by longest streak
            if (b.currentStreak !== a.currentStreak) {
                return b.currentStreak - a.currentStreak;
            }
            return b.longestStreak - a.longestStreak;
        });

    return streaks.slice(0, limit);
}

/**
 * Get streak badge emoji based on streak count.
 */
export function getStreakBadge(streak: number): string {
    if (streak >= 30) return '🏆';
    if (streak >= 14) return '🔥';
    if (streak >= 7) return '⭐';
    if (streak >= 3) return '✨';
    return '';
}
