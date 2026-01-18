import React, { useState } from 'react';
import { TaskTemplate, Priority, Recurrence, Tag, Subtask } from '../types';
import { FileText, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from './Button';

interface TemplateManagerProps {
    templates: TaskTemplate[];
    onAdd: (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => void;
    onUpdate: (id: string, updates: Partial<TaskTemplate>) => void;
    onDelete: (id: string) => void;
    onUseTemplate: (template: TaskTemplate) => void;
    availableTags?: Tag[];
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
    templates,
    onAdd,
    onUpdate,
    onDelete,
    onUseTemplate,
    availableTags = []
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);

    const resetForm = () => {
        setName('');
        setTitle('');
        setDescription('');
        setPriority(Priority.MEDIUM);
        setIsCreating(false);
        setEditingId(null);
    };

    const handleSave = () => {
        if (!name.trim() || !title.trim()) return;

        if (editingId) {
            onUpdate(editingId, { name, title, description, priority });
        } else {
            onAdd({
                name,
                title,
                description,
                priority,
                recurrence: Recurrence.NONE
            });
        }
        resetForm();
    };

    const startEdit = (template: TaskTemplate) => {
        setEditingId(template.id);
        setName(template.name);
        setTitle(template.title);
        setDescription(template.description);
        setPriority(template.priority);
        setIsCreating(true);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Task Templates</h3>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New
                    </button>
                )}
            </div>

            {/* Create/Edit Form */}
            {isCreating && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Template name (e.g., Weekly Review)"
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title"
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Task description"
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                        />
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as Priority)}
                            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value={Priority.LOW}>Low Priority</option>
                            <option value={Priority.MEDIUM}>Medium Priority</option>
                            <option value={Priority.HIGH}>High Priority</option>
                        </select>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={resetForm}
                                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || !title.trim()}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" />
                                {editingId ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[300px] overflow-y-auto">
                {templates.length === 0 && !isCreating && (
                    <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No templates yet. Create one to reuse common task configurations.
                    </p>
                )}
                {templates.map(template => (
                    <div
                        key={template.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex-1 min-w-0 mr-3">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {template.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {template.title}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onUseTemplate(template)}
                                className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            >
                                Use
                            </button>
                            <button
                                onClick={() => startEdit(template)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onDelete(template.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
