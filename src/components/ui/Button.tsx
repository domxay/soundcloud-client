import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-full transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    primary: 'bg-[#ff5500] hover:bg-[#ff6600] active:bg-[#e64d00] text-white shadow-sm',
    secondary:
      'bg-[#222222] hover:bg-[#2e2e2e] active:bg-[#333333] text-white border border-[#333333]',
    ghost: 'bg-transparent hover:bg-[#222222] text-[#cccccc] hover:text-white',
    danger: 'bg-[#ff3333] hover:bg-[#ff4d4d] text-white',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-2.5 gap-2.5',
  };

  return (
    <button
      className={twMerge(clsx(base, variants[variant], sizes[size], className))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
