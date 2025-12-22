import React from 'react';
import { Button } from './Button';

type Step = {
  title: string;
  description: string;
  image?: string;
};

interface TourProps {
  isOpen: boolean;
  onClose: () => void;
  steps: Step[];
}

export const Tour: React.FC<TourProps> = ({ isOpen, onClose, steps }) => {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const step = steps[index] ?? steps[0];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const next = () => {
    if (isLast) onClose();
    else setIndex(i => Math.min(i + 1, steps.length - 1));
  };
  const prev = () => setIndex(i => Math.max(i - 1, 0));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close tour">✕</button>
        </div>
        {step.image && (
          <div className="w-full h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100">
             <img src={step.image} alt={step.title} className="max-h-full max-w-full object-contain" />
          </div>
        )}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
          <div className="mt-3 text-xs text-gray-400">Step {index + 1} of {steps.length}</div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="secondary" onClick={prev}>Back</Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Skip</Button>
            <Button onClick={next}>{isLast ? 'Finish' : 'Next'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
