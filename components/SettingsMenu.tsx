import React from 'react';
import { Settings, Moon, Sun, Download, Upload, Trash2, HelpCircle, Mail, FileCode } from 'lucide-react';
import { DropdownMenu, DropdownItem, DropdownDivider, DropdownHeader } from './DropdownMenu';

interface SettingsMenuProps {
    darkMode: boolean;
    toggleDarkMode: () => void;
    onExport: () => void;
    onImportClick: () => void;
    onDeleteAll: () => void;
    onOpenTour: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
    darkMode,
    toggleDarkMode,
    onExport,
    onImportClick,
    onDeleteAll,
    onOpenTour
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
