import React from 'react';
import { Status, Task } from '../types';
import { TaskCard } from './TaskCard';

interface BoardColumnProps {
  status: Status;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onMoveTask: (taskId: string, direction: 'prev' | 'next') => void;
  onArchiveTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDropTask: (taskId: string, newStatus: Status) => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({ 
  status, 
  tasks, 
  onEditTask, 
  onMoveTask,
  onArchiveTask,
  onDeleteTask,
  onDropTask 
}) => {
  const statusConfig = {
    [Status.TODO]: { label: 'To Do', color: 'bg-slate-100', borderColor: 'border-slate-200', textColor: 'text-slate-700' },
    [Status.IN_PROGRESS]: { label: 'In Progress', color: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700' },
    [Status.DONE]: { label: 'Done', color: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700' },
    [Status.ARCHIVED]: { label: 'Archived', color: 'bg-gray-100', borderColor: 'border-gray-200', textColor: 'text-gray-500' }
  };

  const config = statusConfig[status];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDropTask(taskId, status);
    }
  };

  return (
    <div 
      className={`flex flex-col h-full min-w-[300px] w-full md:w-1/3 rounded-xl border ${config.borderColor} ${config.color} transition-colors`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="p-4 flex items-center justify-between border-b border-black/5">
        <h3 className={`font-bold ${config.textColor} flex items-center gap-2`}>
          {config.label}
          <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs border border-black/5">
            {tasks.length}
          </span>
        </h3>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onEdit={onEditTask} 
            onMove={onMoveTask}
            onArchive={onArchiveTask}
            onDelete={onDeleteTask}
            showStrikethrough={false}
          />
        ))}
        {tasks.length === 0 && (
          <div className="h-32 border-2 border-dashed border-black/5 rounded-lg flex items-center justify-center text-gray-400 text-sm italic">
            Drop items here
          </div>
        )}
      </div>
    </div>
  );
};