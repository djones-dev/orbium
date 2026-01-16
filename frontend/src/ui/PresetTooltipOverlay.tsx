import React, { useRef, useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { PresetCategory } from '../types/preset';
import { SunParameters } from '../types/audio';
import './PresetTooltipOverlay.css';

export const PresetTooltipOverlay: React.FC = () => {
    const hoveredPreset = useUIStore(state => state.hoveredPreset);
    const hoveredPresetY = useUIStore(state => state.hoveredPresetY);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [clampedY, setClampedY] = useState<number>(0);

    useEffect(() => {
        if (hoveredPresetY !== null && tooltipRef.current) {
            const tooltipHeight = tooltipRef.current.offsetHeight;
            const windowHeight = window.innerHeight;
            const margin = 20;

            // Try to center the tooltip vertically on the item
            let y = hoveredPresetY - tooltipHeight / 2;

            // Clamp to window boundaries
            y = Math.max(margin + 48, Math.min(y, windowHeight - tooltipHeight - margin - 32));

            setClampedY(y);
        }
    }, [hoveredPresetY]);

    if (!hoveredPreset || hoveredPresetY === null) return null;

    const getIcon = (category: PresetCategory) => {
        switch (category) {
            case 'planet': return '○';
            case 'moon': return '☾';
            case 'attribute': return '◆';
            case 'sun': return '☼';
            default: return '□';
        }
    };

    const getParamSummary = (params: Partial<SunParameters>) => {
        const summary: string[] = [];
        if (params.waveform) {
            summary.push(`${params.waveform.charAt(0).toUpperCase() + params.waveform.slice(1)} wave`);
        }
        if (params.rootFrequency) {
            summary.push(`${params.rootFrequency}Hz`);
        }
        if (params.distortion !== undefined) {
            if (params.distortion === 0) summary.push('clean');
            else if (params.distortion < 20) summary.push('mild drive');
            else if (params.distortion < 60) summary.push('saturated');
            else summary.push('crushed');
        }
        if (params.filterCutoff) {
            summary.push(`F:${Math.round(params.filterCutoff)}Hz`);
        }
        return summary.length > 0 ? summary.join(', ') : 'Default parameters';
    };

    return (
        <div
            className="preset-tooltip-overlay"
            ref={tooltipRef}
            style={{
                top: `${clampedY}px`,
                // We leave 'left' to CSS for now as it's static over the main view
            }}
        >
            <div className="tooltip-overlay-content">
                <div className="tooltip-header">
                    <span className="tooltip-icon">{getIcon(hoveredPreset.category)}</span>
                    <div className="tooltip-title-area">
                        <div className="tooltip-title">{hoveredPreset.name.toUpperCase()}</div>
                        <div className="tooltip-subtitle">
                            {hoveredPreset.category.toUpperCase()} // {hoveredPreset.type.toUpperCase()}
                        </div>
                    </div>
                </div>

                <div className="tooltip-body">
                    <div className="tooltip-description">{hoveredPreset.description}</div>

                    <div className="tooltip-specs">
                        <div className="specs-label">SIGNAL CONFIGURATION</div>
                        <div className="specs-content">
                            {getParamSummary(hoveredPreset.parameters)}
                        </div>
                    </div>
                </div>

                <div className="tooltip-footer">
                    <div className="footer-glyph">◢</div>
                    <div className="footer-text">ORBIUM PRESET DATA // READY</div>
                </div>
            </div>
        </div>
    );
};
