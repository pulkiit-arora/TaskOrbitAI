import { useState, useEffect } from 'react';
import { Task, Status, Recurrence, Priority } from '../types';
import { loadTasksFromDB, saveTasksToDB } from '../services/storage';
import { calculateNextDueDate } from '../utils/taskUtils';
import { processTaskStatusChange } from '../utils/taskLogic';

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

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from DB on Mount
  useEffect(() => {
    const initData = async () => {
      console.log('initData starting...');
      setIsLoading(true);
      try {
        const loadedTasks = await loadTasksFromDB();
        console.log('loadedTasks:', loadedTasks);
        const hasInitialized = localStorage.getItem('lifeflow-initialized');

        if (hasInitialized) {
          setTasks(loadedTasks);
        } else {
          if (loadedTasks.length > 0) {
            setTasks(loadedTasks);
          } else {
            setTasks(INITIAL_TASKS);
            saveTasksToDB(INITIAL_TASKS);
          }
          localStorage.setItem('lifeflow-initialized', 'true');
        }
      } catch (e) {
        console.error("Failed to load DB", e);
        setTasks([]);
      } finally {
        console.log('initData finished, setting isLoading to false');
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  // Auto-Save on Change (Debounced)
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      saveTasksToDB(tasks).catch(e => console.error("Auto-save failed", e));
    }, 1000);

    return () => clearTimeout(timer);
  }, [tasks, isLoading]);

  // Save on Visibility Change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveTasksToDB(tasks);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tasks]);



  const updateTaskStatus = (taskId: string, newStatus: Status) => {
    setTasks(prev => processTaskStatusChange(prev, taskId, newStatus));
  };

  return {
    tasks,
    isLoading,
    setTasks,
    updateTaskStatus
  };
};

