
import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Plus, Calendar, Home, Moon, Sun, Check, List } from 'lucide-react';
import { Task } from '../types';

interface CommandPaletteProps {
    tasks: Task[];
    onNavigate: (view: 'board' | 'week' | 'month') => void;
    onAddTask: () => void;
    onEditTask: (task: Task) => void;
    toggleTheme: () => void;
    darkMode: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    tasks,
    onNavigate,
    onAddTask,
    onEditTask,
    toggleTheme,
    darkMode
}) => {
    const [open, setOpen] = useState(false);

    // Toggle the menu when ⌘K is pressed
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[640px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[100] overflow-hidden p-2"
        >
            <div className="flex items-center border-b border-gray-100 dark:border-gray-700 px-3 pb-2 mb-2">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <Command.Input
                    autoFocus
                    placeholder="Type a command or search..."
                    className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent text-gray-900 dark:text-gray-100 h-9"
                />
                <div className="flex gap-1">
                    <kbd className="hidden sm:inline-block pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 text-gray-500 border-gray-200">
                        <span className="text-xs">ESC</span>
                    </kbd>
                </div>
            </div>

            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar p-1">
                <Command.Empty className="py-6 text-center text-sm text-gray-500">No results found.</Command.Empty>

                <Command.Group heading="Actions" className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Actions</div>
                    <Command.Item
                        onSelect={() => runCommand(onAddTask)}
                        className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 dark:aria-selected:bg-blue-900/20 dark:aria-selected:text-blue-300"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create New Task</span>
                    </Command.Item>
                    <Command.Item
                        onSelect={() => runCommand(toggleTheme)}
                        className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 dark:aria-selected:bg-blue-900/20 dark:aria-selected:text-blue-300"
                    >
                        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        <span>Toggle {darkMode ? 'Light' : 'Dark'} Mode</span>
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="Navigation" className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Navigation</div>
                    <Command.Item
                        onSelect={() => runCommand(() => onNavigate('board'))}
                        className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 dark:aria-selected:bg-blue-900/20 dark:aria-selected:text-blue-300"
                    >
                        <Home className="w-4 h-4" />
                        <span>Go to Board View</span>
                    </Command.Item>
                    <Command.Item
                        onSelect={() => runCommand(() => onNavigate('week'))}
                        className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 dark:aria-selected:bg-blue-900/20 dark:aria-selected:text-blue-300"
                    >
                        <List className="w-4 h-4" />
                        <span>Go to Week View</span>
                    </Command.Item>
                    <Command.Item
                        onSelect={() => runCommand(() => onNavigate('month'))}
                        className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 dark:aria-selected:bg-blue-900/20 dark:aria-selected:text-blue-300"
                    >
                        <Calendar className="w-4 h-4" />
                        <span>Go to Month View</span>
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="Tasks" className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Existing Tasks</div>
                    {tasks.map(task => (
                        <Command.Item
                            key={task.id}
                            onSelect={() => runCommand(() => onEditTask(task))}
                            value={`${task.title} ${task.description}`}
                            className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 rounded cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 dark:aria-selected:bg-blue-900/20 dark:aria-selected:text-blue-300"
                        >
                            <Check className={`w-3 h-3 ${task.status === 'DONE' ? 'text-green-500' : 'text-gray-300'}`} />
                            <span className="truncate flex-1">{task.title}</span>
                            <span className="text-xs text-gray-400">{task.priority}</span>
                        </Command.Item>
                    ))}
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
};
