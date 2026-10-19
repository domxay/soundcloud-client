import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className,
}) => {
  return (
    <div
      className={twMerge(
        'flex items-center gap-6 border-b border-[#282828] select-none',
        className
      )}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 outline-none',
              isActive
                ? 'text-white'
                : 'text-[#999999] hover:text-[#cccccc]'
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={clsx(
                  'text-xs px-1.5 py-0.2 rounded-full font-normal',
                  isActive
                    ? 'bg-[#ff5500]/20 text-[#ff5500]'
                    : 'bg-[#222222] text-[#888888]'
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff5500] rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
