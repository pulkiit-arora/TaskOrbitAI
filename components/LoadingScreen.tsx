import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
      <Loader2 size={40} className="animate-spin mb-4 text-blue-600" />
      <p className="text-sm font-medium">Loading your tasks...</p>
    </div>
  );
};

