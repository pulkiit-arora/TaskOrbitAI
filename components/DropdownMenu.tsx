import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownMenuProps {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  triggerClassName?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  label, 
  icon, 
  children, 
  align = 'right',
  className = '',
  triggerClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors ${triggerClassName}`}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {label && <span className="text-sm">{label}</span>}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] py-1 animate-in fade-in zoom-in-95 duration-100`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ 
  onClick, 
  icon, 
  children, 
  className = '',
  danger = false
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
        ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}
        ${className}`}
    >
      {icon && <span className="flex-shrink-0 opacity-70">{icon}</span>}
      {children}
    </button>
  );
};

export const DropdownDivider: React.FC = () => (
  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
);

export const DropdownHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-4 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
    {children}
  </div>
);
