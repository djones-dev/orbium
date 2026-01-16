import { useState, useEffect, useCallback } from 'react';
import { Preset, PresetFilters } from '../types/preset';
import { presetService } from '../services/PresetService';

export function usePresets(filters?: PresetFilters) {
    const [presets, setPresets] = useState<Preset[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPresets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await presetService.fetchPresets(filters);
            setPresets(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch presets');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchPresets();
    }, [fetchPresets]);

    const createPreset = async (newPreset: Omit<Preset, 'id' | 'created_at' | 'updated_at' | 'is_default'>) => {
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticPreset: Preset = {
            ...newPreset as any,
            id: tempId,
            is_default: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const previousPresets = presets;
        setPresets(prev => [...prev, optimisticPreset]);

        try {
            const savedPreset = await presetService.createPreset(newPreset);
            setPresets(prev => prev.map(p => p.id === tempId ? savedPreset : p));
            return savedPreset;
        } catch (err: any) {
            setPresets(previousPresets);
            setError(err.message || 'Failed to create preset');
            throw err;
        }
    };

    const updatePreset = async (id: string, updates: Partial<Preset>) => {
        const previousPresets = presets;
        setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

        try {
            const updatedPreset = await presetService.updatePreset(id, updates);
            setPresets(prev => prev.map(p => p.id === id ? updatedPreset : p));
            return updatedPreset;
        } catch (err: any) {
            setPresets(previousPresets);
            setError(err.message || 'Failed to update preset');
            throw err;
        }
    };

    const deletePreset = async (id: string) => {
        const previousPresets = presets;
        setPresets(prev => prev.filter(p => p.id !== id));

        try {
            await presetService.deletePreset(id);
        } catch (err: any) {
            setPresets(previousPresets);
            setError(err.message || 'Failed to delete preset');
            throw err;
        }
    };

    return {
        presets,
        loading,
        error,
        refetch: fetchPresets,
        createPreset,
        updatePreset,
        deletePreset
    };
}
