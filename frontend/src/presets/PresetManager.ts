import { Preset, PresetCategory, PresetFilters } from '../types/preset';
import { presetService } from '../services/PresetService';

export class PresetManager {
    private presets: Preset[] = [];
    private isLoaded: boolean = false;
    private offlineQueue: Array<() => Promise<any>> = [];

    constructor() {
        this.loadPresets();
        this.setupNetworkListeners();
    }

    private setupNetworkListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processOfflineQueue());
        }
    }

    private async processOfflineQueue() {
        while (this.offlineQueue.length > 0) {
            const action = this.offlineQueue.shift();
            if (action) {
                try {
                    await action();
                } catch (e) {
                    console.error('Failed to process offline action', e);
                }
            }
        }
    }

    /**
     * Loads presets from backend or falls back to cache.
     */
    public async loadPresets(filters?: PresetFilters): Promise<Preset[]> {
        try {
            this.presets = await presetService.fetchPresets(filters);
            this.isLoaded = true;
            return this.presets;
        } catch (e) {
            console.error('Failed to load presets from service, using cache', e);
            return this.presets; // Return cached presets if service fails (offline)
        }
    }

    /**
     * Saves or updates a preset.
     */
    public async savePreset(preset: Omit<Preset, 'id' | 'created_at' | 'updated_at'> | Preset): Promise<Preset> {
        const isUpdate = 'id' in preset;

        const action = async () => {
            if (isUpdate) {
                return await presetService.updatePreset((preset as Preset).id, preset as Partial<Preset>);
            } else {
                return await presetService.createPreset(preset);
            }
        };

        try {
            const savedPreset = await action();
            this.invalidateCache(savedPreset);
            return savedPreset;
        } catch (e) {
            if (typeof window !== 'undefined' && !navigator.onLine) {
                this.offlineQueue.push(action);
                // For offline, we return the preset with a temporary ID if it's new
                // but this is tricky without a real ID. 
                // For now, let's just throw or handle as we can.
            }
            throw e;
        }
    }

    /**
     * Deletes a preset by ID.
     */
    public async deletePreset(id: string): Promise<void> {
        const action = () => presetService.deletePreset(id);

        try {
            await action();
            this.presets = this.presets.filter(p => p.id !== id);
        } catch (e) {
            if (typeof window !== 'undefined' && !navigator.onLine) {
                this.offlineQueue.push(action);
            }
            throw e;
        }
    }

    /**
     * Filters presets by category (from cache).
     */
    public filterByCategory(category: PresetCategory | string): Preset[] {
        return this.presets.filter(p => p.category === category);
    }

    /**
     * Sorts presets by a specific field (from cache).
     */
    public sortBy(field: 'name' | 'type' | 'createdAt', direction: 'asc' | 'desc'): Preset[] {
        return [...this.presets].sort((a, b) => {
            let valA: string | number;
            let valB: string | number;

            if (field === 'createdAt') {
                valA = a.created_at;
                valB = b.created_at;
            } else {
                valA = a[field];
                valB = b[field];
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Retrieves a preset by its ID (from cache).
     */
    public getPresetById(id: string): Preset | undefined {
        return this.presets.find(p => p.id === id);
    }

    /**
     * Resets the entire library to defaults by fetching from backend.
     */
    public async resetToDefaults(): Promise<Preset[]> {
        try {
            this.presets = await presetService.getDefaults();
            return this.presets;
        } catch (e) {
            console.error('Failed to reset to defaults', e);
            throw e;
        }
    }

    private invalidateCache(updatedPreset: Preset) {
        const index = this.presets.findIndex(p => p.id === updatedPreset.id);
        if (index > -1) {
            this.presets[index] = updatedPreset;
        } else {
            this.presets.push(updatedPreset);
        }
    }

    public getIsLoaded(): boolean {
        return this.isLoaded;
    }

    public getCachedPresets(): Preset[] {
        return this.presets;
    }
}
