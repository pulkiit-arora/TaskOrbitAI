import React, { useState } from 'react';
import { BoardColumn } from './BoardColumn';
import { Task, Status, Priority, Tag } from '../types';
import { Filter, Tag as TagIcon } from 'lucide-react';
import { sortTasks, isOpen } from '../utils/taskUtils';
import { StatusFilter } from './StatusFilter';

interface BoardViewProps {
  tasks: Task[];
  boardFilter: 'all' | 'overdue' | 'week' | 'nodue';
  setBoardFilter: (filter: 'all' | 'overdue' | 'week' | 'nodue') => void;
  boardSort: 'priority' | 'dueDate';
  setBoardSort: (sort: 'priority' | 'dueDate') => void;
  showArchived: boolean;
  onEditTask: (task: Task) => void;
  onMoveTask: (taskId: string, direction: 'prev' | 'next') => void;
  onArchiveTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDropTask: (taskId: string, newStatus: Status) => void;
  priorityFilter?: Priority[];
  setPriorityFilter?: (priorities: Priority[]) => void;
  statusFilter?: Status[];
  setStatusFilter?: (statuses: Status[]) => void;
  tags?: Tag[];
  tagFilter?: string[];
  setTagFilter?: (tags: string[]) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  tasks,
  boardFilter,
  setBoardFilter,
  boardSort,
  setBoardSort,
  showArchived,
  onEditTask,
  onMoveTask,
  onArchiveTask,
  onDeleteTask,
  onDropTask,
  onDeleteAll,
  priorityFilter,
  setPriorityFilter,
  statusFilter,
  setStatusFilter,
  tags = [],
  tagFilter = [],
  setTagFilter
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const boardWeekStart = new Date(today);
  boardWeekStart.setDate(boardWeekStart.getDate() - boardWeekStart.getDay());
  boardWeekStart.setHours(0, 0, 0, 0);
  const boardWeekEnd = new Date(boardWeekStart);
  boardWeekEnd.setDate(boardWeekEnd.getDate() + 6);
  boardWeekEnd.setHours(23, 59, 59, 999);

  const overdueTasks = tasks.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today && t.status !== Status.EXPIRED);
  const dueThisWeekTasks = tasks.filter(t => {
    if (!t.dueDate || !isOpen(t)) return false;
    const d = new Date(t.dueDate);
    return d >= boardWeekStart && d <= boardWeekEnd;
  });
  const missingDueTasks = tasks.filter(t => !t.dueDate && isOpen(t));

  const applyBoardFilter = (list: Task[]) => {
    switch (boardFilter) {
      case 'overdue':
        return list.filter(t => t.dueDate && isOpen(t) && new Date(t.dueDate) < today && t.status !== Status.EXPIRED);
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

  return (
    <div className="h-full overflow-x-auto">
      <div className="mb-3 flex items-center gap-2 flex-wrap px-1">
        <span className="text-sm text-gray-600 font-medium">Summary</span>
        <button
          type="button"
          onClick={() => setBoardFilter(boardFilter === 'overdue' ? 'all' : 'overdue')}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${boardFilter === 'overdue' ? 'border-red-400 bg-red-100 text-red-800' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
        >
          Overdue: {overdueTasks.length}
        </button>
        <button
          type="button"
          onClick={() => setBoardFilter(boardFilter === 'week' ? 'all' : 'week')}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${boardFilter === 'week' ? 'border-blue-400 bg-blue-100 text-blue-800' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
        >
          Due this week: {dueThisWeekTasks.length}
        </button>
        <button
          type="button"
          onClick={() => setBoardFilter(boardFilter === 'nodue' ? 'all' : 'nodue')}
          className={`inline-flex items-center rounded-full border text-xs px-2 py-1 transition-colors ${boardFilter === 'nodue' ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          No due date: {missingDueTasks.length}
        </button>

        {setStatusFilter && statusFilter && (
          <>
            <div className="h-5 w-px bg-gray-300 mx-1"></div>
            <StatusFilter
              selectedStatuses={statusFilter}
              onChange={setStatusFilter}
            />
          </>
        )}

        {setPriorityFilter && priorityFilter && (
          <>
            <div className="h-5 w-px bg-gray-300 mx-1"></div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Priority:</span>
              <button
                onClick={() => {
                  const newFilter = priorityFilter.includes(Priority.HIGH)
                    ? priorityFilter.filter(p => p !== Priority.HIGH)
                    : [...priorityFilter, Priority.HIGH];
                  setPriorityFilter(newFilter);
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${priorityFilter.includes(Priority.HIGH)
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-700'
                  }`}
              >
                High
              </button>
              <button
                onClick={() => {
                  const newFilter = priorityFilter.includes(Priority.MEDIUM)
                    ? priorityFilter.filter(p => p !== Priority.MEDIUM)
                    : [...priorityFilter, Priority.MEDIUM];
                  setPriorityFilter(newFilter);
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${priorityFilter.includes(Priority.MEDIUM)
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-200 hover:text-yellow-700'
                  }`}
              >
                Med
              </button>
              <button
                onClick={() => {
                  const newFilter = priorityFilter.includes(Priority.LOW)
                    ? priorityFilter.filter(p => p !== Priority.LOW)
                    : [...priorityFilter, Priority.LOW];
                  setPriorityFilter(newFilter);
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${priorityFilter.includes(Priority.LOW)
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200 hover:text-blue-700'
                  }`}
              >
                Low
              </button>
            </div>
          </>
        )}
        {setTagFilter && tags && tags.length > 0 && (
          <>
            <div className="h-5 w-px bg-gray-300 mx-1"></div>
            <div className="flex items-center gap-1">
              <TagIcon size={12} className="text-gray-500" />
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => {
                    const newFilter = tagFilter.includes(tag.id)
                      ? tagFilter.filter(t => t !== tag.id)
                      : [...tagFilter, tag.id];
                    setTagFilter && setTagFilter(newFilter);
                  }}
                  className={`w-3 h-3 rounded-full border transition-all ${tagFilter.includes(tag.id) ? `ring-2 ring-offset-1 ring-blue-500 ${tag.color.split(' ')[0]}` : tag.color.split(' ')[0]} ${tag.color.split(' ')[2]}`}
                  title={tag.label}
                />
              ))}
              {tagFilter.length > 0 && (
                <button onClick={() => setTagFilter && setTagFilter([])} className="text-[10px] text-gray-400 hover:text-gray-600 ml-1">Clear</button>
              )}
            </div>
          </>
        )}

        <div className="h-5 w-px bg-gray-300 mx-1"></div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort</span>
          <select
            value={boardSort}
            onChange={(e) => setBoardSort(e.target.value as 'priority' | 'dueDate')}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
          >
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
          </select>
          <div className="h-5 w-px bg-gray-300 mx-1"></div>
        </div>
      </div>
      <div className="h-full flex flex-col md:flex-row gap-6 min-w-[320px] md:min-w-0">
        <BoardColumn
          status={Status.TODO}
          tasks={sortTasks(applyBoardFilter(tasks.filter(t => t.status === Status.TODO)), boardSort)}
          onEditTask={onEditTask}
          onMoveTask={onMoveTask}
          onArchiveTask={onArchiveTask}
          onDeleteTask={onDeleteTask}
          onDropTask={onDropTask}
        />
        <BoardColumn
          status={Status.IN_PROGRESS}
          tasks={sortTasks(applyBoardFilter(tasks.filter(t => t.status === Status.IN_PROGRESS)), boardSort)}
          onEditTask={onEditTask}
          onMoveTask={onMoveTask}
          onArchiveTask={onArchiveTask}
          onDeleteTask={onDeleteTask}
          onDropTask={onDropTask}
        />
        <BoardColumn
          status={Status.DONE}
          tasks={sortTasks(applyBoardFilter(tasks.filter(t => t.status === Status.DONE)), boardSort)}
          onEditTask={onEditTask}
          onMoveTask={onMoveTask}
          onArchiveTask={onArchiveTask}
          onDeleteTask={onDeleteTask}
          onDropTask={onDropTask}
        />

        {showArchived && (
          <BoardColumn
            status={Status.ARCHIVED}
            tasks={sortTasks(applyBoardFilter(tasks.filter(t => t.status === Status.ARCHIVED)), boardSort)}
            onEditTask={onEditTask}
            onMoveTask={onMoveTask}
            onArchiveTask={onArchiveTask}
            onDeleteTask={onDeleteTask}
            onDropTask={onDropTask}
          />
        )}
      </div>
    </div>
  );
};

