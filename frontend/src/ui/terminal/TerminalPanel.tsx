import React, { useState } from 'react';

interface TerminalPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Terminal-style panel with "Neo Modern" styling
 * Sharp borders, muted backgrounds, high contrast headers
 */
export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  title,
  children,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`border border-[var(--color-border)] bg-[var(--color-panel-bg)] ${className}`}>
      {/* Header / Title Bar */}
      {title && (
        <div
          className="flex items-center px-3 py-2 border-b border-[var(--color-border)] cursor-pointer select-none hover:bg-white/5 transition-colors group"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {/* Blinking indicator on hover */}
          <div className={`w-1.5 h-1.5 mr-3 rounded-full ${isCollapsed ? 'bg-[var(--color-text-secondary)]' : 'bg-[var(--color-accent-primary)]'} group-hover:animate-pulse`}></div>

          <span className="font-mono text-xs font-bold tracking-wider text-[var(--color-text-primary)]">
            {title.toUpperCase()}
          </span>

          <span className="flex-1"></span>

          <span className="text-[var(--color-text-secondary)] text-[10px]">
            {isCollapsed ? '+' : '-'}
          </span>
        </div>
      )}

      {/* Content Area - Collapsible */}
      {!isCollapsed && (
        <div className="p-3">
          {children}
        </div>
      )}
    </div>
  );
};
