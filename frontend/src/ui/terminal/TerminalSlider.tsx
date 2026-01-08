import React, { useState, useRef, useEffect } from 'react';
import { toLogScale, fromLogScale } from '../../audio/audioUtils';

interface TerminalSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  precision?: number;
  unit?: string;
  logarithmic?: boolean;
  onChange: (value: number) => void;
  barLength?: number; // kept for compatibility
  formatValue?: (val: number) => string; // Custom formatter function
}

/**
 * Terminal-style slider with CSS-based bar
 * "Neo Modern" Style: Sleek, responsive, support for log scales
 * Supports Double-Click to Edit
 */
export const TerminalSlider: React.FC<TerminalSliderProps> = ({
  label,
  value,
  min,
  max,
  precision = 0,
  unit = '',
  logarithmic = false,
  onChange,
  formatValue
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Calculate percentage based on Scale Type
  let percentage = 0;
  if (logarithmic) {
    if (value <= 0) percentage = 0;
    else {
      percentage = fromLogScale(value, min, max) * 100;
    }
  } else {
    const normalizedValue = Math.min(Math.max((value - min) / (max - min), 0), 1);
    percentage = normalizedValue * 100;
  }

  // Safe clamp
  percentage = Math.max(0, Math.min(100, percentage));

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValue(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateValue = (e: MouseEvent | React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const p = Math.max(0, Math.min(1, x / rect.width));

    let newValue: number;
    if (logarithmic) {
      newValue = toLogScale(p, min, max);
    } else {
      newValue = min + p * (max - min);
    }

    onChange(newValue);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging]);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(value.toString());
    // Focus timeout to ensure input is rendered
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleInputBlur = () => {
    commitEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const commitEdit = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num)) {
      // Clamp
      const clamped = Math.max(min, Math.min(max, num));
      onChange(clamped);
    }
    setIsEditing(false);
  };

  // Display Value Logic
  let displayString = '';
  if (formatValue) {
    displayString = formatValue(value);
  } else {
    const valDisplay = precision === 0 ? Math.round(value) : value.toFixed(precision);
    displayString = `${valDisplay}${unit}`;
  }

  return (
    <div className="flex flex-col gap-1 py-1 font-mono text-xs text-[var(--color-text-primary)]">
      <div className="flex justify-between items-center opacity-80">
        <span>{label.toUpperCase()}</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-20 bg-[var(--color-bg)] border border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] text-right px-1 outline-none font-mono text-xs"
          />
        ) : (
          <span
            className="text-[var(--color-accent-primary)] hover:text-white cursor-text transition-colors"
            onDoubleClick={handleDoubleClick}
            title="Double-click to type value"
          >
            {displayString}
          </span>
        )}
      </div>

      <div
        ref={barRef}
        className="relative h-4 w-full bg-[var(--color-panel-bg)] border border-[var(--color-border)] cursor-col-resize group hover:border-[var(--color-accent-secondary)] transition-colors"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute top-0 left-0 h-full bg-[var(--color-text-secondary)] opacity-10 pointer-events-none"
          style={{ width: '100%' }}
        >
          {/* Optional grid lines could go here */}
        </div>

        {/* Filled Bar */}
        <div
          className={`absolute top-0 left-0 h-full bg-[var(--color-accent-primary)] transition-all duration-75 ease-out ${isDragging ? 'opacity-100' : 'opacity-80'}`}
          style={{ width: `${percentage}%` }}
        ></div>

        {/* Drag Handle (Visual only) */}
        <div
          className="absolute top-0 w-0.5 h-full bg-white opacity-0 group-hover:opacity-50"
          style={{ left: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
