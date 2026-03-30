import React, { useState, useRef, useCallback, useEffect } from 'react';

interface TerminalKnobProps {
    label: string;
    value: number;
    min: number;
    max: number;
    size?: number;
    onChange: (value: number) => void;
    onCommit?: (value: number) => void;
    formatValue?: (value: number) => string;
    logarithmic?: boolean;
}

export const TerminalKnob: React.FC<TerminalKnobProps> = ({
    label,
    value,
    min,
    max,
    size = 48,
    onChange,
    onCommit,
    formatValue,
    logarithmic = false
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragValue, setDragValue] = useState<number | null>(null);

    // Refs for drag calculations
    const startYRef = useRef<number>(0);
    const startValueRef = useRef<number>(0);
    const dragValueRef = useRef<number | null>(null);

    // Refs for callback stability
    const onChangeRef = useRef(onChange);
    const onCommitRef = useRef(onCommit);

    // Update callback refs on render
    useEffect(() => {
        onChangeRef.current = onChange;
        onCommitRef.current = onCommit;
    }, [onChange, onCommit]);

    // Constants
    const MIN_ANGLE = 135;
    const MAX_ANGLE = 405;

    // Helper: Normalize value 0-1
    const getNormalizedValue = useCallback((val: number) => {
        // Safety check for non-finite values
        if (!Number.isFinite(val)) return 0;

        if (logarithmic) {
            const safeMin = min === 0 ? 0.001 : min;
            const valSafe = Math.max(val, safeMin);
            const minLog = Math.log(safeMin);
            const maxLog = Math.log(max);
            // Protect against divide by zero if max == min
            const range = maxLog - minLog;
            if (range === 0) return 0;

            return Math.max(0, Math.min(1, (Math.log(valSafe) - minLog) / range));
        }

        const range = max - min;
        if (range === 0) return 0;
        return Math.max(0, Math.min(1, (val - min) / range));
    }, [min, max, logarithmic]);

    // Helper: Denormalize 0-1 to value
    const getValueFromNormalized = useCallback((norm: number) => {
        if (logarithmic) {
            const safeMin = min === 0 ? 0.001 : min;
            const minLog = Math.log(safeMin);
            const maxLog = Math.log(max);
            return Math.exp(minLog + norm * (maxLog - minLog));
        }
        return min + norm * (max - min);
    }, [min, max, logarithmic]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const deltaY = startYRef.current - e.clientY;
        const sensitivity = 0.005;
        const newNorm = Math.max(0, Math.min(1, startValueRef.current + deltaY * sensitivity));

        const newValue = getValueFromNormalized(newNorm);

        // Update refs and local state
        dragValueRef.current = newValue;
        setDragValue(newValue);

        // Call latest onChange
        onChangeRef.current(newValue);
    }, [getValueFromNormalized]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);

        const finalValue = dragValueRef.current !== null ? dragValueRef.current : value;

        // Reset drag state
        setDragValue(null);
        dragValueRef.current = null;

        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        // Call latest onCommit
        if (onCommitRef.current) {
            onCommitRef.current(finalValue);
        }
    }, [handleMouseMove, value]); // value is basically fallback if dragValueRef is null

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        startYRef.current = e.clientY;

        const currentEffective = Number.isFinite(value) ? value : min;
        startValueRef.current = getNormalizedValue(currentEffective);

        dragValueRef.current = currentEffective;
        setDragValue(currentEffective);

        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [value, min, getNormalizedValue, handleMouseMove, handleMouseUp]);

    // Determine value to display and render
    const effectiveValue = isDragging && dragValue !== null ? dragValue : (Number.isFinite(value) ? value : min);

    // Calculate arc
    const normalizedValue = getNormalizedValue(effectiveValue);
    // Ensure normalizedValue is a finite number
    const safeNorm = Number.isFinite(normalizedValue) ? normalizedValue : 0;
    const angle = MIN_ANGLE + safeNorm * (MAX_ANGLE - MIN_ANGLE);

    // SVG Math
    const center = size / 2;
    const radius = (size / 2) - 4; // padding
    const strokeWidth = 3;

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        // Protect against bad inputs
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) return "";

        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) return "";

        return [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
    };

    const displayValue = formatValue ? formatValue(effectiveValue) : effectiveValue.toFixed(1);

    return (
        <div className="flex flex-col items-center gap-1 group w-16 select-none flex-shrink-0">
            <div className="relative w-full aspect-square flex items-center justify-center cursor-ns-resize" onMouseDown={handleMouseDown}>
                <svg width={size} height={size} className="transform rotate-0">
                    {/* Background Track */}
                    <path
                        d={describeArc(center, center, radius, MIN_ANGLE, MAX_ANGLE)}
                        fill="none"
                        stroke="var(--color-border)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="opacity-30"
                    />

                    {/* Value Arc */}
                    <path
                        d={describeArc(center, center, radius, MIN_ANGLE, angle)}
                        fill="none"
                        stroke="var(--color-accent-primary)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className={`transition-all duration-75 ${isDragging ? 'brightness-125' : ''}`}
                    />

                    {/* Indicator Line (Rotating with angle) */}
                    <g transform={`rotate(${angle} ${center} ${center})`}>
                        <line
                            x1={center}
                            y1={center - radius + 2}
                            x2={center}
                            y2={center - radius + 8}
                            stroke="var(--color-accent-primary)"
                            strokeWidth={2}
                        />
                    </g>
                </svg>
            </div>

            <div className="flex flex-col items-center text-center -mt-1 w-full overflow-hidden">
                <span className="text-[9px] text-[var(--color-text-secondary)] font-mono uppercase tracking-tight truncate w-full">{label}</span>
                <span className={`text-[10px] font-mono leading-tight whitespace-nowrap ${isDragging ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                    {displayValue}
                </span>
            </div>
        </div>
    );
};
