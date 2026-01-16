import React, { useState, useEffect, useMemo } from 'react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { Preset, PresetCategory } from '../types/preset';
import { PresetItem } from './PresetItem';
import './PresetBrowser.css';

type SortField = 'name' | 'type' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const PresetBrowser: React.FC = () => {
    const { engine } = useAudioEngine();

    // State
    const [allPresets, setAllPresets] = useState<Preset[]>([]);
    const [activeCategory, setActiveCategory] = useState<PresetCategory | 'all'>('all');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Load initial data
    useEffect(() => {
        const loaded = engine.presets.loadPresets();
        setAllPresets(loaded);
    }, [engine]);

    // Apply filtering and sorting
    const displayedPresets = useMemo(() => {
        let filtered = activeCategory === 'all'
            ? allPresets
            : allPresets.filter(p => p.category === activeCategory);

        return [...filtered].sort((a, b) => {
            let valA: string | number;
            let valB: string | number;

            if (sortField === 'createdAt') {
                valA = a.metadata.createdAt;
                valB = b.metadata.createdAt;
            } else {
                valA = a[sortField];
                valB = b[sortField];
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [allPresets, activeCategory, sortField, sortDirection]);

    const categories: { label: string; value: PresetCategory | 'all'; icon: string }[] = [
        { label: 'ALL', value: 'all', icon: '◈' },
        { label: 'PLANETS', value: 'planet', icon: '○' },
        { label: 'MOONS', value: 'moon', icon: '☾' },
        { label: 'ATTR', value: 'attribute', icon: '◆' },
    ];

    const sortFields: { label: string; value: SortField }[] = [
        { label: 'NAME', value: 'name' },
        { label: 'TYPE', value: 'type' },
        { label: 'DATE', value: 'createdAt' },
    ];

    return (
        <div className="preset-browser-layout">
            {/* Category Filter Strap */}
            <div className="category-sidebar">
                {categories.map(cat => (
                    <button
                        key={cat.value}
                        className={`category-btn ${activeCategory === cat.value ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.value)}
                        title={cat.label}
                    >
                        <span className="cat-icon">{cat.icon}</span>
                        <span className="cat-label">{cat.label.substring(0, 4)}</span>
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="preset-main-area">
                {/* Sort Bar */}
                <div className="preset-sort-bar">
                    <div className="sort-fields">
                        {sortFields.map(field => (
                            <button
                                key={field.value}
                                className={`sort-field-btn ${sortField === field.value ? 'active' : ''}`}
                                onClick={() => setSortField(field.value)}
                            >
                                {field.label}
                            </button>
                        ))}
                    </div>
                    <button
                        className="sort-dir-btn"
                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                        {sortDirection === 'asc' ? 'ASC ↑' : 'DESC ↓'}
                    </button>
                </div>

                {/* List Container */}
                <div className="preset-list-container">
                    <div className="preset-list">
                        {displayedPresets.length > 0 ? (
                            displayedPresets.map(preset => (
                                <PresetItem
                                    key={preset.id}
                                    preset={preset}
                                />
                            ))
                        ) : (
                            <div className="no-presets">
                                <span className="opacity-30">NO PRESETS FOUND</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
