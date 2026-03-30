import React, { useState, useMemo } from 'react';
import { usePresets } from '../hooks/usePresets';
import { PresetCategory } from '../types/preset';
import { useUIStore } from '../stores/uiStore';
import { PresetItem } from './PresetItem';
import './PresetBrowser.css';

type SortField = 'name' | 'type' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const PresetBrowser: React.FC = () => {
    const { presets: allPresets, loading, error, refetch, createPreset, deletePreset } = usePresets();
    const showToast = useUIStore(state => state.showToast);

    // State
    const [activeCategory, setActiveCategory] = useState<PresetCategory | 'all'>('all');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Apply filtering and sorting
    const displayedPresets = useMemo(() => {
        let filtered = activeCategory === 'all'
            ? allPresets
            : allPresets.filter(p => p.category === activeCategory);

        return [...filtered].sort((a, b) => {
            let valA: string | number | boolean;
            let valB: string | number | boolean;

            if (sortField === 'createdAt') {
                valA = a.created_at || '';
                valB = b.created_at || '';
            } else {
                valA = (a as any)[sortField];
                valB = (b as any)[sortField];
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
                        {loading && displayedPresets.length === 0 ? (
                            Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="preset-skeleton">
                                    <div className="skeleton-icon" />
                                    <div className="skeleton-name" />
                                    <div className="skeleton-badge" />
                                </div>
                            ))
                        ) : error && displayedPresets.length === 0 ? (
                            <div className="preset-error-container">
                                <span className="error-text">{error}</span>
                                <button className="retry-btn" onClick={() => refetch()}>
                                    RETRY CONNECTION
                                </button>
                            </div>
                        ) : displayedPresets.length > 0 ? (
                            displayedPresets.map(preset => (
                                <PresetItem
                                    key={preset.id}
                                    preset={preset}
                                    onDelete={async (id) => {
                                        try {
                                            await deletePreset(id);
                                            showToast('PRESET DELETED', 'success');
                                        } catch (err: any) {
                                            showToast(err.message || 'DELETE FAILED', 'error');
                                        }
                                    }}
                                    onDuplicate={async (p) => {
                                        try {
                                            const result = await createPreset({
                                                name: `${p.name} (COPY)`,
                                                description: p.description,
                                                category: p.category,
                                                type: p.type,
                                                parameters: p.parameters
                                            });
                                            showToast('PRESET DUPLICATED', 'success');
                                            return result;
                                        } catch (err: any) {
                                            showToast(err.message || 'DUPLICATE FAILED', 'error');
                                            throw err;
                                        }
                                    }}
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
