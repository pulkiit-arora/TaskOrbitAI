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
    const dateStr = date.toISOString().split('T')[0];
    const taskWithDate: Partial<Task> = {
      dueDate: new Date(`${dateStr}T12:00:00`).toISOString(),
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

