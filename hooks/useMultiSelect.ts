import { useState, useCallback } from 'react';

/**
 * Hook for managing multi-select state for tasks.
 */
export const useMultiSelect = <T extends string>() => {
    const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const toggleSelection = useCallback((id: T) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback((ids: T[]) => {
        setSelectedIds(new Set(ids));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    }, []);

    const isSelected = useCallback((id: T) => {
        return selectedIds.has(id);
    }, [selectedIds]);

    const toggleSelectionMode = useCallback(() => {
        setIsSelectionMode(prev => !prev);
        if (isSelectionMode) {
            setSelectedIds(new Set());
        }
    }, [isSelectionMode]);

    return {
        selectedIds: Array.from(selectedIds),
        selectedCount: selectedIds.size,
        isSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
        toggleSelectionMode
    };
};
