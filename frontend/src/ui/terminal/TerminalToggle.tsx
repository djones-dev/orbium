import React from 'react';

interface TerminalToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

/**
 * Terminal-style toggle/checkbox
 * Example: [■] ENABLED or [□] DISABLED
 */
export const TerminalToggle: React.FC<TerminalToggleProps> = ({
  label,
  checked,
  onChange,
  className = ''
}) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`terminal-toggle ${checked ? 'checked' : ''} ${className}`}
    >
      <span className="bracket">[</span>
      <span className="checkbox">{checked ? '■' : '□'}</span>
      <span className="bracket">]</span>
      <span className="label">{label.toUpperCase()}</span>
    </button>
  );
};
