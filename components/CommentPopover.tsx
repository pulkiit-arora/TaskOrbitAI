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
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | null>(null);
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

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const width = 320; // Estimated max width

      // X Calculation
      let left = rect.left;
      if (left + width > viewportWidth - 10) {
        left = Math.max(10, viewportWidth - width - 10);
      }
      if (left < 10) left = 10;

      // Y Calculation
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Prefer bottom placement, switch to top if tight below and more space above
      // Using 300 as threshold (max-height of 256px + padding/header)
      const placement = spaceBelow < 320 && spaceAbove > spaceBelow ? 'top' : 'bottom';

      if (placement === 'top') {
        setPopoverStyle({
          left,
          bottom: viewportHeight - rect.top + 8, // Anchor above trigger
          maxHeight: Math.min(300, spaceAbove - 20) // Constraint height
        });
      } else {
        setPopoverStyle({
          left,
          top: rect.bottom + 8, // Anchor below trigger
          maxHeight: Math.min(300, spaceBelow - 20) // Constraint height
        });
      }
    }
  };

  const closeTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setPopoverStyle(null);
    }, 300); // 300ms delay to allow moving to popover
  };

  // Close on scroll to prevent detached popover
  useEffect(() => {
    if (isVisible) {
      const handleScroll = () => setIsVisible(false);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  const popoverContent = popoverStyle && (
    <div
      className="fixed w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] p-4 animate-in fade-in zoom-in-95 duration-100 flex flex-col"
      style={popoverStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
            Comments ({comments.length})
          </h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b border-gray-100 pb-3 last:border-b-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
              {comment.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                if (part.match(/^https?:\/\/[^\s]+$/)) {
                  return (
                    <a
                      key={i}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {part}
                    </a>
                  );
                }
                return part;
              })}
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
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer inline-flex"
      >
        {children}
      </div>

      {isVisible && popoverStyle && typeof document !== 'undefined' && createPortal(
        popoverContent,
        document.body
      )}
    </div>
  );
};
