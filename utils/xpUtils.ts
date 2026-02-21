import { Task, Status, Priority } from '../types';

const XP_VALUES: Record<string, number> = {
    [Priority.LOW]: 10,
    [Priority.MEDIUM]: 25,
    [Priority.HIGH]: 50,
};

export interface XPInfo {
    totalXP: number;
    level: number;
    currentLevelXP: number;
    xpForNextLevel: number;
    progress: number; // 0..1
    title: string;
}

const LEVEL_TITLES = [
    'Novice', 'Apprentice', 'Task Runner', 'Executor', 'Achiever',
    'Specialist', 'Expert', 'Master', 'Grand Master', 'Legend',
    'Mythic', 'Transcendent', 'Cosmic', 'Eternal', 'Infinite',
];

export function calculateXP(tasks: Task[]): XPInfo {
    const completedTasks = tasks.filter(t => t.status === Status.DONE);

    let totalXP = 0;
    completedTasks.forEach(task => {
        let xp = XP_VALUES[task.priority] || 10;
        // Bonus for subtasks
        const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length;
        xp += completedSubtasks * 5;
        // Bonus for time entries (5 XP per pomodoro-length session)
        const sessions = (task.timeEntries || []).length;
        xp += sessions * 5;
        totalXP += xp;
    });

    // Level formula: level = floor(sqrt(totalXP / 50))
    const level = Math.floor(Math.sqrt(totalXP / 50));
    const xpForCurrentLevel = level * level * 50;
    const xpForNextLevel = (level + 1) * (level + 1) * 50;
    const currentLevelXP = totalXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progress = xpNeeded > 0 ? currentLevelXP / xpNeeded : 0;

    const title = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)];

    return {
        totalXP,
        level,
        currentLevelXP,
        xpForNextLevel: xpNeeded,
        progress: Math.min(progress, 1),
        title,
    };
}
