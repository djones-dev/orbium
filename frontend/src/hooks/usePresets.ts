import { useState, useEffect, useCallback } from 'react';
import { PresetFilters, SynthModule } from '../types/preset';
import { presetService } from '../services/PresetService';

export function usePresets(filters?: PresetFilters) {
    const [presets, setPresets] = useState<SynthModule[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPresets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await presetService.fetchPresets(filters);
            setPresets(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch modules');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchPresets();
    }, [fetchPresets]);

    const createPreset = async (newModule: Omit<SynthModule, 'id' | 'created_at' | 'updated_at'>) => {
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticModule: SynthModule = {
            ...newModule,
            id: tempId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const previousPresets = presets;
        setPresets(prev => [...prev, optimisticModule]);

        try {
            const savedModule = await presetService.createPreset(newModule);
            setPresets(prev => prev.map(p => p.id === tempId ? savedModule : p));
            return savedModule;
        } catch (err: any) {
            setPresets(previousPresets);
            setError(err.message || 'Failed to create module');
            throw err;
        }
    };

    const updatePreset = async (id: string, updates: Partial<SynthModule>) => {
        const previousPresets = presets;
        setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

        try {
            const updatedModule = await presetService.updatePreset(id, updates);
            setPresets(prev => prev.map(p => p.id === id ? updatedModule : p));
            return updatedModule;
        } catch (err: any) {
            setPresets(previousPresets);
            setError(err.message || 'Failed to update module');
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
            setError(err.message || 'Failed to delete module');
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
