
import { describe, it, expect } from 'vitest';
import { parseSearchQuery, getFilterSuggestions } from '../utils/searchParser';
import { Priority, Status } from '../types';

describe('parseSearchQuery', () => {

    describe('priority filters', () => {
        it('parses priority:high', () => {
            const result = parseSearchQuery('priority:high');
            expect(result.priority).toEqual([Priority.HIGH]);
            expect(result.textQuery).toBe('');
        });

        it('parses p:medium (shorthand)', () => {
            const result = parseSearchQuery('p:medium');
            expect(result.priority).toEqual([Priority.MEDIUM]);
        });

        it('parses p:low', () => {
            const result = parseSearchQuery('p:low');
            expect(result.priority).toEqual([Priority.LOW]);
        });

        it('parses numeric aliases p:1 = HIGH, p:2 = MEDIUM, p:3 = LOW', () => {
            expect(parseSearchQuery('p:1').priority).toEqual([Priority.HIGH]);
            expect(parseSearchQuery('p:2').priority).toEqual([Priority.MEDIUM]);
            expect(parseSearchQuery('p:3').priority).toEqual([Priority.LOW]);
        });

        it('parses p:h shorthand', () => {
            expect(parseSearchQuery('p:h').priority).toEqual([Priority.HIGH]);
        });

        it('accumulates multiple priority filters', () => {
            const result = parseSearchQuery('p:high p:low');
            expect(result.priority).toEqual([Priority.HIGH, Priority.LOW]);
        });
    });

    describe('status filters', () => {
        it('parses status:todo', () => {
            const result = parseSearchQuery('status:todo');
            expect(result.status).toEqual([Status.TODO]);
        });

        it('parses s:inprogress', () => {
            const result = parseSearchQuery('s:inprogress');
            expect(result.status).toEqual([Status.IN_PROGRESS]);
        });

        it('parses s:in_progress', () => {
            const result = parseSearchQuery('s:in_progress');
            expect(result.status).toEqual([Status.IN_PROGRESS]);
        });

        it('parses s:done', () => {
            const result = parseSearchQuery('s:done');
            expect(result.status).toEqual([Status.DONE]);
        });

        it('parses s:expired', () => {
            const result = parseSearchQuery('s:expired');
            expect(result.status).toEqual([Status.EXPIRED]);
        });

        it('parses s:archived', () => {
            const result = parseSearchQuery('s:archived');
            expect(result.status).toEqual([Status.ARCHIVED]);
        });

        it('parses shorthand aliases (t, ip, d, e, a)', () => {
            expect(parseSearchQuery('s:t').status).toEqual([Status.TODO]);
            expect(parseSearchQuery('s:ip').status).toEqual([Status.IN_PROGRESS]);
            expect(parseSearchQuery('s:d').status).toEqual([Status.DONE]);
            expect(parseSearchQuery('s:exp').status).toEqual([Status.EXPIRED]);
            expect(parseSearchQuery('s:arch').status).toEqual([Status.ARCHIVED]);
        });
    });

    describe('tag filters', () => {
        it('parses tag:work', () => {
            const result = parseSearchQuery('tag:work');
            expect(result.tags).toEqual(['work']);
        });

        it('parses t:dev (shorthand)', () => {
            const result = parseSearchQuery('t:dev');
            expect(result.tags).toEqual(['dev']);
        });

        it('accumulates multiple tag filters', () => {
            const result = parseSearchQuery('tag:work tag:urgent');
            expect(result.tags).toEqual(['work', 'urgent']);
        });
    });

    describe('due date filters', () => {
        it('parses due:today', () => {
            expect(parseSearchQuery('due:today').dueDateRange).toBe('today');
        });

        it('parses due:week', () => {
            expect(parseSearchQuery('due:week').dueDateRange).toBe('week');
        });

        it('parses due:month', () => {
            expect(parseSearchQuery('due:month').dueDateRange).toBe('month');
        });

        it('parses due:overdue', () => {
            expect(parseSearchQuery('due:overdue').dueDateRange).toBe('overdue');
        });

        it('parses due:past as overdue', () => {
            expect(parseSearchQuery('due:past').dueDateRange).toBe('overdue');
        });

        it('parses due:none', () => {
            expect(parseSearchQuery('due:none').dueDateRange).toBe('nodue');
        });

        it('parses d: shorthand', () => {
            expect(parseSearchQuery('d:today').dueDateRange).toBe('today');
        });
    });

    describe('text query', () => {
        it('captures non-filter tokens as text query', () => {
            const result = parseSearchQuery('meeting notes project');
            expect(result.textQuery).toBe('meeting notes project');
        });

        it('separates filters from text', () => {
            const result = parseSearchQuery('p:high project meeting');
            expect(result.priority).toEqual([Priority.HIGH]);
            expect(result.textQuery).toBe('project meeting');
        });
    });

    describe('combined filters', () => {
        it('parses multiple filter types together', () => {
            const result = parseSearchQuery('p:high s:todo tag:work due:today search text');
            expect(result.priority).toEqual([Priority.HIGH]);
            expect(result.status).toEqual([Status.TODO]);
            expect(result.tags).toEqual(['work']);
            expect(result.dueDateRange).toBe('today');
            expect(result.textQuery).toBe('search text');
        });
    });

    describe('empty input', () => {
        it('returns empty text query for empty input', () => {
            const result = parseSearchQuery('');
            expect(result.textQuery).toBe('');
            expect(result.priority).toBeUndefined();
            expect(result.status).toBeUndefined();
        });
    });
});

describe('getFilterSuggestions', () => {
    it('suggests priority filters for "p" partial', () => {
        const suggestions = getFilterSuggestions('p');
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions).toContain('priority:high');
    });

    it('suggests status filters for "s:" partial', () => {
        const suggestions = getFilterSuggestions('s:');
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions).toContain('status:todo');
    });

    it('narrows suggestions based on value (e.g. "priority:h")', () => {
        const suggestions = getFilterSuggestions('priority:h');
        expect(suggestions).toContain('priority:high');
        expect(suggestions).not.toContain('priority:low');
    });

    it('suggests due filters for "due:" partial', () => {
        const suggestions = getFilterSuggestions('due:');
        expect(suggestions).toContain('due:today');
        expect(suggestions).toContain('due:overdue');
    });

    it('suggests tag placeholder for "tag:" partial', () => {
        const suggestions = getFilterSuggestions('tag');
        expect(suggestions).toContain('tag:');
    });

    it('limits suggestions to 5', () => {
        const suggestions = getFilterSuggestions('');
        expect(suggestions.length).toBeLessThanOrEqual(5);
    });
});
