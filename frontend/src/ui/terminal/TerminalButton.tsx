import React from 'react';

interface TerminalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Terminal-style button with "Neo Modern" styling
 * Sharp corners, subtle borders, active state glow
 */
export const TerminalButton: React.FC<TerminalButtonProps> = ({
  children,
  onClick,
  active = false,
  disabled = false,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all duration-150 border
        ${disabled
          ? 'border-[var(--color-border)] text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-white/5 active:translate-y-[1px]'}
        ${active
          ? 'border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10'
          : 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]'}
        ${className}
      `}
    >
      {/* Active Indicator Line */}
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--color-accent-primary)]"></div>
      )}

      {children}
    </button>
  );
};
