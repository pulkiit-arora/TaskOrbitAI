import React, { useState } from 'react';
import { Tag } from '../types';
import { Plus, X, Check } from 'lucide-react';

interface TagManagerProps {
    availableTags: Tag[];
    onUpdateTag: (tag: Tag) => void;
    onDeleteTag: (tagId: string) => void;
    onClose: () => void;
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

export const TagManager: React.FC<TagManagerProps> = ({ availableTags, onUpdateTag, onDeleteTag, onClose }) => {
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [editTagLabel, setEditTagLabel] = useState('');
    const [editTagColor, setEditTagColor] = useState('');

    const startEditing = (tag: Tag) => {
        setEditingTagId(tag.id);
        setEditTagLabel(tag.label);
        setEditTagColor(tag.color);
    };

    const handleUpdate = () => {
        if (!editingTagId || !editTagLabel.trim()) return;
        onUpdateTag({
            id: editingTagId,
            label: editTagLabel.trim(),
            color: editTagColor
        });
        setEditingTagId(null);
    };

    const handleDelete = (tagId: string) => {
        if (confirm('Are you sure you want to delete this tag? It will be removed from all tasks.')) {
            onDeleteTag(tagId);
            if (editingTagId === tagId) setEditingTagId(null);
        }
    };

    return (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 space-y-2 animate-in fade-in zoom-in-95 duration-200 shadow-lg">
            <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-semibold text-gray-500">Edit Tags</div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {availableTags.map(tag => (
                    <div key={tag.id} className="flex items-center gap-2">
                        {editingTagId === tag.id ? (
                            <div className="flex-1 flex flex-col gap-2 p-2 bg-white dark:bg-gray-700 rounded border border-blue-200 shadow-sm">
                                <div className="flex gap-2">
                                    <input
                                        value={editTagLabel}
                                        onChange={e => setEditTagLabel(e.target.value)}
                                        className="flex-1 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                        autoFocus
                                    />
                                    <div className="flex gap-1">
                                        <button onClick={handleUpdate} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Save changes">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={() => setEditingTagId(null)} className="text-gray-400 hover:text-gray-600 p-1" title="Cancel">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {TAG_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`w-3 h-3 rounded-full border ${color} ${editTagColor === color ? 'ring-1 ring-blue-500 ring-offset-1' : ''}`}
                                            onClick={() => setEditTagColor(color)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-between group p-1 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors border border-transparent hover:border-gray-200">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${tag.color}`}>
                                    {tag.label}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditing(tag)} className="text-xs text-blue-600 hover:underline px-1">Edit</button>
                                    <button onClick={() => handleDelete(tag.id)} className="text-xs text-red-600 hover:underline px-1">Delete</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {availableTags.length === 0 && <span className="text-xs text-gray-400">No tags logic.</span>}
            </div>
            {/* <button onClick={onClose} className="w-full text-center text-xs text-gray-500 hover:bg-gray-200/50 py-1 rounded">Close</button> */}
        </div>
    );
};
