import React, { useState, useEffect, useRef } from 'react';
import { TaskModal } from './components/TaskModal';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { AppHeader } from './components/AppHeader';
import { BoardView } from './components/BoardView';
import { LoadingScreen } from './components/LoadingScreen';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { Tour } from './components/Tour';
import { Task, Status, Recurrence } from './types';
import { useTasks } from './hooks/useTasks';
import { useTaskModal } from './hooks/useTaskModal';
import { useLocalStorageString } from './hooks/useLocalStorage';
import { calculateNextDueDate } from './utils/taskUtils';

type ViewMode = 'board' | 'week' | 'month';

const App: React.FC = () => {
  const { tasks, isLoading, setTasks, updateTaskStatus } = useTasks();
  const { isModalOpen, editingTask, openModal, closeModal, openModalWithDate } = useTaskModal();
  
  const [viewMode, setViewModeState] = useLocalStorageString('lifeflow-view-mode', 'board');
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
  const [boardFilter, setBoardFilter] = useState<'all' | 'overdue' | 'week' | 'nodue'>('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, taskId: string | null}>({
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
    } catch {}
  }, []);

  // Task handlers
  const handleSaveTask = (taskData: Partial<Task>) => {
    if (taskData.id) {
      // Check if this is a virtual task (editing an occurrence)
      if (typeof taskData.id === 'string' && taskData.id.includes('-virtual-')) {
        // Extract the base task ID from virtual ID (format: {baseTaskId}-virtual-{timestamp})
        const baseTaskId = taskData.id.split('-virtual-')[0];
        const baseTask = tasks.find(t => t.id === baseTaskId);
        
        // If editing a recurring task's occurrence, update the base task's comments
        // but create a one-off task for other changes (status, description, etc.)
        if (baseTask && baseTask.recurrence !== Recurrence.NONE) {
          // For recurring tasks, update the base task with new comments
          if (taskData.comments) {
            setTasks(prev => prev.map(t => 
              t.id === baseTaskId ? { ...t, comments: taskData.comments } : t
            ));
          }
          // Also create a one-off task if other fields (besides comments) were changed
          const otherFieldsChanged = Object.keys(taskData).some(
            key => key !== 'comments' && key !== 'id' && taskData[key as keyof Task] !== baseTask[key as keyof Task]
          );
          if (otherFieldsChanged) {
            const newTask: Task = {
              ...taskData,
              id: crypto.randomUUID(),
              recurrence: Recurrence.NONE,
              createdAt: Date.now(),
            } as Task;
            setTasks(prev => [...prev, newTask]);
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
        // For real tasks, just update normally
        setTasks(prev => prev.map(t => t.id === taskData.id ? { ...t, ...taskData } as Task : t));
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

    // If toggling a recurring task to DONE without a specific date (e.g., from Board),
    // materialize a DONE history for the current occurrence and roll the base forward.
    if (!onDate && togglingToDone && task.recurrence !== Recurrence.NONE) {
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

    const newStatus = task.status === Status.DONE ? Status.TODO : Status.DONE;
    // If toggling to DONE and task has no dueDate, anchor it to today so Week/Month can display it
    if (newStatus === Status.DONE && !task.dueDate) {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const iso = today.toISOString();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueDate: iso } : t));
    }
    updateTaskStatus(taskId, newStatus);
  };

  const handleArchiveTask = (taskId: string) => {
    updateTaskStatus(taskId, Status.ARCHIVED);
  };

  const handleDeleteTask = (taskId: string) => {
    setDeleteConfirmation({ isOpen: true, taskId });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.taskId) {
      setTasks(prev => prev.filter(t => t.id !== deleteConfirmation.taskId));
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
    try { localStorage.setItem('lifeflow-tour-seen', 'true'); } catch {}
    setIsTourOpen(false);
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden" 
      />

      <AppHeader
        viewMode={viewMode as ViewMode}
        setViewMode={setViewMode}
        currentDate={currentDate}
        navigateDate={navigateDate}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        onAddTask={() => openModal()}
        onExportData={handleExportData}
        onImportClick={handleImportClick}
        onTourClick={() => setIsTourOpen(true)}
      />

      <main className="flex-1 overflow-hidden bg-gray-50 p-4 md:p-6">
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
            onDeleteAll={() => setTasks([])}
          />
        )}

        {viewMode === 'month' && (
          <MonthView 
            currentDate={currentDate} 
            tasks={filteredTasks} 
            onEditTask={(task) => openModal(task)}
            onToggleDone={handleToggleDone}
            onAddTask={openModalWithDate}
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
            onAddTask={openModalWithDate}
          />
        )}
      </main>
      
      <Tour 
        isOpen={isTourOpen}
        onClose={handleCloseTour}
        steps={[
          { title: 'Welcome to TaskOrbit AI', description: 'Capture tasks, prioritize, and track across Board, Week, and Month views.' },
          { title: 'Switch Views', description: 'Use the buttons at the top to switch between Board, Week, and Month.' },
          { title: 'Quick Filters', description: 'Use Summary filters to focus on Overdue, Due this week, or No due date.' },
          { title: 'Manage Tasks', description: 'Click Add Task to create. Drag between columns or use arrows to change status.' },
          { title: 'Recurring Tasks', description: 'Mark a recurring task Done to auto-schedule the next occurrence.' },
        ]}
      />

      <TaskModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveTask}
        onSaveMultiple={handleSaveMultipleTasks}
        onDelete={handleDeleteTask}
        task={editingTask}
      />

      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, taskId: null })}
      />
    </div>
  );
};

export default App;
