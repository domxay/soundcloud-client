import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary' | 'accent';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  size = 'md',
  variant = 'ghost',
  active = false,
  className,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center rounded-full transition-colors focus:outline-none select-none disabled:opacity-40 disabled:pointer-events-none';

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const variants = {
    ghost: active
      ? 'text-[#ff5500] bg-[#ff5500]/10 hover:bg-[#ff5500]/20'
      : 'text-[#999999] hover:text-white hover:bg-[#222222]',
    secondary: 'bg-[#222222] hover:bg-[#2e2e2e] text-[#cccccc] hover:text-white border border-[#333333]',
    accent: 'bg-[#ff5500] hover:bg-[#ff6600] text-white shadow-sm',
  };

  return (
    <button
      className={twMerge(clsx(base, sizes[size], variants[variant], className))}
      {...props}
    >
      {children}
    </button>
  );
};
