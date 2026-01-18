import { Priority, Tag } from '../types';

export interface ParsedTask {
    title: string;
    dueDate?: string;
    priority?: Priority;
    tags?: string[];
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ABBREVS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Parse a natural language task string.
 * 
 * Syntax:
 * - `#tagname` → adds a tag
 * - `!high`, `!medium`, `!low`, `!1`, `!2`, `!3` → sets priority
 * - `today`, `tomorrow`, `next week`, `monday`, etc. → sets due date
 * 
 * Example: "Pay rent tomorrow #bills !high"
 */
export function parseQuickAdd(input: string, existingTags: Tag[] = []): ParsedTask {
    let remaining = input.trim();
    const tags: string[] = [];
    let priority: Priority | undefined;
    let dueDate: string | undefined;

    // Extract tags (#word)
    const tagRegex = /#(\w+)/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(remaining)) !== null) {
        const tagName = tagMatch[1].toLowerCase();
        // Try to match to existing tag
        const existingTag = existingTags.find(t =>
            t.label.toLowerCase() === tagName || t.id === tagName
        );
        if (existingTag) {
            tags.push(existingTag.id);
        } else {
            tags.push(tagName); // Will need to create or ignore
        }
    }
    remaining = remaining.replace(tagRegex, '').trim();

    // Extract priority (!high, !medium, !low, !1, !2, !3)
    const priorityRegex = /!(high|medium|low|1|2|3)/gi;
    const priorityMatch = priorityRegex.exec(remaining);
    if (priorityMatch) {
        const p = priorityMatch[1].toLowerCase();
        if (p === 'high' || p === '1') priority = Priority.HIGH;
        else if (p === 'medium' || p === '2') priority = Priority.MEDIUM;
        else if (p === 'low' || p === '3') priority = Priority.LOW;
    }
    remaining = remaining.replace(priorityRegex, '').trim();

    // Extract relative dates
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const lowerRemaining = remaining.toLowerCase();

    // Check for "today"
    if (lowerRemaining.includes('today')) {
        dueDate = today.toISOString();
        remaining = remaining.replace(/\btoday\b/gi, '').trim();
    }
    // Check for "tomorrow"
    else if (lowerRemaining.includes('tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString();
        remaining = remaining.replace(/\btomorrow\b/gi, '').trim();
    }
    // Check for "next week"
    else if (lowerRemaining.includes('next week')) {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        dueDate = nextWeek.toISOString();
        remaining = remaining.replace(/\bnext week\b/gi, '').trim();
    }
    // Check for day names (monday, tuesday, etc.)
    else {
        for (let i = 0; i < DAY_NAMES.length; i++) {
            const dayName = DAY_NAMES[i];
            const dayAbbrev = DAY_ABBREVS[i];
            const regex = new RegExp(`\\b(next\\s+)?(${dayName}|${dayAbbrev})\\b`, 'gi');
            const match = regex.exec(lowerRemaining);
            if (match) {
                const isNext = !!match[1];
                const targetDay = i;
                const currentDay = today.getDay();
                let daysToAdd = (targetDay - currentDay + 7) % 7;
                if (daysToAdd === 0 && !isNext) daysToAdd = 7; // Same day means next week
                if (isNext) daysToAdd += 7;

                const targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() + daysToAdd);
                dueDate = targetDate.toISOString();
                remaining = remaining.replace(regex, '').trim();
                break;
            }
        }
    }

    // Clean up extra whitespace
    remaining = remaining.replace(/\s+/g, ' ').trim();

    return {
        title: remaining || 'New Task',
        dueDate,
        priority,
        tags: tags.length > 0 ? tags : undefined
    };
}

/**
 * Format a ParsedTask back to a preview string
 */
export function formatParsedTaskPreview(parsed: ParsedTask): string {
    const parts: string[] = [parsed.title];

    if (parsed.dueDate) {
        const date = new Date(parsed.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            parts.push('📅 Today');
        } else if (date.toDateString() === tomorrow.toDateString()) {
            parts.push('📅 Tomorrow');
        } else {
            parts.push(`📅 ${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`);
        }
    }

    if (parsed.priority) {
        const icons = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };
        parts.push(icons[parsed.priority]);
    }

    if (parsed.tags && parsed.tags.length > 0) {
        parts.push(`🏷️ ${parsed.tags.length}`);
    }

    return parts.join(' • ');
}
