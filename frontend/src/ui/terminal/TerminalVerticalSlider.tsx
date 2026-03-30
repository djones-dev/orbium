import React, { useState, useRef, useEffect } from 'react';

interface TerminalVerticalSliderProps {
    label: string;
    value: number;
    defaultValue?: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    meterValue?: number; // 0-1 for the dB meter
    color?: string;
    showLabel?: boolean;
}

/**
 * A vertical slider with a built-in dB level meter.
 * Designed for the mixer view with a retro terminal aesthetic.
 */
export const TerminalVerticalSlider: React.FC<TerminalVerticalSliderProps> = ({
    label,
    value,
    defaultValue,
    min,
    max,
    onChange,
    meterValue = 0,
    color = 'var(--color-accent-primary)',
    showLabel = true
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [peak, setPeak] = useState(0);
    const trackRef = useRef<HTMLDivElement>(null);

    const handleDoubleClick = () => {
        if (defaultValue !== undefined) {
            onChange(defaultValue);
        }
    };

    // Peak decay logic
    useEffect(() => {
        if (meterValue > peak) {
            setPeak(meterValue);
        } else {
            const decay = setTimeout(() => {
                setPeak(prev => Math.max(0, prev - 0.02));
            }, 33);
            return () => clearTimeout(decay);
        }
    }, [meterValue, peak]);

    const normalizedValue = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const percentage = normalizedValue * 100;

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        updateValue(e);
    };

    const updateValue = (e: MouseEvent | React.MouseEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const p = 1 - Math.max(0, Math.min(1, y / rect.height));
        const newValue = min + p * (max - min);
        onChange(newValue);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) updateValue(e);
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ns-resize';
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
            };
        }
    }, [isDragging]);

    // Meter segments
    const segments = 20;
    const activeSegments = Math.floor(meterValue * segments);

    const getSegmentColor = (i: number) => {
        const p = i / segments;
        if (p > 0.85) return '#ff3e3e'; // Red
        if (p > 0.65) return '#ffb33e'; // Orange
        return '#3eff3e'; // Green
    };

    return (
        <div className="flex flex-col items-center h-full gap-2 font-mono group">
            {showLabel && (
                <div className="text-[9px] text-[var(--color-text-secondary)] uppercase tracking-tighter h-3">
                    {label}
                </div>
            )}
            
            <div className="flex gap-2 h-full items-stretch">
                {/* Level Meter */}
                <div className="relative flex flex-col-reverse w-3 gap-[1px] bg-black/60 border border-[var(--color-border)]/40 p-[1.5px] rounded-sm shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    {Array.from({ length: segments }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-[0.5px] transition-all duration-75"
                            style={{
                                backgroundColor: i < activeSegments ? getSegmentColor(i) : 'transparent',
                                opacity: i < activeSegments ? 1 : 0.05,
                                boxShadow: i < activeSegments ? `0 0 6px ${getSegmentColor(i)}` : 'none',
                                border: i < activeSegments ? `0.5px solid ${getSegmentColor(i)}88` : 'none'
                            }}
                        />
                    ))}
                    
                    {/* Peak Indicator */}
                    <div 
                        className="absolute left-0 w-full h-[2.5px] bg-white transition-all duration-300 z-10"
                        style={{ 
                            bottom: `${Math.min(98, peak * 100)}%`,
                            boxShadow: '0 0 8px 1px white',
                            opacity: peak > 0.01 ? 0.9 : 0
                        }}
                    />
                </div>

                {/* Slider Track */}
                <div
                    ref={trackRef}
                    className="relative w-6 bg-black/60 border border-[var(--color-border)] rounded cursor-ns-resize hover:border-[var(--color-accent-secondary)] transition-colors group"
                    onMouseDown={handleMouseDown}
                    onDoubleClick={handleDoubleClick}
                    title={defaultValue !== undefined ? `Double-click to reset to ${defaultValue}` : undefined}
                >
                    {/* Tick marks */}
                    <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="w-full h-[1px] bg-white mx-auto px-1" />
                        ))}
                    </div>

                    {/* Value Bar */}
                    <div
                        className="absolute bottom-0 left-0 w-full bg-[var(--color-accent-primary)]/20 border-t border-[var(--color-accent-primary)] transition-all duration-75 ease-out"
                        style={{ 
                            height: `${percentage}%`,
                            backgroundColor: `${color}33`,
                            borderColor: color
                        }}
                    >
                        {/* Glow effect */}
                        <div 
                            className="absolute top-0 left-0 w-full h-px shadow-[0_0_8px_var(--color-accent-primary)]"
                            style={{ boxShadow: `0 0 8px ${color}` }}
                        />
                    </div>

                    {/* Fader Handle */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 w-8 h-3 bg-[#333] border border-[#666] shadow-lg rounded-sm transition-transform active:scale-95 group-hover:border-white/40"
                        style={{ 
                            bottom: `calc(${percentage}% - 6px)`,
                            zIndex: 10
                        }}
                    >
                        {/* Handle detail */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/20" />
                    </div>
                </div>
            </div>

            <div className="text-[10px] text-[var(--color-accent-primary)] font-bold min-w-[32px] text-center" style={{ color }}>
                {value.toFixed(0)}
            </div>
        </div>
    );
};
