import { useState, useEffect } from 'react';
import { Task, Status, Recurrence, Priority } from '../types';
import { loadTasksFromDB, saveTasksToDB, pullTasksFromCloud } from '../services/storage';
import { supabase } from '../lib/supabaseClient';
import { calculateNextDueDate } from '../utils/taskUtils';
import { processTaskStatusChange } from '../utils/taskLogic';

const INITIAL_TASKS: Task[] = [
  // ── Daily Recurring ──────────────────────────────────────────────
  {
    id: '1',
    title: 'Daily Stand-up Meeting',
    description: 'Share progress updates, blockers, and priorities with the team.',
    status: Status.NEXT_ACTION,
    priority: Priority.HIGH,
    recurrence: Recurrence.DAILY,
    recurrenceInterval: 1,
    recurrenceStart: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    createdAt: Date.now(),
    estimatedMinutes: 15
  },
  {
    id: '2',
    title: 'Review & Respond to Emails',
    description: 'Triage inbox, respond to priority messages, and archive non-essential items.',
    status: Status.NEXT_ACTION,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.DAILY,
    recurrenceInterval: 1,
    recurrenceStart: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    createdAt: Date.now(),
    estimatedMinutes: 20
  },
  // ── Weekly Recurring ─────────────────────────────────────────────
  {
    id: '3',
    title: 'Sprint Planning & Backlog Grooming',
    description: 'Review upcoming sprint items, estimate story points, and prioritize the backlog.',
    status: Status.NEXT_ACTION,
    priority: Priority.HIGH,
    recurrence: Recurrence.WEEKLY,
    recurrenceInterval: 1,
    recurrenceWeekdays: [1], // Monday
    recurrenceStart: new Date().toISOString(),
    dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7 || 7)); return d.toISOString(); })(),
    createdAt: Date.now(),
    estimatedMinutes: 60
  },
  {
    id: '4',
    title: 'Weekly Progress Report',
    description: 'Compile key metrics, completed deliverables, and upcoming milestones for stakeholders.',
    status: Status.NEXT_ACTION,
    priority: Priority.HIGH,
    recurrence: Recurrence.WEEKLY,
    recurrenceInterval: 1,
    recurrenceWeekdays: [5], // Friday
    recurrenceStart: new Date().toISOString(),
    dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); return d.toISOString(); })(),
    createdAt: Date.now(),
    estimatedMinutes: 30
  },
  {
    id: '5',
    title: '1-on-1 with Manager',
    description: 'Discuss career growth, current projects, and any blockers or feedback.',
    status: Status.NEXT_ACTION,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.WEEKLY,
    recurrenceInterval: 1,
    recurrenceWeekdays: [3], // Wednesday
    recurrenceStart: new Date().toISOString(),
    dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7)); return d.toISOString(); })(),
    createdAt: Date.now(),
    estimatedMinutes: 30
  },
  // ── Monthly Recurring ────────────────────────────────────────────
  {
    id: '6',
    title: 'Monthly Budget Review',
    description: 'Review expenses, reconcile accounts, and adjust budget allocations for the next month.',
    status: Status.NEXT_ACTION,
    priority: Priority.HIGH,
    recurrence: Recurrence.MONTHLY,
    recurrenceInterval: 1,
    recurrenceMonthDay: 1,
    recurrenceStart: new Date().toISOString(),
    dueDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return d.toISOString(); })(),
    createdAt: Date.now(),
    estimatedMinutes: 45
  },
  {
    id: '7',
    title: 'Team Retrospective',
    description: 'Reflect on what went well, identify areas for improvement, and define action items.',
    status: Status.NEXT_ACTION,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.MONTHLY,
    recurrenceInterval: 1,
    recurrenceMonthNth: -1,  // Last
    recurrenceMonthWeekday: 5, // Friday
    recurrenceStart: new Date().toISOString(),
    createdAt: Date.now(),
    estimatedMinutes: 60
  },
  // ── Quarterly Recurring ──────────────────────────────────────────
  {
    id: '8',
    title: 'Quarterly OKR Review',
    description: 'Evaluate progress on Objectives & Key Results, recalibrate targets, and set new quarterly goals.',
    status: Status.NEXT_ACTION,
    priority: Priority.HIGH,
    recurrence: Recurrence.QUARTERLY,
    recurrenceInterval: 1,
    recurrenceStart: new Date().toISOString(),
    dueDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString(); })(),
    createdAt: Date.now(),
    estimatedMinutes: 90
  },
  // ── One-Time Tasks ───────────────────────────────────────────────
  {
    id: '9',
    title: 'Prepare Q2 Client Presentation',
    description: 'Create slide deck covering project milestones, deliverables, and roadmap for the next quarter.',
    status: Status.NEXT_ACTION,
    priority: Priority.HIGH,
    recurrence: Recurrence.NONE,
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    createdAt: Date.now(),
    estimatedMinutes: 120,
    subtasks: [
      { id: 's1', title: 'Gather performance metrics', completed: true, order: 0 },
      { id: 's2', title: 'Draft executive summary', completed: false, order: 1 },
      { id: 's3', title: 'Design presentation slides', completed: false, order: 2 },
      { id: 's4', title: 'Review with team lead', completed: false, order: 3 }
    ]
  },
  {
    id: '10',
    title: 'Onboard New Team Member',
    description: 'Set up access credentials, schedule intro meetings, and share documentation & onboarding checklist.',
    status: Status.NEXT_ACTION,
    priority: Priority.MEDIUM,
    recurrence: Recurrence.NONE,
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    createdAt: Date.now(),
    estimatedMinutes: 60
  },
  {
    id: '11',
    title: 'Update Project Documentation',
    description: 'Review and update API docs, architecture diagrams, and deployment runbooks for accuracy.',
    status: Status.NEXT_ACTION,
    priority: Priority.LOW,
    recurrence: Recurrence.NONE,
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    createdAt: Date.now(),
    estimatedMinutes: 45
  },
  {
    id: '12',
    title: 'Schedule Annual Health Checkup',
    description: 'Book appointment with primary care physician for annual physical examination.',
    status: Status.NEXT_ACTION,
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
      setIsLoading(true);
      try {
        let loadedTasks = await loadTasksFromDB();
        
        // Patch stranded strings from earlier aggressive migration step
        let needsRestorePatch = false;
        loadedTasks = loadedTasks.map(t => {
          // If the DB has literally "NEXT_ACTION" due to our earlier rewrite, revert them to 'TODO' (Inbox) so they reappear.
          if ((t.status as any) === 'NEXT_ACTION') {
            needsRestorePatch = true;
            return { ...t, status: Status.INBOX }; 
          }
          return t;
        });
        if (needsRestorePatch) {
          saveTasksToDB(loadedTasks);
        }
        
        // Cloud Sync hook
        const isSyncEnabled = localStorage.getItem('lifeflow-sync-enabled') === 'true';
        if (isSyncEnabled) {
          const cloudRes = await pullTasksFromCloud();
          if (cloudRes) {
            let shouldSyncPrefs = false;
            if (cloudRes.preferences) {
                if (cloudRes.preferences.tags) {
                    localStorage.setItem('lifeflow-tags', cloudRes.preferences.tags);
                    shouldSyncPrefs = true;
                }
                if (cloudRes.preferences.statuses) {
                    localStorage.setItem('lifeflow-status-filters', cloudRes.preferences.statuses);
                    shouldSyncPrefs = true;
                }
                if (shouldSyncPrefs) {
                    window.dispatchEvent(new Event('preferences-sync'));
                }
            }
            if (cloudRes.tasks && cloudRes.tasks.length > 0) {
              let patchedCloud = cloudRes.tasks.map(t => {
                if ((t.status as any) === 'NEXT_ACTION') return { ...t, status: Status.INBOX };
                return t;
              });
              loadedTasks = patchedCloud;
              saveTasksToDB(patchedCloud); // Persist down to local DB
            }
          }
        }

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
        setIsLoading(false);
      }
    };
    initData();

    // Listen for Auth events to trigger a re-sync if the user just logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
       if (event === 'SIGNED_IN') {
         // Pull data immediately
         pullTasksFromCloud().then(cloudRes => {
           if (cloudRes) {
             let shouldSyncPrefs = false;
             if (cloudRes.preferences) {
                 if (cloudRes.preferences.tags) {
                     localStorage.setItem('lifeflow-tags', cloudRes.preferences.tags);
                     shouldSyncPrefs = true;
                 }
                 if (cloudRes.preferences.statuses) {
                     localStorage.setItem('lifeflow-status-filters', cloudRes.preferences.statuses);
                     shouldSyncPrefs = true;
                 }
                 if (shouldSyncPrefs) {
                     window.dispatchEvent(new Event('preferences-sync'));
                 }
             }
             if (cloudRes.tasks && cloudRes.tasks.length > 0) {
               setTasks(cloudRes.tasks);
               saveTasksToDB(cloudRes.tasks);
             }
           }
         });
       }
    });

    return () => subscription.unsubscribe();
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

