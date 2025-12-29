import React, { useState } from 'react';
import { Tag } from '../types';
import { Plus, X, Tag as TagIcon } from 'lucide-react';

interface TagPickerProps {
    selectedTags: Tag[];
    availableTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    onCreateTag: (tag: Tag) => void;
}

const TAG_COLORS = [
    'bg-red-100 text-red-800 border-red-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-lime-100 text-lime-800 border-lime-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-rose-100 text-rose-800 border-rose-200',
];

export const TagPicker: React.FC<TagPickerProps> = ({ selectedTags, availableTags, onTagsChange, onCreateTag }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newTagLabel, setNewTagLabel] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

    const toggleTag = (tag: Tag) => {
        if (selectedTags.find(t => t.id === tag.id)) {
            onTagsChange(selectedTags.filter(t => t.id !== tag.id));
        } else {
            onTagsChange([...selectedTags, tag]);
        }
    };

    const handleCreate = () => {
        if (!newTagLabel.trim()) return;
        const newTag: Tag = {
            id: crypto.randomUUID(),
            label: newTagLabel.trim(),
            color: newTagColor
        };
        onCreateTag(newTag);
        onTagsChange([...selectedTags, newTag]);
        setNewTagLabel('');
        setIsCreating(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
                {selectedTags.map(tag => (
                    <span key={tag.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${tag.color}`}>
                        {tag.label}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleTag(tag); }}
                            className="hover:bg-black/10 rounded-full p-0.5"
                        >
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <button
                    type="button"
                    onClick={() => setIsCreating(!isCreating)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 bg-white"
                >
                    <Plus size={10} /> Tag
                </button>
            </div>

            {isCreating && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 space-y-3">
                    <input
                        type="text"
                        value={newTagLabel}
                        onChange={e => setNewTagLabel(e.target.value)}
                        placeholder="New tag name..."
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        autoFocus
                    />
                    <div className="flex flex-wrap gap-1">
                        {TAG_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                className={`w-4 h-4 rounded-full border ${color} ${newTagColor === color ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                                onClick={() => setNewTagColor(color)}
                            />
                        ))}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={!newTagLabel.trim()}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}

            {availableTags.length > 0 && !isCreating && (
                <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-gray-400 w-full mb-1">Available:</span>
                    {availableTags.filter(t => !selectedTags.find(st => st.id === t.id)).map(tag => (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border opacity-50 hover:opacity-100 ${tag.color}`}
                        >
                            {tag.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
