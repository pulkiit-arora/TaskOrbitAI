import React, { useState, useEffect, useRef } from 'react';
import { BoardColumn } from './components/BoardColumn';
import { TaskModal } from './components/TaskModal';
import { Button } from './components/Button';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { Task, Status, Priority, Recurrence } from './types';
import { loadTasksFromDB, saveTasksToDB } from './services/storage';
import { Plus, Archive, CheckSquare, Layout, Calendar, ChevronLeft, ChevronRight, Grid, Loader2, Download, Upload } from 'lucide-react';

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Pay Electricity Bill',
    description: 'Due before the 5th of the month.',
    status: Status.TODO,
    priority: Priority.HIGH,
    recurrence: Recurrence.MONTHLY,
    createdAt: Date.now(),
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString()
  },
  {
    id: '2',
    title: 'Morning Meditation',
    description: '10 minutes of mindfulness',
    status: Status.TODO,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.DAILY,
    createdAt: Date.now()
  },
  {
    id: '3',
    title: 'Grocery Shopping',
    description: 'Milk, eggs, bread, and fruits.',
    status: Status.IN_PROGRESS,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.WEEKLY,
    createdAt: Date.now()
  },
  {
    id: '4',
    title: 'Book Dentist Appointment',
    description: 'Regular checkup.',
    status: Status.TODO,
    priority: Priority.LOW,
    recurrence: Recurrence.NONE,
    createdAt: Date.now()
  }
];

type ViewMode = 'board' | 'week' | 'month';

const App: React.FC = () => {
  // We start with an empty array and a loading flag
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('App component rendered, isLoading:', isLoading, 'tasks:', tasks.length);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, taskId: string | null}>({
    isOpen: false,
    taskId: null
  });
  
  // File input ref for importing data
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI Preferences remain in LocalStorage for instant visual readiness
  const [showArchived, setShowArchived] = useState(() => {
    try {
        const saved = localStorage.getItem('lifeflow-show-archived');
        return saved === 'true';
    } catch { return false; }
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
        const saved = localStorage.getItem('lifeflow-view-mode');
        return (saved === 'week' || saved === 'month') ? (saved as ViewMode) : 'board';
    } catch { return 'board'; }
  });


  const [boardSort, setBoardSort] = useState<'priority' | 'dueDate'>(() => {
    try {
      const saved = localStorage.getItem('lifeflow-board-sort');
      return saved === 'dueDate' ? 'dueDate' : 'priority';
    } catch { return 'priority'; }
  });  const [currentDate, setCurrentDate] = useState(new Date());
  

  // --- Persistence Logic ---

  // 1. Load from DB on Mount
  useEffect(() => {
    const initData = async () => {
        console.log('initData starting...');
        setIsLoading(true);
        try {
            const loadedTasks = await loadTasksFromDB();
            console.log('loadedTasks:', loadedTasks);
            const hasInitialized = localStorage.getItem('lifeflow-initialized');

            if (hasInitialized) {
                 // App has been used before, trust the DB (even if empty)
                 setTasks(loadedTasks);
            } else {
                // First run of this logic
                if (loadedTasks.length > 0) {
                    // Migration: We found data in DB but no flag. 
                    // Assume user has used the app before. Keep their data.
                    setTasks(loadedTasks);
                } else {
                    // Truly new user (or cleared data). Seed.
                    setTasks(INITIAL_TASKS);
                    saveTasksToDB(INITIAL_TASKS);
                }
                // Mark as initialized so next time we respect empty lists (e.g. if user deletes all tasks)
                localStorage.setItem('lifeflow-initialized', 'true');
            }
        } catch (e) {
            console.error("Failed to load DB", e);
            // On error, better to show nothing than to overwrite or crash
            setTasks([]); 
        } finally {
            console.log('initData finished, setting isLoading to false');
            setIsLoading(false);
        }
    };
    initData();
  }, []);

  // 2. Auto-Save on Change (Debounced)
  useEffect(() => {
    // Skip saving if we are still loading
    if (isLoading) return;

    const timer = setTimeout(() => {
        saveTasksToDB(tasks).catch(e => console.error("Auto-save failed", e));
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [tasks, isLoading]);

  // 3. Save on "Shutdown" / Visibility Change
  useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            // Force save immediately when user switches tabs or minimizes
            saveTasksToDB(tasks);
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tasks]);

  // UI Pref Persistence
  useEffect(() => {
    localStorage.setItem('lifeflow-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('lifeflow-show-archived', String(showArchived));
  }, [showArchived]);
  useEffect(() => {
    localStorage.setItem('lifeflow-board-sort', boardSort);
  }, [boardSort]);

  // -------------------------

  const handleAddTask = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (taskData.id) {
      setTasks(prev => prev.map(t => t.id === taskData.id ? { ...t, ...taskData } as Task : t));
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

  const updateTaskStatus = (taskId: string, newStatus: Status) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;

      if (task.status === Status.DONE && newStatus !== Status.DONE && task.recurrence !== Recurrence.NONE) {
        const baseDueISO = task.dueDate || new Date().toISOString();
        const expectedNextDue = calculateNextDueDate(baseDueISO, task.recurrence).toISOString();

        let removed = false;
        let pruned = prev.filter(t => {
          if (removed) return true;
          const isAutoNext = (
            t.id !== task.id &&
            t.status === Status.TODO &&
            t.recurrence === task.recurrence &&
            t.title === task.title &&
            t.description === task.description &&
            t.priority === task.priority &&
            (task.dueDate ? t.dueDate === expectedNextDue : true)
          );
          if (isAutoNext) {
            removed = true;
            return false;
          }
          return true;
        });

        if (!removed && !task.dueDate) {
          const candidates = prev.filter(t => (
            t.id !== task.id &&
            t.status === Status.TODO &&
            t.recurrence === task.recurrence &&
            t.title === task.title &&
            t.description === task.description &&
            t.priority === task.priority
          ));
          if (candidates.length > 0) {
            const toRemove = candidates.sort((a, b) => b.createdAt - a.createdAt)[0];
            pruned = prev.filter(t => t.id !== toRemove.id);
          }
        }

        return pruned.map(t => t.id === taskId ? ({ ...t, status: newStatus }) : t);
      }

      if (newStatus === Status.DONE && task.recurrence !== Recurrence.NONE && task.status !== Status.DONE) {
        const nextDueDate = calculateNextDueDate(task.dueDate || new Date().toISOString(), task.recurrence);
        const nextTask: Task = {
          ...task,
          id: crypto.randomUUID(),
          status: Status.TODO,
          dueDate: nextDueDate.toISOString(),
          createdAt: Date.now()
        };
        return [...prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t), nextTask];
      }

      return prev.map(t => t.id === taskId ? ({ ...t, status: newStatus }) : t);
    });
  };  const handleToggleDone = (taskId: string, onDate?: string) => {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const togglingToDone = task.status !== Status.DONE;

  // If toggling a specific recurring occurrence (from MonthView), materialize history and roll base forward
  if (onDate && togglingToDone && task.recurrence !== Recurrence.NONE) {
    const occurrenceISO = onDate;
    const nextDue = calculateNextDueDate(occurrenceISO, task.recurrence);

    setTasks(prev => {
      const base = prev.find(t => t.id === taskId);
      if (!base) return prev;

      const history: Task = {
        ...base,
        id: crypto.randomUUID(),
        status: Status.DONE,
        dueDate: occurrenceISO,
        createdAt: Date.now(),
      };

      const updatedBase: Task = {
        ...base,
        status: Status.TODO,
        dueDate: nextDue.toISOString(),
      };

      return prev.map(t => t.id === taskId ? updatedBase : t).concat(history);
    });
    return;
  }

  // Default toggle for non-recurring or no specific date provided
  const newStatus = task.status === Status.DONE ? Status.TODO : Status.DONE;
  updateTaskStatus(taskId, newStatus);
};

  const handleArchiveTask = (taskId: string) => {
    updateTaskStatus(taskId, Status.ARCHIVED);
  };

  // Triggers the confirmation modal
  const handleDeleteTask = (taskId: string) => {
    setDeleteConfirmation({ isOpen: true, taskId });
  };

  // Performs the actual deletion
  const confirmDelete = () => {
    if (deleteConfirmation.taskId) {
      setTasks(prev => prev.filter(t => t.id !== deleteConfirmation.taskId));
      // Close the delete confirmation
      setDeleteConfirmation({ isOpen: false, taskId: null });
      // Also close the edit modal if we deleted the task being edited
      if (editingTask?.id === deleteConfirmation.taskId) {
        setIsModalOpen(false);
      }
    }
  };

  // --- Manual Export/Import (Backup) ---

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
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // ---------------------------------

  const calculateNextDueDate = (currentDate: string, recurrence: Recurrence): Date => {
    const date = new Date(currentDate);
    switch (recurrence) {
      case Recurrence.DAILY: date.setDate(date.getDate() + 1); break;
      case Recurrence.WEEKLY: date.setDate(date.getDate() + 7); break;
      case Recurrence.MONTHLY: date.setMonth(date.getMonth() + 1); break;
      case Recurrence.QUARTERLY: date.setMonth(date.getMonth() + 3); break;
      case Recurrence.YEARLY: date.setFullYear(date.getFullYear() + 1); break;
    }
    return date;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const filteredTasks = tasks.filter(t => showArchived ? true : t.status !== Status.ARCHIVED);
    // Board quick filters: 'all' | 'overdue' | 'week' | 'nodue'
  const [boardFilter, setBoardFilter] = useState<'all' | 'overdue' | 'week' | 'nodue'>('all');

  // Board filter calculations (relative to current week)
  const today = new Date();
  today.setHours(0,0,0,0);
  const boardWeekStart = new Date(today);
  boardWeekStart.setDate(boardWeekStart.getDate() - boardWeekStart.getDay());
  boardWeekStart.setHours(0,0,0,0);
  const boardWeekEnd = new Date(boardWeekStart);
  boardWeekEnd.setDate(boardWeekEnd.getDate() + 6);
  boardWeekEnd.setHours(23,59,59,999);

  const isOpen = (t: Task) => t.status !== Status.DONE && t.status !== Status.ARCHIVED;

  const overdueTasks = filteredTasks.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today);
  const dueThisWeekTasks = filteredTasks.filter(t => {
    if (!t.dueDate || !isOpen(t)) return false;
    const d = new Date(t.dueDate);
    return d >= boardWeekStart && d <= boardWeekEnd;
  });
  const missingDueTasks = filteredTasks.filter(t => !t.dueDate && isOpen(t));

  const applyBoardFilter = (list: Task[]) => {
    switch (boardFilter) {
      case 'overdue':
        return list.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today);
      case 'week':
        return list.filter(t => {
          if (!t.dueDate || !isOpen(t)) return false;
          const d = new Date(t.dueDate);
          return d >= boardWeekStart && d <= boardWeekEnd;
        });
      case 'nodue':
        return list.filter(t => !t.dueDate && isOpen(t));
      default:
        return list;
    }
  };
  const priorityWeight = {
    [Priority.HIGH]: 3,
    [Priority.MEDIUM]: 2,
    [Priority.LOW]: 1
  };

    const sortTasks = (taskList: Task[]) => {
    return taskList.sort((a, b) => {
      if (boardSort === 'priority') {
        const priorityWeightLocal: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const pDiff = priorityWeightLocal[b.priority] - priorityWeightLocal[a.priority];
        if (pDiff !== 0) return pDiff;
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        if (aDue !== bDue) return aDue - bDue;
        return b.createdAt - a.createdAt;
      } else {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        if (aDue !== bDue) return aDue - bDue;
        const priorityWeightLocal: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const pDiff = priorityWeightLocal[b.priority] - priorityWeightLocal[a.priority];
        if (pDiff !== 0) return pDiff;
        return b.createdAt - a.createdAt;
      }
    });
  };

  // Loading Screen
  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
            <Loader2 size={40} className="animate-spin mb-4 text-blue-600" />
            <p className="text-sm font-medium">Loading your tasks...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-20 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none">TaskOrbit AI</h1>
              <p className="text-xs text-gray-500 mt-1">Personal Task Manager</p>
            </div>
          </div>
          
          {/* Mobile Archive Button shows here to save space */}
          <div className="flex gap-2 md:hidden">
             <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
                <Archive size={20} className={showArchived ? 'text-blue-600' : 'text-gray-500'} />
             </Button>
          </div>
        </div>

        {/* Center Section: View Switcher & Navigator */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto justify-center">
             <button 
               onClick={() => setViewMode('board')}
               className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'board' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
             >
               <Layout size={18} />
               <span className="inline">Board</span>
             </button>
             <button 
               onClick={() => setViewMode('week')}
               className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
             >
               <Grid size={18} />
               <span className="inline">Week</span>
             </button>
             <button 
               onClick={() => setViewMode('month')}
               className={`flex-1 sm:flex-none p-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
             >
               <Calendar size={18} />
               <span className="inline">Month</span>
             </button>
          </div>

          {viewMode !== 'board' && (
             <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-50 text-gray-700 rounded-l-lg border-r border-gray-100"><ChevronLeft size={18} /></button>
                <span className="px-4 text-sm font-semibold text-gray-800 min-w-[140px] text-center">
                  {viewMode === 'month' 
                    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  }
                </span>
                <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-50 text-gray-700 rounded-r-lg border-l border-gray-100"><ChevronRight size={18} /></button>
             </div>
          )}
        </div>
        
        {/* Right Section: Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {viewMode === 'board' && (
            
            <div className="hidden md:flex items-center gap-2 border-r border-gray-200 pr-4 mr-2">
                <span className="text-xs text-gray-500">Sort</span>
                <select
                  value={boardSort}
                  onChange={(e) => setBoardSort(e.target.value as 'priority' | 'dueDate')}
                  className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
                >
                  <option value="priority">Priority</option>
                  <option value="dueDate">Due Date</option>
                </select>
              </div>
          )}
          {/* Backup Controls */}
          <div className="hidden lg:flex items-center mr-2 border-r border-gray-200 pr-4 gap-2">
            <button 
                onClick={handleExportData} 
                className="text-gray-500 hover:text-blue-600 p-1.5 rounded hover:bg-gray-100 transition-colors"
                title="Backup Tasks"
            >
                <Download size={18} />
            </button>
            <button 
                onClick={handleImportClick} 
                className="text-gray-500 hover:text-blue-600 p-1.5 rounded hover:bg-gray-100 transition-colors"
                title="Restore Tasks"
            >
                <Upload size={18} />
            </button>
          </div>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setShowArchived(!showArchived)}
            className="hidden md:flex"
          >
            <Archive size={16} className="mr-2" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          <Button onClick={handleAddTask} className="w-full md:w-auto justify-center">
            <Plus size={18} className="mr-2" />
            Add Task
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-gray-50 p-4 md:p-6">
        {viewMode === 'board' && (
          <div className="h-full overflow-x-auto">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="text-sm text-gray-600 font-medium">Summary</span>
              <button
                type="button"
                onClick={() => setBoardFilter(f => f === 'overdue' ? 'all' : 'overdue')}
                className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${boardFilter === 'overdue' ? 'border-red-400 bg-red-100 text-red-800' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
              >
                Overdue: {overdueTasks.length}
              </button>
              <button
                type="button"
                onClick={() => setBoardFilter(f => f === 'week' ? 'all' : 'week')}
                className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${boardFilter === 'week' ? 'border-blue-400 bg-blue-100 text-blue-800' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
              >
                Due this week: {dueThisWeekTasks.length}
              </button>
              <button
                type="button"
                onClick={() => setBoardFilter(f => f === 'nodue' ? 'all' : 'nodue')}
                className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${boardFilter === 'nodue' ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                No due date: {missingDueTasks.length}
              </button>
            </div>
            <div className="h-full flex flex-col md:flex-row gap-6 min-w-[320px] md:min-w-0">
              <BoardColumn 
                status={Status.TODO} 
                tasks={sortTasks(applyBoardFilter(filteredTasks.filter(t => t.status === Status.TODO)))}
                onEditTask={handleEditTask}
                onMoveTask={handleMoveTask}
                onArchiveTask={handleArchiveTask}
                onDeleteTask={handleDeleteTask}
                onDropTask={handleDropTask}
              />
              <BoardColumn 
                status={Status.IN_PROGRESS} 
                tasks={sortTasks(applyBoardFilter(filteredTasks.filter(t => t.status === Status.IN_PROGRESS)))}
                onEditTask={handleEditTask}
                onMoveTask={handleMoveTask}
                onArchiveTask={handleArchiveTask}
                onDeleteTask={handleDeleteTask}
                onDropTask={handleDropTask}
              />
              <BoardColumn 
                status={Status.DONE} 
                tasks={sortTasks(applyBoardFilter(filteredTasks.filter(t => t.status === Status.DONE)))}
                onEditTask={handleEditTask}
                onMoveTask={handleMoveTask}
                onArchiveTask={handleArchiveTask}
                onDeleteTask={handleDeleteTask}
                onDropTask={handleDropTask}
              />
              
              {showArchived && (
                 <BoardColumn 
                    status={Status.ARCHIVED} 
                    tasks={sortTasks(applyBoardFilter(filteredTasks.filter(t => t.status === Status.ARCHIVED)))}
                    onEditTask={handleEditTask}
                    onMoveTask={handleMoveTask}
                    onArchiveTask={handleArchiveTask}
                    onDeleteTask={handleDeleteTask}
                    onDropTask={handleDropTask}
                  />
              )}
            </div>
          </div>
        )}

        {viewMode === 'month' && (
          <MonthView 
            currentDate={currentDate} 
            tasks={filteredTasks} 
            onEditTask={handleEditTask}
            onToggleDone={handleToggleDone}
          />
        )}

        {viewMode === 'week' && (
          <WeekView 
            currentDate={currentDate} 
            tasks={filteredTasks} 
            onEditTask={handleEditTask}
            onMoveTask={handleMoveTask}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </main>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onSaveMultiple={handleSaveMultipleTasks}
        onDelete={handleDeleteTask}
        task={editingTask}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Task?</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to permanently delete this task? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirmation({ isOpen: false, taskId: null })}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;