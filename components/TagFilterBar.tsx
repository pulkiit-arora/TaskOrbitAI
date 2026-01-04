import React, { useState, useRef, useEffect } from 'react';
import { Tag } from '../types';
import { Pencil, X } from 'lucide-react';
import { TagManager } from './TagManager';

interface TagFilterBarProps {
    tags: Tag[];
    selectedTags: string[]; // array of Tag IDs
    onToggleTag: (tagId: string) => void;
    onUpdateTag?: (tag: Tag) => void;
    onDeleteTag?: (tagId: string) => void;
    onClear?: () => void;
    className?: string;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
    tags,
    selectedTags,
    onToggleTag,
    onUpdateTag,
    onDeleteTag,
    onClear,
    className = ''
}) => {
    const [isManaging, setIsManaging] = useState(false);
    const managerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (managerRef.current && !managerRef.current.contains(event.target as Node)) {
                setIsManaging(false);
            }
        };

        if (isManaging) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isManaging]);


    if (!tags || tags.length === 0) return null;

    return (
        <div className={`flex items-center flex-wrap gap-2 ${className}`}>
            {tags.map(tag => {
                const isActive = selectedTags.includes(tag.id);
                // Parse tag color classes to handle active state styling
                const baseColor = tag.color.split(' ')[0]; // bg-color
                const textColor = tag.color.split(' ')[2]; // text-color (usually 3rd class)

                return (
                    <button
                        key={tag.id}
                        onClick={() => onToggleTag(tag.id)}
                        className={`
              w-3 h-3 rounded-full border transition-all
              ${isActive
                                ? `ring-2 ring-offset-1 ring-blue-500 ${baseColor} ${textColor}`
                                : `${baseColor} ${textColor} opacity-80 hover:opacity-100`
                            }
            `}
                        title={tag.label}
                    />
                );
            })}

            {selectedTags.length > 0 && onClear && (
                <button
                    onClick={onClear}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors"
                    title="Clear filters"
                >
                    <X size={12} />
                </button>
            )}

            {onUpdateTag && onDeleteTag && (
                <div className="relative ml-2">
                    <button
                        onClick={() => setIsManaging(!isManaging)}
                        className={`p-1 rounded-full transition-colors ${isManaging ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        title="Manage Tags"
                    >
                        <Pencil size={12} />
                    </button>

                    {isManaging && (
                        <div ref={managerRef} className="absolute top-full right-0 mt-2 z-50 w-64">
                            {/* Use the shared TagManager, but style it as a dropdown */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                                <TagManager
                                    availableTags={tags}
                                    onUpdateTag={onUpdateTag}
                                    onDeleteTag={onDeleteTag}
                                    onClose={() => setIsManaging(false)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
