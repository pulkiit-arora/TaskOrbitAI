import React from 'react';
import { Settings, Moon, Sun, Download, Upload, Trash2, HelpCircle, Mail, FileCode } from 'lucide-react';
import { DropdownMenu, DropdownItem, DropdownDivider, DropdownHeader } from './DropdownMenu';
import { Session } from '@supabase/supabase-js';

interface SettingsMenuProps {
    darkMode: boolean;
    toggleDarkMode: () => void;
    onExport: () => void;
    onImportClick: () => void;
    onDeleteAll: () => void;
    onOpenTour: () => void;
    isSyncEnabled: boolean;
    onToggleSync: (enabled: boolean) => void;
    session: Session | null;
    onSignOut: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
    darkMode,
    toggleDarkMode,
    onExport,
    onImportClick,
    onDeleteAll,
    onOpenTour,
    isSyncEnabled,
    onToggleSync,
    session,
    onSignOut
}) => {
    return (
        <DropdownMenu
            icon={<Settings size={16} />}
            label={<span className="hidden sm:inline">Settings</span>}
            className="text-gray-600 dark:text-gray-300"
        >
            <DropdownHeader>Preferences</DropdownHeader>
            <DropdownItem onClick={toggleDarkMode} icon={darkMode ? <Sun size={14} /> : <Moon size={14} />}>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
            </DropdownItem>
            
            <DropdownItem 
                onClick={() => onToggleSync(!isSyncEnabled)} 
                icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>}
            >
                <div className="flex items-center justify-between w-full">
                    <span>Cloud Sync</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${isSyncEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isSyncEnabled ? 'translate-x-4.5 left-0.5' : 'left-0.5'}`} />
                    </div>
                </div>
            </DropdownItem>

            {isSyncEnabled && session && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-1 mx-1 my-1 rounded-md text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Signed in as:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{session.user.email}</span>
                    <button onClick={onSignOut} className="text-red-600 dark:text-red-400 font-medium text-left mt-1 hover:underline">
                        Sign Out
                    </button>
                </div>
            )}

            <DropdownDivider />

            <DropdownHeader>Data</DropdownHeader>
            <DropdownItem onClick={onExport} icon={<Download size={14} />}>
                Export Tasks
            </DropdownItem>
            <DropdownItem onClick={onImportClick} icon={<Upload size={14} />}>
                Import Tasks
            </DropdownItem>
            <DropdownItem onClick={onDeleteAll} icon={<Trash2 size={14} />} danger>
                Delete All Data
            </DropdownItem>

            <DropdownDivider />

            <DropdownHeader>Help & Info</DropdownHeader>
            <DropdownItem onClick={onOpenTour} icon={<HelpCircle size={14} />}>
                Start Tour
            </DropdownItem>
            <DropdownItem
                onClick={() => window.open('mailto:pulkiit.arora@gmail.com', '_blank')}
                icon={<Mail size={14} />}
            >
                Contact Support
            </DropdownItem>
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 mt-1">
                Build: {import.meta.env.VITE_BUILD_TIME || 'Dev'}
            </div>
        </DropdownMenu>
    );
};
