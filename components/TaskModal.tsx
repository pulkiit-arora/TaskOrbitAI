import React, { useState, useEffect } from 'react';
import { Task, Priority, Recurrence, Status, AISuggestion } from '../types';
import { X, Sparkles, Plus, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { generateTaskSuggestions } from '../services/geminiService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onSaveMultiple?: (tasks: Partial<Task>[]) => void;
  onDelete?: (taskId: string) => void;
  task?: Partial<Task>;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, onSaveMultiple, onDelete, task }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [recurrence, setRecurrence] = useState<Recurrence>(Recurrence.NONE);
  const [dueDate, setDueDate] = useState('');
  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || Priority.MEDIUM);
      setRecurrence(task.recurrence || Recurrence.NONE);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      setRecurrenceStart(task.recurrenceStart ? new Date(task.recurrenceStart).toISOString().split('T')[0] : '');
      setRecurrenceEnd(task.recurrenceEnd ? new Date(task.recurrenceEnd).toISOString().split('T')[0] : '');
    } else {
      resetForm();
    }
  }, [task, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority(Priority.MEDIUM);
    setRecurrence(Recurrence.NONE);
    setDueDate('');
    setRecurrenceStart('');
    setRecurrenceEnd('');
    setSuggestions([]);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    
    // Fix: Append T12:00:00 to ensure the date is set to noon to avoid timezone shift issues
    const formatISO = (dateStr: string) => dateStr ? new Date(`${dateStr}T12:00:00`).toISOString() : undefined;

    const isoDate = formatISO(dueDate);
    
    // If recurrence is set but no start date, default start date to due date or today
    let isoRecurrenceStart = formatISO(recurrenceStart);
    if (recurrence !== Recurrence.NONE && !isoRecurrenceStart && isoDate) {
        isoRecurrenceStart = isoDate;
    }

    const isoRecurrenceEnd = formatISO(recurrenceEnd);

    onSave({
      id: task?.id,
      title,
      description,
      priority,
      recurrence,
      dueDate: isoDate,
      recurrenceStart: isoRecurrenceStart,
      recurrenceEnd: isoRecurrenceEnd,
      status: task?.status || Status.TODO,
      createdAt: task?.createdAt || Date.now(),
    });
    onClose();
  };

  const handleGenerate = async () => {
    if (!title.trim()) return;
    setIsGenerating(true);
    const results = await generateTaskSuggestions(title);
    setSuggestions(results);
    setIsGenerating(false);
  };

  const handleAddSuggestion = (suggestion: AISuggestion) => {
    if (onSaveMultiple) {
         onSave({
            title: suggestion.title,
            description: suggestion.description,
            priority: suggestion.priority,
            recurrence: Recurrence.NONE,
            status: Status.TODO,
            createdAt: Date.now(),
        });
        setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
    }
  };

  const handleAddAllSuggestions = () => {
      if (onSaveMultiple && suggestions.length > 0) {
          const tasksToAdd = suggestions.map(s => ({
            title: s.title,
            description: s.description,
            priority: s.priority,
            recurrence: Recurrence.NONE,
            status: Status.TODO,
            createdAt: Date.now(),
          }));
          onSaveMultiple(tasksToAdd);
          onClose();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">{task?.id ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Plan summer vacation"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                 { !task?.id && (
                    <Button 
                        type="button" 
                        variant="secondary" 
                        className="flex-shrink-0"
                        onClick={handleGenerate}
                        isLoading={isGenerating}
                        disabled={!title.trim()}
                        title="Generate subtasks with AI"
                    >
                        <Sparkles size={16} className={isGenerating ? "" : "text-purple-600"} />
                    </Button>
                 )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                 {!task?.id && "Tip: Enter a personal goal (e.g. \"Get fit\") and click the sparkle icon to let AI break it down."}
              </p>
            </div>

            {suggestions.length > 0 && (
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                            <Sparkles size={14} /> AI Suggestions
                        </h3>
                        <button 
                            onClick={handleAddAllSuggestions}
                            className="text-xs text-purple-700 underline hover:text-purple-900"
                        >
                            Add All
                        </button>
                    </div>
                    <ul className="space-y-2">
                        {suggestions.map((s, idx) => (
                            <li key={idx} className="flex justify-between items-start bg-white p-2 rounded border border-purple-100 shadow-sm">
                                <div>
                                    <p className="font-medium text-sm text-gray-800">{s.title}</p>
                                    <p className="text-xs text-gray-500">{s.description}</p>
                                </div>
                                <button 
                                    onClick={() => handleAddSuggestion(s)}
                                    className="text-purple-600 hover:bg-purple-100 p-1 rounded"
                                >
                                    <Plus size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about the task..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 appearance-none cursor-pointer"
                  >
                    <option value={Priority.LOW}>Low</option>
                    <option value={Priority.MEDIUM}>Medium</option>
                    <option value={Priority.HIGH}>High</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence</label>
                <div className="grid grid-cols-1 gap-4">
                    <div className="relative">
                        <select
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 appearance-none cursor-pointer"
                        >
                            <option value={Recurrence.NONE}>No Recurrence</option>
                            <option value={Recurrence.DAILY}>Daily</option>
                            <option value={Recurrence.WEEKLY}>Weekly</option>
                            <option value={Recurrence.MONTHLY}>Monthly</option>
                            <option value={Recurrence.QUARTERLY}>Quarterly</option>
                            <option value={Recurrence.YEARLY}>Yearly</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                            <ChevronDown size={16} />
                        </div>
                    </div>

                    {recurrence !== Recurrence.NONE && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={recurrenceStart}
                                    onChange={(e) => setRecurrenceStart(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={recurrenceEnd}
                                    onChange={(e) => setRecurrenceEnd(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between gap-3">
          {task && onDelete && (
             <Button variant="danger" onClick={() => onDelete(task.id)}>Delete</Button>
          )}
          <div className="flex gap-3 ml-auto">
             <Button variant="ghost" onClick={onClose}>Cancel</Button>
             <Button onClick={handleSave}>Save Task</Button>
          </div>
        </div>
      </div>
    </div>
  );
};