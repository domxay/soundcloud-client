import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong while loading this content.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-full bg-[#ff3333]/10 border border-[#ff3333]/20 flex items-center justify-center text-[#ff4d4d] mb-3">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-base font-bold text-white mb-1">Unable to load</h3>
      <p className="text-xs text-[#999999] mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw size={14} />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
