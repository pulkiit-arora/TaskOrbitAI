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
            {/* Uncategorized Filter Toggle */}
            <button
                onClick={() => onToggleTag('uncategorized')}
                className={`
                    w-5 h-5 rounded-full border transition-all flex items-center justify-center shrink-0
                    ${selectedTags.includes('uncategorized')
                        ? 'bg-gray-600 border-gray-700 ring-2 ring-offset-1 ring-gray-500'
                        : 'bg-gray-400 border-gray-400 opacity-60 hover:opacity-100'
                    }
                `}
                title="Filter Tasks with No Category"
            />

            {/* Separator - increased margin using separate self-center */}
            <div className="shrink-0 h-3 w-px bg-gray-300 mx-1.5 self-center"></div>

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
                            shrink-0 w-5 h-5 rounded-full border transition-all
                            ${isActive
                                ? `ring-2 ring-offset-1 ring-blue-500 ${baseColor} ${textColor} opacity-100`
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
                    className="shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors"
                    title="Clear filters"
                >
                    <X size={12} />
                </button>
            )}

            {onUpdateTag && onDeleteTag && (
                <div className="relative ml-2 shrink-0">
                    <button
                        onClick={() => setIsManaging(!isManaging)}
                        className={`shrink-0 p-1 rounded-full transition-colors ${isManaging ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        title="Manage Tags"
                    >
                        <Pencil size={12} />
                    </button>

                    {isManaging && (
                        <div ref={managerRef} className="z-50 max-sm:fixed max-sm:inset-0 max-sm:bg-black/40 max-sm:backdrop-blur-sm max-sm:flex max-sm:items-center max-sm:justify-center sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-64">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-sm:w-[90%] max-sm:max-w-sm">
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
