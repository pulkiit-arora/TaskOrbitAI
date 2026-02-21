import { Task, Status, Priority } from '../types';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt?: number;
    category: 'productivity' | 'streak' | 'milestone' | 'special';
}

export function evaluateAchievements(tasks: Task[]): Achievement[] {
    const completedTasks = tasks.filter(t => t.status === Status.DONE);
    const now = new Date();

    const achievements: Achievement[] = [
        // Milestones
        {
            id: 'first-task', title: 'First Step', description: 'Complete your first task',
            icon: '🎯', unlocked: completedTasks.length >= 1, category: 'milestone',
        },
        {
            id: 'ten-tasks', title: 'Getting Rolling', description: 'Complete 10 tasks',
            icon: '⚡', unlocked: completedTasks.length >= 10, category: 'milestone',
        },
        {
            id: 'fifty-tasks', title: 'Halfway Hero', description: 'Complete 50 tasks',
            icon: '🏅', unlocked: completedTasks.length >= 50, category: 'milestone',
        },
        {
            id: 'hundred-tasks', title: 'Century Club', description: 'Complete 100 tasks',
            icon: '💯', unlocked: completedTasks.length >= 100, category: 'milestone',
        },
        {
            id: 'five-hundred', title: 'Task Master', description: 'Complete 500 tasks',
            icon: '👑', unlocked: completedTasks.length >= 500, category: 'milestone',
        },

        // Priority-based
        {
            id: 'high-five', title: 'High Five', description: 'Complete 5 high-priority tasks',
            icon: '🔥', unlocked: completedTasks.filter(t => t.priority === Priority.HIGH).length >= 5,
            category: 'productivity',
        },
        {
            id: 'priority-crusher', title: 'Priority Crusher', description: 'Complete 25 high-priority tasks',
            icon: '💪', unlocked: completedTasks.filter(t => t.priority === Priority.HIGH).length >= 25,
            category: 'productivity',
        },

        // Time-based
        {
            id: 'early-bird', title: 'Early Bird', description: 'Complete a task before 9 AM',
            icon: '🌅', unlocked: completedTasks.some(t => {
                const h = new Date(t.completedAt || t.createdAt).getHours();
                return h < 9;
            }), category: 'special',
        },
        {
            id: 'night-owl', title: 'Night Owl', description: 'Complete a task after 10 PM',
            icon: '🦉', unlocked: completedTasks.some(t => {
                const h = new Date(t.completedAt || t.createdAt).getHours();
                return h >= 22;
            }), category: 'special',
        },

        // Streak-based
        {
            id: 'three-day-streak', title: 'On a Roll', description: 'Complete tasks 3 days in a row',
            icon: '✨', unlocked: hasConsecutiveDays(completedTasks, 3), category: 'streak',
        },
        {
            id: 'seven-day-streak', title: 'Week Warrior', description: 'Complete tasks 7 days in a row',
            icon: '⭐', unlocked: hasConsecutiveDays(completedTasks, 7), category: 'streak',
        },
        {
            id: 'thirty-day-streak', title: 'Monthly Legend', description: 'Complete tasks 30 days in a row',
            icon: '🏆', unlocked: hasConsecutiveDays(completedTasks, 30), category: 'streak',
        },

        // Organization
        {
            id: 'tag-master', title: 'Organized Mind', description: 'Use 5 different tags',
            icon: '🏷️', unlocked: new Set(tasks.flatMap(t => (t.tags || []).map(tag => tag.id))).size >= 5,
            category: 'special',
        },
        {
            id: 'subtask-pro', title: 'Detail Oriented', description: 'Complete a task with 5+ subtasks',
            icon: '📋', unlocked: completedTasks.some(t => (t.subtasks || []).length >= 5),
            category: 'special',
        },
        {
            id: 'zero-overdue', title: 'Clean Slate', description: 'Have zero overdue tasks',
            icon: '✅', unlocked: tasks.filter(t => {
                if (t.status === Status.DONE || t.status === Status.ARCHIVED) return false;
                if (!t.dueDate) return false;
                return new Date(t.dueDate) < now;
            }).length === 0 && tasks.length > 0,
            category: 'productivity',
        },
    ];

    return achievements;
}

function hasConsecutiveDays(tasks: Task[], days: number): boolean {
    const dateSet = new Set<string>();
    tasks.forEach(t => {
        const d = t.completedAt ? new Date(t.completedAt) : t.dueDate ? new Date(t.dueDate) : null;
        if (d) dateSet.add(d.toISOString().split('T')[0]);
    });

    const sortedDates = Array.from(dateSet).sort();
    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
            currentConsecutive = 1;
        }
    }

    return maxConsecutive >= days;
}
