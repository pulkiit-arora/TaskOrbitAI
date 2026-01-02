import React, { useState, useEffect, useRef } from 'react';
import { Layout, Calendar as CalendarIcon, List, Search, Moon, Sun, Trash2 } from 'lucide-react';
import { TaskModal } from './components/TaskModal';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { AppHeader } from './components/AppHeader';
import { BoardView } from './components/BoardView';
import { TodayView } from './components/TodayView';
import { LoadingScreen } from './components/LoadingScreen';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { Tour } from './components/Tour';
import { Legend } from './components/Legend';
import { SearchInput } from './components/SearchInput';
import { CommandPalette } from './components/CommandPalette';
import { Task, Status, Recurrence, Priority, Tag, ViewMode } from './types';
import { useTasks } from './hooks/useTasks';
import { useTaskModal } from './hooks/useTaskModal';
import { useLocalStorageString } from './hooks/useLocalStorage';
import { calculateNextDueDate } from './utils/taskUtils';

const App: React.FC = () => {
  const { tasks, isLoading, setTasks, updateTaskStatus } = useTasks();
  const { isModalOpen, editingTask, openModal, closeModal, openModalWithDate } = useTaskModal();

  const [viewMode, setViewModeState] = useLocalStorageString('lifeflow-view-mode', 'today'); // Default changed to 'today'
  const setViewMode = (mode: ViewMode) => setViewModeState(mode);
  const [showArchived, setShowArchived] = useState(() => {
    try {
      const saved = localStorage.getItem('lifeflow-show-archived');
      return saved === 'true';
    } catch { return false; }
  });
  const [boardSort, setBoardSort] = useState<'priority' | 'dueDate'>(() => {
    try {
      const saved = localStorage.getItem('lifeflow-board-sort');
      return saved === 'dueDate' ? 'dueDate' : 'priority';
    } catch { return 'priority'; }
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>([]);
  const [boardFilter, setBoardFilter] = useState<'all' | 'overdue' | 'week' | 'nodue'>('all');
  const [statusFilter, setStatusFilter] = useLocalStorageString('lifeflow-status-filter', '');

  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>(() => {
    try {
      const saved = localStorage.getItem('lifeflow-status-filters');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [tags, setTags] = useState<Tag[]>(() => {
    try {
      const saved = localStorage.getItem('lifeflow-tags');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [tagFilter, setTagFilter] = useState<string[]>([]); // Array of tag IDs
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('lifeflow-tags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('lifeflow-status-filters', JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, taskId: string | null }>({
    isOpen: false,
    taskId: null
  });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Persist showArchived
  useEffect(() => {
    localStorage.setItem('lifeflow-show-archived', String(showArchived));
  }, [showArchived]);

  // Persist boardSort
  useEffect(() => {
    localStorage.setItem('lifeflow-board-sort', boardSort);
  }, [boardSort]);

  // Show onboarding tour on first visit
  useEffect(() => {
    try {
      const seen = localStorage.getItem('lifeflow-tour-seen');
      if (!seen) setIsTourOpen(true);
    } catch { }
  }, []);

  // Task handlers
  const handleSaveTask = (taskData: Partial<Task>, scope: 'single' | 'series' = 'single') => {
    if (taskData.id) {
      // Check if this is a virtual task (editing an occurrence)
      if (typeof taskData.id === 'string' && taskData.id.includes('-virtual-')) {
        // Extract the base task ID from virtual ID (format: {baseTaskId}-virtual-{timestamp})
        const baseTaskId = taskData.id.split('-virtual-')[0];
        const baseTask = tasks.find(t => t.id === baseTaskId);

        // If user wants to update the SERIES (Base Task)
        if (scope === 'series' && baseTask) {
          // Update the BASE task with the new data.
          // We need to be careful: taskData.id is the virtual ID. We must use baseTaskId.
          // We also need to strip properties that shouldn't override the base task blindly?
          // Actually, the form state reflects what the user wants for the series.
          // So we merge taskData into baseTask, BUT we force the ID to be baseId.
          const updatedBaseTask = {
            ...baseTask,
            ...taskData,
            id: baseTaskId, // Restore real ID
            // Ensure comments are preserved or merged? 
            // Usually edits overwrite. Comments are special (array), modal handles them.
            // If the user deleted a comment in the modal, it's reflected in taskData.comments.
          } as Task;

          setTasks(prev => prev.map(t => t.id === baseTaskId ? updatedBaseTask : t));
          return;
        }

        // Otherwise, SINGLE instance update (Exception logic)
        // If editing a recurring task's occurrence, update the base task's comments
        // and create one-off tasks for other changes (status, description, etc.)
        if (baseTask && baseTask.recurrence !== Recurrence.NONE) {
          // Always update the base task with new comments
          if (taskData.comments) {
            setTasks(prev => prev.map(t =>
              t.id === baseTaskId ? { ...t, comments: taskData.comments } : t
            ));
          }

          // Check if any non-comment fields were actually changed
          // Compare only editable fields (exclude system fields like id, createdAt)
          const editableFields = ['title', 'description', 'status', 'priority', 'dueDate'] as const;
          const otherFieldsChanged = editableFields.some(
            key => taskData[key] !== undefined && taskData[key] !== baseTask[key]
          );

          if (otherFieldsChanged) {
            // Create a one-off task for the specific occurrence with the changes
            const newTask: Task = {
              ...taskData,
              id: crypto.randomUUID(),
              recurrence: Recurrence.NONE,
              isRecurringException: true,
              createdAt: Date.now(),
            } as Task;

            // Fix: Extract the ORIGINAL occurrence date from the virtual ID
            // Format: {baseId}-virtual-{timestamp}
            const virtualTimestamp = parseInt(taskData.id.split('-virtual-')[1], 10);
            const occurrenceDate = new Date(virtualTimestamp).toISOString();

            setTasks(prev => {
              const list = [...prev, newTask];
              // Update base task with exclusion
              return list.map(t => {
                if (t.id === baseTaskId) {
                  const newExcluded = [...(t.excludedDates || [])];
                  if (occurrenceDate && !newExcluded.includes(occurrenceDate)) {
                    newExcluded.push(occurrenceDate);
                  }
                  return { ...t, excludedDates: newExcluded };
                }
                return t;
              });
            });
          }
        } else {
          // For non-recurring virtual tasks, create a new one-off task
          const newTask: Task = {
            ...taskData,
            id: crypto.randomUUID(),
            recurrence: Recurrence.NONE,
            createdAt: Date.now(),
          } as Task;
          setTasks(prev => [...prev, newTask]);
        }
      } else {
        // For real tasks
        let targetId = taskData.id;
        let isVirtual = false;

        // Handle virtual IDs (from recurring instances in Month/Week view)
        if (targetId && typeof targetId === 'string' && targetId.includes('-virtual-')) {
          targetId = targetId.split('-virtual-')[0];
          isVirtual = true;
          // Virtual edits are always single-instance unless specified otherwise (but UI might pass 'series'?)
          // Usually clicking a virtual instance implies 'single' unless user toggles "All events".
          // But let's respect the 'scope' argument if it was passed, otherwise default to single?
          // The 'scope' arg defaults to 'single' in function signature.
        }

        const task = tasks.find(t => t.id === targetId);

        // If it's a recurring task and scope is SINGLE
        if (task && task.recurrence !== Recurrence.NONE && scope === 'single') {

          // Check if we are completing the task (Status -> DONE)
          if (taskData.status === Status.DONE && task.status !== Status.DONE) {
            // Treat this as a standard "Completion" of the occurrence
            // 1. Calculate next due date
            const occurrenceISO = taskData.dueDate || new Date().toISOString(); // Use the edited due date as the completion date
            const anchorISO = task.recurrenceStart || task.dueDate || new Date(task.createdAt).toISOString();

            // Use the imported calculateNextDueDate
            const nextDue = calculateNextDueDate(
              occurrenceISO,
              task.recurrence,
              task.recurrenceInterval || 1,
              task.recurrenceWeekdays,
              task.recurrenceMonthDay,
              anchorISO,
              task.recurrenceMonthNth,
              task.recurrenceMonthWeekday
            );

            setTasks(prev => {
              const base = prev.find(t => t.id === task.id);
              if (!base) return prev;

              // Create History Item (The completed task)
              const history: Task = {
                ...taskData, // Inherit any edits made (desc, title)
                id: crypto.randomUUID(), // New ID
                status: Status.DONE,
                recurrence: Recurrence.NONE,
                // Ensure specific fields key to the instance
                dueDate: occurrenceISO,
                createdAt: Date.now(),
                seriesId: base.id,
              } as Task;

              // Update Base Task (Advance to next due)
              const updatedBase: Task = {
                ...base,
                status: Status.TODO, // Keep Base alive
                dueDate: nextDue.toISOString(),
                // Do NOT exclude the date, because we "moved" away from it.
                // However, if we edited other props (title), those edits are lost on the Base Task (as desired for 'single' scope).
                // Base Task keeps original props.
              };

              return prev.map(t => t.id === task.id ? updatedBase : t).concat(history);
            });

          } else {
            // "Single" edit on the Base Task (Series Head) that is NOT a completion (e.g. rename, change desc)
            // 1. Create a new task (Exception) with the changes
            const newTask: Task = {
              ...taskData,
              id: crypto.randomUUID(),
              recurrence: Recurrence.NONE,
              isRecurringException: true,
              createdAt: Date.now(),
            } as Task;

            // 2. Add the Base Task's CURRENT due date (or specific instance date) to its excludedDates
            const originalDate = task.dueDate;
            // If we are editing a virtual task, we should exclude the date of that virtual task?
            // Virtual ID usually contains the date. But `taskData.dueDate` might be it?
            // The safest is to rely on the fact that if we opened a virtual task due X, we want to hide X.
            // If we changed dates, `taskData.dueDate` is new. `originalDate` is old.
            // We want to hide `originalDate` (from Base) and show `newTask` (Exception) at `newTask.dueDate`.

            const dateToExclude = (isVirtual && taskData.id?.includes('-virtual-'))
              ? taskData.id.split('-virtual-')[1]
              : originalDate;

            const updatedExcludedDates = [...(task.excludedDates || [])];
            if (dateToExclude && !updatedExcludedDates.includes(dateToExclude)) {
              updatedExcludedDates.push(dateToExclude);
            }

            setTasks(prev => {
              const updatedBase = { ...task, excludedDates: updatedExcludedDates };
              const list = prev.map(t => t.id === task.id ? updatedBase : t);
              return [...list, newTask];
            });
          }
        } else {
          // Standard update (Non-recurring OR Series update)
          // If updating series, we apply changes to Base Task.
          // Note: If we just completed the Series, status becomes DONE. Series effectively ends.
          const updatedTask = { ...task, ...taskData, id: targetId } as Task; // ensure we preserve ID? targetId is correct.
          // Wait, if taskData has virtual ID, we must overwrite it with real ID.
          updatedTask.id = targetId;

          setTasks(prev => prev.map(t => t.id === targetId ? updatedTask : t));
        }
      }
    } else {
      const newTask: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      } as Task;
      setTasks(prev => [...prev, newTask]);
    }
  };

  const handleSaveMultipleTasks = (tasksData: Partial<Task>[]) => {
    const newTasks = tasksData.map(t => ({
      ...t,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    } as Task));
    setTasks(prev => [...prev, ...newTasks]);
  };

  const handleMoveTask = (taskId: string, direction: 'prev' | 'next') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const flow = [Status.TODO, Status.IN_PROGRESS, Status.DONE];
    const currentIndex = flow.indexOf(task.status);

    if (direction === 'next' && currentIndex < flow.length - 1) {
      updateTaskStatus(taskId, flow[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      updateTaskStatus(taskId, flow[currentIndex - 1]);
    }
  };

  const handleDropTask = (taskId: string, newStatus: Status) => {
    updateTaskStatus(taskId, newStatus);
  };

  const handleToggleDone = (taskId: string, onDate?: string) => {
    // ... logic same as existing handleToggleDone, just ensuring it's wired
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const togglingToDone = task.status !== Status.DONE;

    if (onDate && togglingToDone && task.recurrence !== Recurrence.NONE) {
      const occurrenceISO = onDate;
      const anchorISO = task.recurrenceStart || task.dueDate || new Date(task.createdAt).toISOString();
      const nextDue = calculateNextDueDate(
        occurrenceISO,
        task.recurrence,
        task.recurrenceInterval || 1,
        task.recurrenceWeekdays,
        task.recurrenceMonthDay,
        anchorISO,
        task.recurrenceMonthNth,
        task.recurrenceMonthWeekday
      );

      setTasks(prev => {
        const base = prev.find(t => t.id === taskId);
        if (!base) return prev;

        const history: Task = {
          ...base,
          id: crypto.randomUUID(),
          status: Status.DONE,
          dueDate: occurrenceISO,
          recurrence: Recurrence.NONE,

          createdAt: Date.now(),
          seriesId: base.id,
        };

        const updatedBase: Task = {
          ...base,
          status: Status.TODO,
          dueDate: nextDue.toISOString(),
          excludedDates: [...(base.excludedDates || []), occurrenceISO]
        };

        return prev.map(t => t.id === taskId ? updatedBase : t).concat(history);
      });
      return;
    }

    if (!onDate && togglingToDone && task.recurrence !== Recurrence.NONE) {
      // ... existing logic for no-date recurring toggle
      const occurrenceISO = task.dueDate || new Date().toISOString();
      const anchorISO2 = task.recurrenceStart || task.dueDate || new Date(task.createdAt).toISOString();
      const nextDue = calculateNextDueDate(
        occurrenceISO,
        task.recurrence,
        task.recurrenceInterval || 1,
        task.recurrenceWeekdays,
        task.recurrenceMonthDay,
        anchorISO2,
        task.recurrenceMonthNth,
        task.recurrenceMonthWeekday
      );

      setTasks(prev => {
        const base = prev.find(t => t.id === taskId);
        if (!base) return prev;

        const history: Task = {
          ...base,
          id: crypto.randomUUID(),
          status: Status.DONE,
          dueDate: occurrenceISO,
          recurrence: Recurrence.NONE,

          createdAt: Date.now(),
          seriesId: base.id,
        };

        const updatedBase: Task = {
          ...base,
          status: Status.TODO,
          dueDate: nextDue.toISOString(),
          excludedDates: [...(base.excludedDates || []), occurrenceISO]
        };

        return prev.map(t => t.id === taskId ? updatedBase : t).concat(history);
      });
      return;
    }

    const newStatus = task.status === Status.DONE ? Status.TODO : Status.DONE;
    if (newStatus === Status.DONE && !task.dueDate) {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const iso = today.toISOString();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueDate: iso } : t));
    }
    updateTaskStatus(taskId, newStatus);
  };

  const handleMarkMissed = (taskId: string) => {
    let targetId = taskId;
    let occurrenceISO: string | null = null;

    if (taskId.includes('-virtual-')) {
      targetId = taskId.split('-virtual-')[0];
      const virtualTimestamp = parseInt(taskId.split('-virtual-')[1], 10);
      occurrenceISO = new Date(virtualTimestamp).toISOString();
    }

    const task = tasks.find(t => t.id === targetId);
    if (!task) return;

    if (task.recurrence !== Recurrence.NONE) {
      const finalOccurrenceISO = occurrenceISO || task.dueDate || new Date().toISOString();

      const anchorISO = task.recurrenceStart || task.dueDate || new Date(task.createdAt).toISOString();
      const nextDue = calculateNextDueDate(
        finalOccurrenceISO,
        task.recurrence,
        task.recurrenceInterval || 1,
        task.recurrenceWeekdays,
        task.recurrenceMonthDay,
        anchorISO,
        task.recurrenceMonthNth,
        task.recurrenceMonthWeekday
      );

      setTasks(prev => {
        const base = prev.find(t => t.id === targetId);
        if (!base) return prev;

        const history: Task = {
          ...base, // Copy props
          id: crypto.randomUUID(),
          status: Status.EXPIRED, // MARK AS EXPIRED
          dueDate: finalOccurrenceISO,
          recurrence: Recurrence.NONE,
          seriesId: base.id,
          createdAt: Date.now(),
        };

        const updatedBase: Task = {
          ...base,
          status: Status.TODO,
          dueDate: nextDue.toISOString(),
          excludedDates: [...(base.excludedDates || []), finalOccurrenceISO]
        };

        return prev.map(t => t.id === targetId ? updatedBase : t).concat(history);
      });
    } else {
      // Single task: just mark expired
      updateTaskStatus(targetId, Status.EXPIRED);
    }
  };

  const handleArchiveTask = (taskId: string) => {
    updateTaskStatus(taskId, Status.ARCHIVED);
  };

  const handleDeleteTask = (taskId: string) => {
    setDeleteConfirmation({ isOpen: true, taskId });
  };

  const handleDropTaskDate = (taskId: string, newDate: Date) => {
    // Check if it's a virtual task
    if (taskId.includes('-virtual-')) {
      const baseTaskId = taskId.split('-virtual-')[0];
      const virtualTimestamp = parseInt(taskId.split('-virtual-')[1], 10);
      const originalDateISO = new Date(virtualTimestamp).toISOString();
      const baseTask = tasks.find(t => t.id === baseTaskId);

      if (baseTask) {
        // Create Exception for this virtual instance movement
        let updatedDate = new Date(newDate);
        // Default to same time or noon
        updatedDate.setHours(12, 0, 0, 0);

        const newTask: Task = {
          ...baseTask,
          id: crypto.randomUUID(),
          recurrence: Recurrence.NONE,
          isRecurringException: true,
          dueDate: updatedDate.toISOString(),
          createdAt: Date.now(),
        };

        setTasks(prev => {
          // Update base task with exclusion
          const updatedBase = {
            ...baseTask,
            excludedDates: [...(baseTask.excludedDates || []), originalDateISO]
          };
          // Replace base task and add new exception
          return prev.map(t => t.id === baseTaskId ? updatedBase : t).concat(newTask);
        });
      }
      return;
    }

    // Real Task
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let updatedDate = new Date(newDate);
    if (task.dueDate) {
      const originalDate = new Date(task.dueDate);
      updatedDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
    } else {
      updatedDate.setHours(12, 0, 0, 0);
    }
    const newDueDateISO = updatedDate.toISOString();

    // If it's a Base Recurring Task, treat drag as an Exception (move THIS instance)
    if (task.recurrence !== Recurrence.NONE) {
      // Exception logic
      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        recurrence: Recurrence.NONE,
        isRecurringException: true,
        isRecurringException: true,
        dueDate: newDueDateISO,
        createdAt: Date.now(),
      };

      const originalDateISO = task.dueDate;

      setTasks(prev => {
        const updatedBase = {
          ...task,
          excludedDates: originalDateISO ? [...(task.excludedDates || []), originalDateISO] : task.excludedDates
        };
        return prev.map(t => t.id === task.id ? updatedBase : t).concat(newTask);
      });
      return;
    }

    // Normal Task Move
    const updatedTask: Task = {
      ...task,
      dueDate: newDueDateISO,
    };

    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };



  const confirmDelete = (scope?: 'single' | 'series') => {
    if (deleteConfirmation.taskId) {
      if (deleteConfirmation.taskId.includes('-virtual-')) {
        // It's a virtual occurrence
        if (scope === 'series') {
          // Delete the BASE task (entire series)
          const baseTaskId = deleteConfirmation.taskId.split('-virtual-')[0];
          setTasks(prev => prev.filter(t => t.id !== baseTaskId));
        } else {
          // Delete just this occurrence (default)
          const baseTaskId = deleteConfirmation.taskId.split('-virtual-')[0];
          const timestamp = Number(deleteConfirmation.taskId.split('-virtual-')[1]);
          const dateISO = new Date(timestamp).toISOString();

          setTasks(prev => prev.map(t => {
            if (t.id === baseTaskId) {
              return {
                ...t,
                excludedDates: [...(t.excludedDates || []), dateISO]
              };
            }
            return t;
          }));
        }
      } else {
        // It's a real task (could be base recurring or normal)
        const task = tasks.find(t => t.id === deleteConfirmation.taskId);
        if (task && task.recurrence !== Recurrence.NONE && scope === 'single') {
          // User wants to delete just this instance of a real recurring task
          setTasks(prev => prev.filter(t => t.id !== deleteConfirmation.taskId));
        } else {
          // Normal delete (series or non-recurring)
          setTasks(prev => prev.filter(t => t.id !== deleteConfirmation.taskId));
        }
      }

      setDeleteConfirmation({ isOpen: false, taskId: null });
      if (editingTask?.id === deleteConfirmation.taskId) {
        closeModal();
      }
    }
  };

  // Export/Import handlers
  const handleExportData = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `taskorbit-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedTasks = JSON.parse(content);
        if (Array.isArray(importedTasks)) {
          if (window.confirm('This will overwrite your current tasks. Are you sure?')) {
            setTasks(importedTasks);
          }
        } else {
          alert('Invalid file format');
        }
      } catch (error) {
        console.error('Error importing file:', error);
        alert('Failed to parse the file');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleCloseTour = () => {
    try { localStorage.setItem('lifeflow-tour-seen', 'true'); } catch { }
    setIsTourOpen(false);
  };

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const filteredTasks = React.useMemo(() => {
    let list = tasks.filter(t => showArchived ? true : t.status !== Status.ARCHIVED);

    if (priorityFilter.length > 0) {
      list = list.filter(t => priorityFilter.includes(t.priority));
    }

    if (selectedStatuses.length > 0) {
      list = list.filter(t => selectedStatuses.includes(t.status));
    }

    if (tagFilter.length > 0) {
      list = list.filter(t => t.tags && t.tags.some(tag => tagFilter.includes(tag.id)));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    return list;
  }, [tasks, showArchived, searchQuery, priorityFilter, selectedStatuses, tagFilter]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />
      {/* Top Banner (Global Toolbar) */}
      <div className="sticky top-0 z-[60] bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs px-4 py-1 flex items-center justify-between shadow-sm h-8 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-500 dark:text-gray-400 hidden sm:inline">Build: {import.meta.env.VITE_BUILD_TIME || 'Dev'}</span>
          <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
          <button
            onClick={() => setIsTourOpen(true)}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            Tour
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
          <button
            onClick={toggleDarkMode}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            title="Toggle Theme"
          >
            {darkMode ? <Sun size={12} /> : <Moon size={12} />}
            <span className="hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <a href="mailto:pulkiit.arora@gmail.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Contact Me
          </a>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={handleExportData}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            title="Backup Tasks"
          >
            Export
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={handleImportClick}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            title="Restore Tasks"
          >
            Import
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={() => setIsDeleteAllOpen(true)}
            className="hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1"
            title="Delete All Tasks"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Delete All</span>
          </button>
        </div>
      </div>

      <AppHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentDate={currentDate}
        navigateDate={navigateDate}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        onAddTask={() => openModal()}
        tasks={tasks}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="flex-1 overflow-hidden bg-gray-50 p-4 md:p-6">
        {viewMode === 'today' && (
          <TodayView
            tasks={filteredTasks}
            onEditTask={(task) => openModal(task)}
            onMoveTask={handleMoveTask}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={handleDeleteTask}
            onToggleDone={handleToggleDone}
            onDropTask={handleDropTaskDate}
            onAddTask={() => openModalWithDate(new Date())}
          />
        )}

        {viewMode === 'board' && (
          <BoardView
            tasks={filteredTasks}
            boardFilter={boardFilter}
            setBoardFilter={setBoardFilter}
            boardSort={boardSort}
            setBoardSort={setBoardSort}
            showArchived={showArchived}
            onEditTask={(task) => openModal(task)}
            onMoveTask={handleMoveTask}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={handleDeleteTask}
            onDropTask={handleDropTask}
            onDeleteAll={() => setIsDeleteAllOpen(true)}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            statusFilter={selectedStatuses}
            setStatusFilter={setSelectedStatuses}
            tags={tags}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
          />
        )}

        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            tasks={filteredTasks}
            onEditTask={(task) => openModal(task)}
            onToggleDone={handleToggleDone}
            onAddTask={openModalWithDate}
            onDropTask={handleDropTaskDate}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            statusFilter={selectedStatuses}
            setStatusFilter={setSelectedStatuses}
            tags={tags}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            tasks={filteredTasks}
            onEditTask={(task) => openModal(task)}
            onMoveTask={handleMoveTask}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={handleDeleteTask}
            onToggleDone={handleToggleDone}
            onAddTask={openModalWithDate}
            onDropTask={handleDropTaskDate}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            statusFilter={selectedStatuses}
            setStatusFilter={setSelectedStatuses}
            tags={tags}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
          />
        )}
      </main>

      <Tour
        isOpen={isTourOpen}
        onClose={handleCloseTour}
        steps={[
          {
            title: 'Welcome to TaskOrbit AI',
            description: 'Your central hub for productivity. Manage tasks, build habits, and track progress across powerful views.'
          },
          {
            title: 'New Today View',
            description: 'Start your day with the focused Today view. See what needs your attention right now in a clean list.'
          },
          {
            title: 'Flexible Views',
            description: 'Switch between the new Today list, Board (Kanban), Week, and Month views to visualize your workload exactly how you prefer.'
          },
          {
            title: 'Command Palette',
            description: 'Power User Tip: Press Ctrl+K (or Cmd+K) to instantly access the Command Palette. Create tasks, navigate views, or toggle themes without lifting your hands.'
          },
          {
            title: 'Global Actions',
            description: 'Access global controls in the top bar to toggle Dark Mode, Export your data for safekeeping, or Import backups.'
          },
        ]}
      />

      <TaskModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={(data, scope) => handleSaveTask(data, scope)}
        onSaveMultiple={handleSaveMultipleTasks}
        onDelete={(id) => handleDeleteTask(id)}
        // We need to pass the mark missed handler to modal if we want it there
        onMarkMissed={handleMarkMissed}
        task={editingTask || undefined}
        tasks={tasks} // Pass all tasks for stats calculation
        availableTags={tags}
        onCreateTag={(newTag) => setTags(prev => [...prev, newTag])}
      />


      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, taskId: null })}
        isRecurring={(() => {
          if (!deleteConfirmation.taskId) return false;
          if (deleteConfirmation.taskId.includes('-virtual-')) return true; // virtual implies recurring
          const t = tasks.find(x => x.id === deleteConfirmation.taskId);
          return t ? t.recurrence !== Recurrence.NONE : false;
        })()}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteAllOpen}
        onConfirm={() => {
          setTasks([]);
          setIsDeleteAllOpen(false);
        }}
        onCancel={() => setIsDeleteAllOpen(false)}
        title="Delete All Tasks?"
        message="This will permanently delete ALL tasks in your workspace. This action cannot be undone."
      />
      <CommandPalette
        tasks={tasks}
        onNavigate={(view) => setViewMode(view as ViewMode)}
        onAddTask={() => openModal()}
        onEditTask={(task) => openModal(task)}
        toggleTheme={toggleDarkMode}
        darkMode={darkMode}
      />
    </div>
  );
};

export default App;
