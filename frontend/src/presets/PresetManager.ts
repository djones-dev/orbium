import { PresetCategory, PresetFilters, SynthModule } from '../types/preset';
import { presetService } from '../services/PresetService';

export class PresetManager {
    private presets: SynthModule[] = [];
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
    public async loadPresets(filters?: PresetFilters): Promise<SynthModule[]> {
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
     * Saves or updates a module.
     */
    public async savePreset(module: Omit<SynthModule, 'id' | 'created_at' | 'updated_at'> | SynthModule): Promise<SynthModule> {
        const isUpdate = 'id' in module;

        const action = async () => {
            if (isUpdate) {
                return await presetService.updatePreset((module as SynthModule).id, module as Partial<SynthModule>);
            } else {
                return await presetService.createPreset(module);
            }
        };

        try {
            const savedModule = await action();
            this.invalidateCache(savedModule);
            return savedModule;
        } catch (e) {
            if (typeof window !== 'undefined' && !navigator.onLine) {
                this.offlineQueue.push(action);
                // For offline, we return the module with a temporary ID if it's new
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
     * Filters modules by category (from cache).
     */
    public filterByCategory(category: PresetCategory | string): SynthModule[] {
        return this.presets.filter(p => p.category === category);
    }

    /**
     * Sorts modules by a specific field (from cache).
     */
    public sortBy(field: 'name' | 'role' | 'createdAt', direction: 'asc' | 'desc'): SynthModule[] {
        return [...this.presets].sort((a, b) => {
            let valA: string | number;
            let valB: string | number;

            if (field === 'createdAt') {
                valA = a.created_at;
                valB = b.created_at;
            } else if (field === 'name') {
                valA = a.name;
                valB = b.name;
            } else {
                valA = a.role;
                valB = b.role;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Retrieves a module by its ID (from cache).
     */
    public getPresetById(id: string): SynthModule | undefined {
        return this.presets.find(p => p.id === id);
    }

    /**
     * Resets the entire library to defaults by fetching from backend.
     */
    public async resetToDefaults(): Promise<SynthModule[]> {
        try {
            this.presets = await presetService.getDefaults();
            return this.presets;
        } catch (e) {
            console.error('Failed to reset to defaults', e);
            throw e;
        }
    }

    private invalidateCache(updatedModule: SynthModule) {
        const index = this.presets.findIndex(p => p.id === updatedModule.id);
        if (index > -1) {
            this.presets[index] = updatedModule;
        } else {
            this.presets.push(updatedModule);
        }
    }

    public getIsLoaded(): boolean {
        return this.isLoaded;
    }

    public getCachedPresets(): SynthModule[] {
        return this.presets;
    }
}
