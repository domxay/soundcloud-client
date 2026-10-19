import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] flex items-center justify-center text-[#ff5500] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#999999] leading-relaxed mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
