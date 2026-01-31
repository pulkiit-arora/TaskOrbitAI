import React from 'react';
import { Button } from './Button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onConfirm: (scope?: 'single' | 'series') => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  isRecurring?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Delete Task?'
  , message = 'Are you sure you want to permanently delete this task? This action cannot be undone.'
  , isRecurring = false
}) => {
  const [deleteScope, setDeleteScope] = React.useState<'single' | 'series'>('single');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm transform transition-all scale-100">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>

        {isRecurring && (
          <div className="mb-6 space-y-2">
            <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="deleteScope"
                checked={deleteScope === 'single'}
                onChange={() => setDeleteScope('single')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="block font-medium">Delete this event</span>
                <span className="block text-xs text-gray-500">Remove only this occurrence</span>
              </span>
            </label>
            <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="deleteScope"
                checked={deleteScope === 'series'}
                onChange={() => setDeleteScope('series')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="block font-medium">Delete all events</span>
                <span className="block text-xs text-gray-500">Remove the entire series</span>
              </span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={() => onConfirm(isRecurring ? deleteScope : undefined)}>Delete</Button>
        </div>
      </div>
    </div>
  );
};

