import React from 'react';
import { Preset, PresetCategory, PresetType } from '../types/preset';
import { useUIStore } from '../stores/uiStore';

interface PresetItemProps {
    preset: Preset;
    onClick?: (preset: Preset) => void;
    isActive?: boolean;
}

export const PresetItem: React.FC<PresetItemProps> = ({
    preset,
    onClick,
    isActive
}) => {
    const setHoveredPreset = useUIStore(state => state.setHoveredPreset);

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Pass the Y coordinate of the middle of the item
        setHoveredPreset(preset, rect.top + rect.height / 2);
    };

    const getIcon = (category: PresetCategory) => {
        switch (category) {
            case 'planet': return '○';
            case 'moon': return '☾';
            case 'attribute': return '◆';
            case 'sun': return '☼';
            default: return '□';
        }
    };

    const getTypeClass = (type: PresetType) => {
        switch (type) {
            case 'generator': return 'preset-badge-generator';
            case 'effect': return 'preset-badge-effect';
            case 'modulator': return 'preset-badge-modulator';
            default: return '';
        }
    };

    return (
        <div
            className={`preset-item ${isActive ? 'active' : ''}`}
            data-preset-id={preset.id}
            onClick={() => onClick?.(preset)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setHoveredPreset(null)}
        >
            <div className="preset-item-header">
                <span className="preset-icon">{getIcon(preset.category)}</span>
                <span className="preset-name">{preset.name}</span>
                <span className={`preset-badge ${getTypeClass(preset.type)}`}>
                    {preset.type.substring(0, 3)}
                </span>
            </div>
        </div>
    );
};
