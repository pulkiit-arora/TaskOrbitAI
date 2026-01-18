import { useEffect, useCallback } from 'react';
import { ViewMode } from '../types';

export interface ShortcutHandlers {
  onNewTask: () => void;
  onNavigate: (view: ViewMode) => void;
  onToggleDarkMode: () => void;
  onShowShortcuts: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers, enabled = true) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isInputFocused = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable;

    if (isInputFocused) return;

    // Don't trigger if modifier keys are pressed (except for Ctrl+K which is command palette)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        handlers.onNewTask();
        break;
      case 't':
        e.preventDefault();
        handlers.onNavigate('today');
        break;
      case 'w':
        e.preventDefault();
        handlers.onNavigate('week');
        break;
      case 'm':
        e.preventDefault();
        handlers.onNavigate('month');
        break;
      case 'b':
        e.preventDefault();
        handlers.onNavigate('board');
        break;
      case 'a':
        e.preventDefault();
        handlers.onNavigate('analytics');
        break;
      case 'd':
        e.preventDefault();
        handlers.onToggleDarkMode();
        break;
      case '?':
        e.preventDefault();
        handlers.onShowShortcuts();
        break;
    }
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
};
