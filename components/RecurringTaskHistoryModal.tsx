import React from 'react';
import { Task, Status } from '../types';
import { X, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export interface RecurringStat {
    task: Task;
    ratio: number;
    total: number;
    completed: number;
    missed: number;
    latestTime: number;
    historyList: Task[];
}

interface RecurringTaskHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    stat: RecurringStat | null;
}

export const RecurringTaskHistoryModal: React.FC<RecurringTaskHistoryModalProps> = ({ isOpen, onClose, stat }) => {
    if (!isOpen || !stat) return null;

    const { task, ratio, total, completed, missed, historyList } = stat;

    // Sort history latest first
    const sortedHistory = [...historyList].sort((a, b) => {
        const timeA = a.completedAt || new Date(a.dueDate || a.createdAt).getTime();
        const timeB = b.completedAt || new Date(b.dueDate || b.createdAt).getTime();
        return timeB - timeA;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
                
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            {task.title}
                        </h2>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock size={14} /> Series History
                            </span>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${ratio >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                ratio >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                                {ratio}% Completion Rate
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scorecard */}
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="p-4 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Expected</span>
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">{total}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center">
                        <span className="text-xs text-green-600 dark:text-green-400 uppercase font-semibold mb-1 flex items-center gap-1"><CheckCircle size={12}/> Completed</span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">{completed}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center">
                        <span className="text-xs text-red-500 uppercase font-semibold mb-1 flex items-center gap-1"><AlertCircle size={12}/> Missed</span>
                        <span className="text-2xl font-bold text-red-500">{missed}</span>
                    </div>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 uppercase tracking-wider">Occurrence History</h3>
                    
                    {sortedHistory.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No recorded history for this recurring task yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedHistory.map((item) => {
                                const isDone = item.status === Status.DONE;
                                // Use completedAt if done, otherwise fallback to dueDate or createdAt
                                const timestamp = isDone && item.completedAt 
                                    ? item.completedAt 
                                    : new Date(item.dueDate || item.createdAt).getTime();
                                    
                                const displayDate = new Date(timestamp).toLocaleDateString(undefined, { 
                                    weekday: 'short', 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                });

                                return (
                                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                                        isDone 
                                        ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30' 
                                        : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            {isDone ? (
                                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                                                    <AlertCircle size={16} className="text-red-500" />
                                                </div>
                                            )}
                                            
                                            <div>
                                                <span className={`text-sm font-medium ${isDone ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                                    {isDone ? 'Completed' : 'Missed'}
                                                </span>
                                                <div className="flex items-center text-xs text-gray-500 mt-0.5 gap-1">
                                                    <Calendar size={12} />
                                                    {displayDate}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
