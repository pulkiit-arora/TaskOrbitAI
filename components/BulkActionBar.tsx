import React from 'react';
import { Status, Priority } from '../types';
import {
    X,
    Trash2,
    Archive,
    CheckCircle,
    Tag as TagIcon,
    ArrowRight,
    Clock
} from 'lucide-react';

interface BulkActionBarProps {
    selectedCount: number;
    onClose: () => void;
    onDelete: () => void;
    onArchive: () => void;
    onMarkDone: () => void;
    onChangePriority: (priority: Priority) => void;
    onChangeStatus: (status: Status) => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
    selectedCount,
    onClose,
    onDelete,
    onArchive,
    onMarkDone,
    onChangePriority,
    onChangeStatus
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-xl border border-gray-700">
                {/* Selection count */}
                <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
                    <span className="bg-blue-600 text-white text-sm font-bold px-2 py-0.5 rounded">
                        {selectedCount}
                    </span>
                    <span className="text-sm text-gray-300">selected</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <ActionButton
                        icon={<CheckCircle className="w-4 h-4" />}
                        label="Done"
                        onClick={onMarkDone}
                    />

                    <ActionButton
                        icon={<Archive className="w-4 h-4" />}
                        label="Archive"
                        onClick={onArchive}
                    />

                    {/* Priority dropdown */}
                    <div className="relative group">
                        <button className="flex items-center gap-1.5 px-3 py-2 text-sm hover:bg-gray-700 rounded-lg transition-colors">
                            <ArrowRight className="w-4 h-4" />
                            <span>Priority</span>
                        </button>
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
                            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[100px]">
                                <button
                                    onClick={() => onChangePriority(Priority.HIGH)}
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    High
                                </button>
                                <button
                                    onClick={() => onChangePriority(Priority.MEDIUM)}
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                    Medium
                                </button>
                                <button
                                    onClick={() => onChangePriority(Priority.LOW)}
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    Low
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Status dropdown */}
                    <div className="relative group">
                        <button className="flex items-center gap-1.5 px-3 py-2 text-sm hover:bg-gray-700 rounded-lg transition-colors">
                            <Clock className="w-4 h-4" />
                            <span>Status</span>
                        </button>
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
                            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[120px]">
                                <button
                                    onClick={() => onChangeStatus(Status.TODO)}
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700"
                                >
                                    To Do
                                </button>
                                <button
                                    onClick={() => onChangeStatus(Status.IN_PROGRESS)}
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700"
                                >
                                    In Progress
                                </button>
                                <button
                                    onClick={() => onChangeStatus(Status.DONE)}
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="w-px h-6 bg-gray-700 mx-1" />

                    <ActionButton
                        icon={<Trash2 className="w-4 h-4" />}
                        label="Delete"
                        onClick={onDelete}
                        danger
                    />
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="ml-2 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const ActionButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${danger
                ? 'hover:bg-red-600/20 text-red-400 hover:text-red-300'
                : 'hover:bg-gray-700'
            }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);
