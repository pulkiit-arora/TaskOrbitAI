import React, { useState, useRef, useEffect } from 'react';
import { TaskComment } from '../types';
import { MessageSquare, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface CommentPopoverProps {
  comments: TaskComment[];
  children: React.ReactNode;
}

export const CommentPopover: React.FC<CommentPopoverProps> = ({ comments, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = rect.left; // Align to left edge
      let y = rect.bottom + 8;
      
      // Prevent horizontal overflow
      if (x < 10) x = 10;
      if (x + 320 > viewportWidth - 10) x = viewportWidth - 330;
      
      // Prevent vertical overflow
      if (y + 300 > viewportHeight - 10) {
        y = rect.top - 308; // Show above
      }
      if (y < 10) y = 10;
      
      setPosition({ x, y });
    }
  }, [isVisible]);

  const popoverContent = (
    <div 
      className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] p-4"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800 text-sm">
            Comments ({comments.length})
          </h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b border-gray-100 pb-3 last:border-b-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {comment.text}
            </p>
          </div>
        ))}
      </div>
      
      {comments.length === 0 && (
        <div className="text-center py-4">
          <MessageSquare size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No comments yet</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-pointer"
      >
        {children}
      </div>
      
      {isVisible && typeof document !== 'undefined' && createPortal(
        popoverContent,
        document.body
      )}
    </div>
  );
};
