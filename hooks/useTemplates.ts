import { useState, useEffect } from 'react';
import { TaskTemplate } from '../types';

const STORAGE_KEY = 'taskorbit-templates';

/**
 * Hook for managing task templates with localStorage persistence.
 */
export const useTemplates = () => {
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load templates from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setTemplates(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load templates:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save to localStorage when templates change
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
            } catch (e) {
                console.error('Failed to save templates:', e);
            }
        }
    }, [templates, isLoading]);

    const addTemplate = (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
        const newTemplate: TaskTemplate = {
            ...template,
            id: crypto.randomUUID(),
            createdAt: Date.now()
        };
        setTemplates(prev => [...prev, newTemplate]);
        return newTemplate;
    };

    const updateTemplate = (id: string, updates: Partial<TaskTemplate>) => {
        setTemplates(prev =>
            prev.map(t => t.id === id ? { ...t, ...updates } : t)
        );
    };

    const deleteTemplate = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    const getTemplate = (id: string) => {
        return templates.find(t => t.id === id);
    };

    return {
        templates,
        isLoading,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        getTemplate
    };
};
