import { useState } from 'react';
import { Task } from '../types';

export const useTaskModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(undefined);

  const openModal = (task?: Partial<Task>) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(undefined);
  };

  const openModalWithDate = (date: Date) => {
    // Ensure we capture the specific Year-Month-Day selected by the user
    // The passed 'date' is constructed in MonthView as new Date(year, month, day)
    // which defaults to local time 00:00:00.
    // We want to set the Due Date to NOON on that specific day to avoid timezone shifts.
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const targetDate = new Date(year, month, day, 12, 0, 0, 0); // Noon local

    const taskWithDate: Partial<Task> = {
      dueDate: targetDate.toISOString(),
    };
    openModal(taskWithDate);
  };

  return {
    isModalOpen,
    editingTask,
    openModal,
    closeModal,
    openModalWithDate
  };
};

