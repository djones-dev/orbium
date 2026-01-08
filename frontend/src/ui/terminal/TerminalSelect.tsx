import React from 'react';

interface TerminalSelectProps {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
}

export const TerminalSelect: React.FC<TerminalSelectProps> = ({
    label,
    value,
    options,
    onChange,
}) => {
    return (
        <div className="flex flex-col gap-1 py-1 font-mono text-xs text-[var(--color-text-primary)]">
            <div className="flex justify-between items-center opacity-80">
                <span>{label.toUpperCase()}</span>
            </div>

            <div className="flex gap-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`
              flex-1 py-1 px-1 border transition-colors text-[10px]
              ${value === option.value
                                ? 'bg-[var(--color-accent-primary)] text-black border-[var(--color-accent-primary)] font-bold'
                                : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent-secondary)] hover:text-[var(--color-text-primary)]'
                            }
            `}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
