import React, { useState } from 'react';
import { TimeEntry } from '../types';
import { Clock, Plus, Trash2 } from 'lucide-react';

interface TimeTrackerProps {
    timeEntries: TimeEntry[];
    onChange: (entries: TimeEntry[]) => void;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ timeEntries, onChange }) => {
    const [manualMinutes, setManualMinutes] = useState('');
    const [manualLabel, setManualLabel] = useState('');

    const totalSeconds = timeEntries.reduce((sum, e) => sum + e.duration, 0);

    const addManualEntry = () => {
        const mins = parseInt(manualMinutes);
        if (isNaN(mins) || mins <= 0) return;

        const entry: TimeEntry = {
            id: crypto.randomUUID(),
            startTime: Date.now() - mins * 60 * 1000,
            endTime: Date.now(),
            duration: mins * 60,
            label: manualLabel.trim() || 'Manual entry',
        };
        onChange([...timeEntries, entry]);
        setManualMinutes('');
        setManualLabel('');
    };

    const removeEntry = (id: string) => {
        onChange(timeEntries.filter(e => e.id !== id));
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time Logged</span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatDuration(totalSeconds)}</span>
            </div>

            {/* Entries list */}
            {timeEntries.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                    {timeEntries.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between py-1 px-2
              rounded bg-gray-50 dark:bg-gray-700/50 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">
                                    {new Date(entry.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-gray-700 dark:text-gray-300">{entry.label || 'Session'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">{formatDuration(entry.duration)}</span>
                                <button onClick={() => removeEntry(entry.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add manual entry */}
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    placeholder="Min"
                    value={manualMinutes}
                    onChange={e => setManualMinutes(e.target.value)}
                    className="w-16 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min={1}
                />
                <input
                    type="text"
                    placeholder="Label (optional)"
                    value={manualLabel}
                    onChange={e => setManualLabel(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                    onClick={addManualEntry}
                    disabled={!manualMinutes || parseInt(manualMinutes) <= 0}
                    className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};
