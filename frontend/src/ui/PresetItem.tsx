import React from 'react';
import { Preset, PresetCategory, PresetType } from '../types/preset';
import { useUIStore } from '../stores/uiStore';
import { logger } from '../utils/logger';

interface PresetItemProps {
    preset: Preset;
    onClick?: (preset: Preset) => void;
    isActive?: boolean;
    onDelete?: (id: string) => Promise<void>;
    onDuplicate?: (preset: Preset) => Promise<Preset>;
}

export const PresetItem: React.FC<PresetItemProps> = ({
    preset,
    onClick,
    isActive,
    onDelete,
    onDuplicate
}) => {
    const setHoveredPreset = useUIStore(state => state.setHoveredPreset);

    const [showContextMenu, setShowContextMenu] = React.useState(false);
    const [menuPos, setMenuPos] = React.useState({ x: 0, y: 0 });
    // const [isRenaming, setIsRenaming] = React.useState(false);

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredPreset(preset, rect.top + rect.height / 2);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleAction = (action: 'rename' | 'delete' | 'duplicate') => {
        setShowContextMenu(false);
        if (action === 'rename') {
            if (!preset.is_default) {
                // setIsRenaming(true);
                logger.log('Renaming not implemented yet');
            }
        } else if (action === 'duplicate') {
            onDuplicate?.(preset);
        } else if (action === 'delete') {
            if (preset.is_default) return;
            if (window.confirm(`Delete preset "${preset.name}"?`)) {
                onDelete?.(preset.id);
            }
        }
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
        <>
            <div
                draggable="true"
                onDragStart={(e) => {
                    e.dataTransfer.setData('presetId', preset.id);
                    e.dataTransfer.setData('presetType', preset.type);
                    e.dataTransfer.effectAllowed = 'copy';
                }}
                className={`preset-item ${isActive ? 'active' : ''}`}
                data-preset-id={preset.id}
                onClick={() => onClick?.(preset)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setHoveredPreset(null)}
                onContextMenu={handleContextMenu}
            >
                <div className="preset-item-header">
                    <span className="preset-icon">{getIcon(preset.category)}</span>
                    <span className="preset-name">
                        {preset.name}
                        {preset.is_default && <span className="default-tag">DEFAULT</span>}
                    </span>
                    <span className={`preset-badge ${getTypeClass(preset.type)}`}>
                        {preset.type.substring(0, 3)}
                    </span>
                    <button
                        className="preset-menu-trigger"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setMenuPos({ x: e.clientX, y: e.clientY });
                            setShowContextMenu(!showContextMenu);
                        }}
                    >
                        ⋮
                    </button>
                </div>
            </div>

            {showContextMenu && (
                <div
                    className="preset-context-menu"
                    style={{ top: menuPos.y, left: menuPos.x }}
                    onMouseLeave={() => setShowContextMenu(false)}
                >
                    <button onClick={() => handleAction('rename')}>EDIT</button>
                    <button onClick={() => handleAction('duplicate')}>DUPLICATE</button>
                    <button
                        onClick={() => handleAction('delete')}
                        disabled={preset.is_default}
                        className={preset.is_default ? 'disabled' : ''}
                    >
                        DELETE
                    </button>
                </div>
            )}
        </>
    );
};
