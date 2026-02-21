import React, { useState, useEffect } from 'react';
import { Task, Priority, Recurrence, Status, AISuggestion, Tag, Subtask, TimeEntry } from '../types';
import { X, Sparkles, Plus, ChevronDown, Activity, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { TagPicker } from './TagPicker';
import { SubtaskList } from './SubtaskList';
import { TimeTracker } from './TimeTracker';
import { RecurrencePreview } from './RecurrencePreview';
import { generateTaskSuggestions } from '../services/geminiService';
import { calculateTaskStats } from '../utils/taskUtils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>, scope?: 'single' | 'series') => void;
  onSaveMultiple?: (tasks: Partial<Task>[]) => void;
  onDelete?: (taskId: string) => void;
  onMarkMissed?: (taskId: string) => void;
  task?: Partial<Task>;
  tasks?: Task[];
  availableTags?: Tag[];
  onCreateTag?: (tag: Tag) => void;
  onUpdateTag?: (tag: Tag) => void;
  onDeleteTag?: (tagId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, onSaveMultiple, onDelete, onMarkMissed, task, tasks, availableTags = [], onCreateTag = () => { }, onUpdateTag, onDeleteTag }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [status, setStatus] = useState<Status>(Status.TODO);
  const [recurrence, setRecurrence] = useState<Recurrence>(Recurrence.NONE);
  const [dueDate, setDueDate] = useState('');
  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([]);
  const [recurrenceMonthDay, setRecurrenceMonthDay] = useState<number | undefined>(undefined);
  const [recurrenceMonthNth, setRecurrenceMonthNth] = useState<number | undefined>(undefined);
  const [recurrenceMonthWeekday, setRecurrenceMonthWeekday] = useState<number | undefined>(undefined);
  const [recurrenceMonths, setRecurrenceMonths] = useState<number[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  // Progress comments
  const [comments, setComments] = useState<{ id: string; text: string; createdAt: number }[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(25);

  // 'single' = update only this instance (exception). 'series' = update base task.
  const [saveScope, setSaveScope] = useState<'single' | 'series'>('single');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || Priority.MEDIUM);
      setStatus(task.status || Status.TODO);
      setRecurrence(task.recurrence || Recurrence.NONE);
      setRecurrenceInterval(task.recurrenceInterval || 1);
      setRecurrenceWeekdays(task.recurrenceWeekdays || []);
      setRecurrenceMonthDay(task.recurrenceMonthDay);
      setRecurrenceMonthNth(task.recurrenceMonthNth);
      setRecurrenceMonthWeekday(task.recurrenceMonthWeekday);
      setRecurrenceMonths(task.recurrenceMonths || []);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      setRecurrenceStart(task.recurrenceStart ? new Date(task.recurrenceStart).toISOString().split('T')[0] : '');
      setRecurrenceEnd(task.recurrenceEnd ? new Date(task.recurrenceEnd).toISOString().split('T')[0] : '');
      setComments(task.comments || []);
      setTags(task.tags || []);
      setSubtasks(task.subtasks || []);
      setTimeEntries(task.timeEntries || []);
      setEstimatedMinutes(task.estimatedMinutes || 25);
    } else {
      resetForm();
    }

  }, [task, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority(Priority.MEDIUM);
    setStatus(Status.TODO);
    setRecurrence(Recurrence.NONE);
    setDueDate('');
    setRecurrenceStart('');
    setRecurrenceEnd('');
    setRecurrenceInterval(1);
    setRecurrenceWeekdays([]);
    setRecurrenceMonthDay(undefined);
    setRecurrenceMonthNth(undefined);
    setRecurrenceMonthWeekday(undefined);
    setRecurrenceMonths([]);
    setComments([]);
    setNewCommentText('');
    setSuggestions([]);
    setTags([]);
    setSubtasks([]);
    setTimeEntries([]);
    setEstimatedMinutes(25);
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
      recurrenceInterval,
      recurrenceWeekdays,
      recurrenceMonthDay,
      recurrenceMonthNth,
      recurrenceMonthWeekday,
      recurrenceMonths,
      dueDate: isoDate,
      recurrenceStart: isoRecurrenceStart,
      recurrenceEnd: isoRecurrenceEnd,
      comments,
      status: status,
      createdAt: task?.createdAt || Date.now(),
      tags: tags,
      subtasks: subtasks,
      timeEntries: timeEntries,
      estimatedMinutes: estimatedMinutes,
    }, saveScope);
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{task?.id ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Stats Section for Recurring Tasks */}
        {task?.id && task.recurrence !== Recurrence.NONE && tasks && (
          <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-6 overflow-x-auto">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm whitespace-nowrap">
              <Activity size={16} /> Performance
            </div>
            {(() => {
              // Calculate stats for this series
              // If it's a virtual task, we need the base ID
              const seriesId = task.id.includes('-virtual-') ? task.id.split('-virtual-')[0] : (task.seriesId || task.id);
              const stats = calculateTaskStats(tasks, seriesId);

              if (!stats || stats.total === 0) return <span className="text-xs text-gray-500">No history yet</span>;

              return (
                <div className="flex gap-4 text-xs">
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400">Completion Rate</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{stats.rate}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400">Completed</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{stats.completed}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400">Missed</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{stats.expired}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Plan summer vacation"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 filter-none"
                />
                {!task?.id && (
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (Categories)</label>
              <TagPicker
                selectedTags={tags}
                availableTags={availableTags}
                onTagsChange={setTags}
                onCreateTag={onCreateTag}
                onUpdateTag={onUpdateTag}
                onDeleteTag={onDeleteTag}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about the task..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Subtasks section */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <SubtaskList
                subtasks={subtasks}
                onChange={setSubtasks}
              />
            </div>

            {/* Progress comments section */}

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Progress Comments</label>
              <div className="space-y-2">
                {comments.length === 0 && (
                  <div className="text-xs text-gray-400 italic">No comments yet. Add progress notes here.</div>
                )}
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                    <div className="text-sm text-gray-800 flex-1 break-words break-all whitespace-pre-wrap">
                      {(c.text || '').split(/(https?:\/\/[^\s]+)/g).map((part, i) => (
                        part.match(/https?:\/\/[^\s]+/) ? (
                          <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >{part}</a>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      ))}
                    </div>
                    <button
                      onClick={() => setComments(prev => prev.filter(x => x.id !== c.id))}
                      className="text-xs text-red-600 hover:underline"
                      type="button"
                    >Delete</button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a progress comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newCommentText.trim()) {
                          setComments(prev => [...prev, { id: crypto.randomUUID(), text: newCommentText.trim(), createdAt: Date.now() }]);
                          setNewCommentText('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!newCommentText.trim()) return;
                      setComments(prev => [...prev, { id: crypto.randomUUID(), text: newCommentText.trim(), createdAt: Date.now() }]);
                      setNewCommentText('');
                    }}
                  >Add</Button>
                </div>
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 appearance-none cursor-pointer"
                  >
                    <option value={Status.TODO}>To Do</option>
                    <option value={Status.IN_PROGRESS}>In Progress</option>
                    <option value={Status.DONE}>Done</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <ChevronDown size={16} />
                  </div>
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

                {recurrence !== Recurrence.NONE && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Every</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                        <span className="text-xs text-gray-600">
                          {recurrence === Recurrence.DAILY ? 'day(s)' : recurrence === Recurrence.WEEKLY ? 'week(s)' : recurrence === Recurrence.MONTHLY ? 'month(s)' : recurrence === Recurrence.QUARTERLY ? 'quarter(s)' : 'year(s)'}
                        </span>
                      </div>
                    </div>

                    {recurrence === Recurrence.WEEKLY && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Days of week</label>
                        <div className="flex gap-1 flex-wrap">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, idx) => {
                            const active = recurrenceWeekdays.includes(idx);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setRecurrenceWeekdays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
                                }}
                                className={`px-2 py-1 rounded text-xs border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {recurrence === Recurrence.MONTHLY && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Day of month (optional)</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={recurrenceMonthDay ?? ''}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setRecurrenceMonthDay(Number.isNaN(v) ? undefined : Math.min(31, Math.max(1, Math.floor(v))));
                          }}
                          placeholder="e.g., 15"
                          className="w-28 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">Leave empty to use task's existing day or the due date's day.</p>
                      </div>
                    )}
                    {recurrence === Recurrence.MONTHLY && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Or: Nth weekday of month</label>
                        <div className="flex items-center gap-2 mb-2">
                          <select
                            value={recurrenceMonthNth ?? ''}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setRecurrenceMonthNth(Number.isNaN(v) ? undefined : v);
                            }}
                            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Select</option>
                            <option value={1}>First</option>
                            <option value={2}>Second</option>
                            <option value={3}>Third</option>
                            <option value={4}>Fourth</option>
                            <option value={-1}>Last</option>
                          </select>

                          <div className="flex gap-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setRecurrenceMonthWeekday(prev => prev === idx ? undefined : idx)}
                                className={`px-2 py-1 rounded text-xs border ${recurrenceMonthWeekday === idx ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 ml-2">(e.g., Last Sat)</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {recurrence !== Recurrence.NONE && (
                  <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Active Months (Seasonal Recurrence)</label>
                    <div className="flex gap-1 flex-wrap">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, idx) => {
                        const active = recurrenceMonths.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setRecurrenceMonths(prev => prev.includes(idx) ? prev.filter(m => m !== idx) : [...prev, idx]);
                            }}
                            className={`px-2 py-1 rounded text-xs border transition-colors ${active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                            title={`Click to toggle ${label}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Select specific months for this task to occur. Leave empty for all months.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Time Tracking section */}
            {task?.id && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <TimeTracker
                  timeEntries={timeEntries}
                  onChange={setTimeEntries}
                />
              </div>
            )}

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Duration (minutes)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Math.max(5, parseInt(e.target.value) || 25))}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Recurrence Preview */}
            {recurrence !== Recurrence.NONE && (
              <RecurrencePreview task={{
                recurrence, recurrenceInterval, recurrenceWeekdays,
                recurrenceMonthDay, dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined,
                recurrenceStart: recurrenceStart ? new Date(`${recurrenceStart}T12:00:00`).toISOString() : undefined,
              } as Partial<Task>} />
            )}

          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 space-y-4">
          {/* Show recurrence scope selector if editing a recurring task */}
          {task?.id && (task.id.includes('-virtual-') || (task.recurrence && task.recurrence !== Recurrence.NONE)) && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Edit Scope:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saveScope"
                    checked={saveScope === 'single'}
                    onChange={() => setSaveScope('single')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">This event</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saveScope"
                    checked={saveScope === 'series'}
                    onChange={() => setSaveScope('series')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">All events</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              {task?.id && onDelete && (
                <Button variant="danger" onClick={() => onDelete(task.id!)}>Delete</Button>
              )}
              {task?.id && (
                task.status === Status.EXPIRED ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onSave({ id: task.id, status: Status.TODO }, 'single');
                      onClose();
                    }}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <RotateCcw size={16} className="mr-1 inline" />
                    Restore Task
                  </Button>
                ) : (
                  onMarkMissed && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        onMarkMissed(task.id!);
                        onClose();
                      }}
                      className="!bg-orange-500 !text-white !hover:bg-orange-600 !border-transparent shadow-sm"
                    >
                      <AlertCircle size={16} className="mr-1 inline" />
                      Mark Missed
                    </Button>
                  )
                )
              )}
            </div>
            <div className="flex gap-3 ml-auto flex-wrap">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave}>Save Task</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};