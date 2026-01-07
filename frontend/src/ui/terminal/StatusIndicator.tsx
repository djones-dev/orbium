import React from 'react';

interface StatusIndicatorProps {
  label: string;
  active?: boolean;
  className?: string;
}

/**
 * Terminal-style status indicator with dynamic pulsing logic
 * "Neo Modern" Style: Uses Amber/Green glow for active state
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  label,
  active = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 font-mono text-[10px] tracking-wider ${className}`}>
      <span className={`relative flex h-2 w-2`}>
        {active && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-primary)] opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-[var(--color-accent-primary)]' : 'bg-gray-600'}`}></span>
      </span>
      <span className={`${active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'} font-bold`}>
        {label.toUpperCase()}
      </span>
    </div>
  );
};
