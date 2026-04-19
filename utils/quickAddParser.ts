import { Priority, Tag, Recurrence } from '../types';

export interface ParsedTask {
    title: string;
    dueDate?: string;
    priority?: Priority;
    tags?: string[];
    recurrence?: Recurrence;
    recurrenceInterval?: number;
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
 * - `daily`, `weekly`, `monthly`, `yearly` → sets recurrence
 * - `every 2 days`, `every 3 weeks`, `every month` → sets recurrence with interval
 * 
 * Example: "Pay rent monthly #bills !high"
 * Example: "Exercise every 2 days !medium"
 */
export function parseQuickAdd(input: string, existingTags: Tag[] = []): ParsedTask {
    let remaining = input.trim();
    const tags: string[] = [];
    let priority: Priority | undefined;
    let dueDate: string | undefined;
    let recurrence: Recurrence | undefined;
    let recurrenceInterval: number | undefined;

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

    // Extract recurrence with interval (every N days/weeks/months/years)
    const intervalRegex = /\bevery\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)\b/gi;
    const intervalMatch = intervalRegex.exec(remaining);
    if (intervalMatch) {
        recurrenceInterval = parseInt(intervalMatch[1], 10);
        const unit = intervalMatch[2].toLowerCase();
        if (unit.startsWith('day')) recurrence = Recurrence.DAILY;
        else if (unit.startsWith('week')) recurrence = Recurrence.WEEKLY;
        else if (unit.startsWith('month')) recurrence = Recurrence.MONTHLY;
        else if (unit.startsWith('year')) recurrence = Recurrence.YEARLY;
        remaining = remaining.replace(intervalRegex, '').trim();
    }

    // Extract simple recurrence (daily, weekly, monthly, quarterly, yearly)
    if (!recurrence) {
        const recurrenceRegex = /\b(daily|weekly|monthly|quarterly|yearly|every\s+day|every\s+week|every\s+month|every\s+year)\b/gi;
        const recurrenceMatch = recurrenceRegex.exec(remaining);
        if (recurrenceMatch) {
            const r = recurrenceMatch[1].toLowerCase().replace('every ', '');
            if (r === 'daily' || r === 'day') recurrence = Recurrence.DAILY;
            else if (r === 'weekly' || r === 'week') recurrence = Recurrence.WEEKLY;
            else if (r === 'monthly' || r === 'month') recurrence = Recurrence.MONTHLY;
            else if (r === 'quarterly') recurrence = Recurrence.QUARTERLY;
            else if (r === 'yearly' || r === 'year') recurrence = Recurrence.YEARLY;
            recurrenceInterval = 1;
            remaining = remaining.replace(recurrenceRegex, '').trim();
        }
    }

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

    // Check for "next month"
    if (!dueDate && lowerRemaining.includes('next month')) {
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1); // First day of next month
        dueDate = nextMonth.toISOString();
        remaining = remaining.replace(/\bnext month\b/gi, '').trim();
    }

    // Check for month names (january, february, etc.)
    const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const MONTH_ABBREVS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    if (!dueDate) {
        for (let i = 0; i < MONTH_NAMES.length; i++) {
            const monthName = MONTH_NAMES[i];
            const monthAbbrev = MONTH_ABBREVS[i];
            // Match "16 March", "March 16", "March 16, 2032", "16 March 2032", etc.
            const regex = new RegExp(`(?:\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+)?\\b(${monthName}|${monthAbbrev})\\b(?:\\s+(\\d{1,2})(?:st|nd|rd|th)?)?(?:,?\\s+(\\d{4}))?\\b`, 'gi');
            const match = regex.exec(remaining);
            if (match) {
                const targetMonth = i;
                const prevDay = match[1];
                const postDay = match[3];
                const yearStr = match[4];
                
                const dayOfMonth = prevDay ? parseInt(prevDay, 10) : (postDay ? parseInt(postDay, 10) : 1);
                let targetYear = yearStr ? parseInt(yearStr, 10) : today.getFullYear();
                
                const targetDate = new Date(targetYear, targetMonth, dayOfMonth, 12, 0, 0, 0);

                // If no year specified and date is in the past, use next year
                if (!yearStr && targetDate < today) {
                    targetDate.setFullYear(targetDate.getFullYear() + 1);
                }

                dueDate = targetDate.toISOString();
                remaining = remaining.replace(regex, '').trim();
                break;
            }
        }
    }

    // If recurrence is set but no due date, default to today
    if (recurrence && !dueDate) {
        dueDate = today.toISOString();
    }

    // Clean up extra whitespace
    remaining = remaining.replace(/\s+/g, ' ').trim();

    return {
        title: remaining || 'New Task',
        dueDate,
        priority,
        tags: tags.length > 0 ? tags : undefined,
        recurrence,
        recurrenceInterval
    };
}

/**
 * Format a ParsedTask back to a preview string
 */
export function formatParsedTaskPreview(parsed: ParsedTask): string {
    const parts: string[] = [parsed.title];

    if (parsed.recurrence) {
        const recurrenceLabels: Record<Recurrence, string> = {
            [Recurrence.NONE]: '',
            [Recurrence.DAILY]: '🔄 Daily',
            [Recurrence.WEEKLY]: '🔄 Weekly',
            [Recurrence.MONTHLY]: '🔄 Monthly',
            [Recurrence.QUARTERLY]: '🔄 Quarterly',
            [Recurrence.YEARLY]: '🔄 Yearly'
        };
        let label = recurrenceLabels[parsed.recurrence];
        if (parsed.recurrenceInterval && parsed.recurrenceInterval > 1) {
            const units: Record<Recurrence, string> = {
                [Recurrence.NONE]: '',
                [Recurrence.DAILY]: 'days',
                [Recurrence.WEEKLY]: 'weeks',
                [Recurrence.MONTHLY]: 'months',
                [Recurrence.QUARTERLY]: 'quarters',
                [Recurrence.YEARLY]: 'years'
            };
            label = `🔄 Every ${parsed.recurrenceInterval} ${units[parsed.recurrence]}`;
        }
        if (label) parts.push(label);
    }

    if (parsed.dueDate && !parsed.recurrence) {
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
