import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rounded',
  className,
  ...props
}) => {
  const variants = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-md',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'bg-[#222222] animate-pulse relative overflow-hidden',
          variants[variant],
          className
        )
      )}
      {...props}
    />
  );
};
