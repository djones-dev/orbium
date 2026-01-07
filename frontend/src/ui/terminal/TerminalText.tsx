import React from 'react';

interface TerminalTextProps {
  children: React.ReactNode;
  dim?: boolean;
  className?: string;
}

/**
 * Terminal-style text component with optional dimming
 */
export const TerminalText: React.FC<TerminalTextProps> = ({
  children,
  dim = false,
  className = ''
}) => {
  return (
    <span className={`terminal-text ${dim ? 'dim' : ''} ${className}`}>
      {children}
    </span>
  );
};
