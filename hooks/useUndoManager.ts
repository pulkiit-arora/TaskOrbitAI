import { useState, useCallback, useRef } from 'react';
import { Task } from '../types';

interface UndoAction {
    description: string;
    previousTasks: Task[];
    timestamp: number;
}

interface UndoManager {
    pushUndo: (description: string, previousTasks: Task[]) => void;
    undo: (setTasks: (tasks: Task[]) => void) => void;
    canUndo: boolean;
    lastAction: UndoAction | null;
    dismiss: () => void;
}

export function useUndoManager(): UndoManager {
    const [lastAction, setLastAction] = useState<UndoAction | null>(null);
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const pushUndo = useCallback((description: string, previousTasks: Task[]) => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

        const action: UndoAction = {
            description,
            previousTasks: [...previousTasks],
            timestamp: Date.now(),
        };
        setLastAction(action);

        dismissTimerRef.current = setTimeout(() => {
            setLastAction(null);
        }, 5000);
    }, []);

    const undo = useCallback((setTasks: (tasks: Task[]) => void) => {
        if (lastAction) {
            setTasks(lastAction.previousTasks);
            setLastAction(null);
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        }
    }, [lastAction]);

    const dismiss = useCallback(() => {
        setLastAction(null);
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    }, []);

    return {
        pushUndo,
        undo,
        canUndo: lastAction !== null,
        lastAction,
        dismiss,
    };
}
