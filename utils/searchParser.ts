import { Status, Priority } from '../types';

export interface SearchFilters {
    textQuery: string;
    priority?: Priority[];
    status?: Status[];
    tags?: string[];
    dueDateRange?: 'today' | 'week' | 'month' | 'overdue' | 'nodue';
}

/**
 * Parse a search query with filter syntax.
 * 
 * Syntax:
 * - `priority:high` or `p:high` → filter by priority (high, medium, low)
 * - `status:todo` or `s:todo` → filter by status (todo, inprogress, done, expired, archived)
 * - `tag:work` or `t:work` → filter by tag name
 * - `due:today` → due today
 * - `due:week` → due this week
 * - `due:month` → due this month
 * - `due:overdue` → overdue tasks
 * - `due:none` → no due date
 * - Everything else → text search
 * 
 * Example: "priority:high status:todo project meeting"
 */
export function parseSearchQuery(query: string): SearchFilters {
    const filters: SearchFilters = { textQuery: '' };
    const textParts: string[] = [];

    const tokens = query.trim().split(/\s+/);

    for (const token of tokens) {
        // Priority filter
        const priorityMatch = token.match(/^(?:priority|p):(\w+)$/i);
        if (priorityMatch) {
            const p = priorityMatch[1].toLowerCase();
            if (!filters.priority) filters.priority = [];
            if (p === 'high' || p === 'h' || p === '1') filters.priority.push(Priority.HIGH);
            else if (p === 'medium' || p === 'med' || p === 'm' || p === '2') filters.priority.push(Priority.MEDIUM);
            else if (p === 'low' || p === 'l' || p === '3') filters.priority.push(Priority.LOW);
            continue;
        }

        // Status filter
        const statusMatch = token.match(/^(?:status|s):(\w+)$/i);
        if (statusMatch) {
            const s = statusMatch[1].toLowerCase();
            if (!filters.status) filters.status = [];
            if (s === 'todo' || s === 't') filters.status.push(Status.TODO);
            else if (s === 'inprogress' || s === 'in_progress' || s === 'ip') filters.status.push(Status.IN_PROGRESS);
            else if (s === 'done' || s === 'd') filters.status.push(Status.DONE);
            else if (s === 'expired' || s === 'exp' || s === 'e') filters.status.push(Status.EXPIRED);
            else if (s === 'archived' || s === 'arch' || s === 'a') filters.status.push(Status.ARCHIVED);
            continue;
        }

        // Tag filter
        const tagMatch = token.match(/^(?:tag|t):(\w+)$/i);
        if (tagMatch) {
            if (!filters.tags) filters.tags = [];
            filters.tags.push(tagMatch[1].toLowerCase());
            continue;
        }

        // Due date filter
        const dueMatch = token.match(/^(?:due|d):(\w+)$/i);
        if (dueMatch) {
            const d = dueMatch[1].toLowerCase();
            if (d === 'today') filters.dueDateRange = 'today';
            else if (d === 'week' || d === 'thisweek') filters.dueDateRange = 'week';
            else if (d === 'month' || d === 'thismonth') filters.dueDateRange = 'month';
            else if (d === 'overdue' || d === 'past') filters.dueDateRange = 'overdue';
            else if (d === 'none' || d === 'nodue') filters.dueDateRange = 'nodue';
            continue;
        }

        // Not a filter, add to text query
        textParts.push(token);
    }

    filters.textQuery = textParts.join(' ');
    return filters;
}

/**
 * Get filter suggestions for autocomplete
 */
export function getFilterSuggestions(partial: string): string[] {
    const suggestions: string[] = [];
    const lower = partial.toLowerCase();

    // Priority suggestions
    if ('priority:'.startsWith(lower) || 'p:'.startsWith(lower)) {
        suggestions.push('priority:high', 'priority:medium', 'priority:low');
    } else if (lower.startsWith('priority:') || lower.startsWith('p:')) {
        const val = lower.replace(/^(priority|p):/, '');
        if ('high'.startsWith(val)) suggestions.push('priority:high');
        if ('medium'.startsWith(val)) suggestions.push('priority:medium');
        if ('low'.startsWith(val)) suggestions.push('priority:low');
    }

    // Status suggestions
    if ('status:'.startsWith(lower) || 's:'.startsWith(lower)) {
        suggestions.push('status:todo', 'status:inprogress', 'status:done');
    } else if (lower.startsWith('status:') || lower.startsWith('s:')) {
        const val = lower.replace(/^(status|s):/, '');
        if ('todo'.startsWith(val)) suggestions.push('status:todo');
        if ('inprogress'.startsWith(val)) suggestions.push('status:inprogress');
        if ('done'.startsWith(val)) suggestions.push('status:done');
        if ('expired'.startsWith(val)) suggestions.push('status:expired');
    }

    // Due suggestions
    if ('due:'.startsWith(lower) || 'd:'.startsWith(lower)) {
        suggestions.push('due:today', 'due:week', 'due:overdue', 'due:none');
    } else if (lower.startsWith('due:') || lower.startsWith('d:')) {
        const val = lower.replace(/^(due|d):/, '');
        if ('today'.startsWith(val)) suggestions.push('due:today');
        if ('week'.startsWith(val)) suggestions.push('due:week');
        if ('month'.startsWith(val)) suggestions.push('due:month');
        if ('overdue'.startsWith(val)) suggestions.push('due:overdue');
        if ('none'.startsWith(val)) suggestions.push('due:none');
    }

    // Tag suggestions
    if ('tag:'.startsWith(lower) || 't:'.startsWith(lower)) {
        suggestions.push('tag:');
    }

    return suggestions.slice(0, 5);
}
