import { Preset, PresetCategory } from '../types/preset';
import { DEFAULT_PRESETS } from './defaults';

export class PresetManager {
    private presets: Preset[] = [];
    private readonly storageKey = 'orbium_presets';

    constructor() {
        this.loadPresets();
    }

    /**
     * Loads presets from localStorage or falls back to defaults.
     */
    public loadPresets(): Preset[] {
        if (typeof window === 'undefined') {
            this.presets = [...DEFAULT_PRESETS];
            return this.presets;
        }

        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                this.presets = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse presets from localStorage', e);
                this.presets = [...DEFAULT_PRESETS];
            }
        } else {
            this.presets = [...DEFAULT_PRESETS];
            this.saveToStorage();
        }
        return this.presets;
    }

    /**
     * Saves or updates a preset.
     */
    public savePreset(preset: Preset): void {
        const index = this.presets.findIndex(p => p.id === preset.id);
        const now = Date.now();

        const updatedPreset: Preset = {
            ...preset,
            metadata: {
                ...preset.metadata,
                updatedAt: now
            }
        };

        if (index > -1) {
            this.presets[index] = updatedPreset;
        } else {
            // New preset, ensure it has a createdAt if not provided
            if (!updatedPreset.metadata.createdAt) {
                updatedPreset.metadata.createdAt = now;
            }
            this.presets.push(updatedPreset);
        }
        this.saveToStorage();
    }

    /**
     * Deletes a preset by ID.
     */
    public deletePreset(id: string): void {
        this.presets = this.presets.filter(p => p.id !== id);
        this.saveToStorage();
    }

    /**
     * Filters presets by category.
     */
    public filterByCategory(category: PresetCategory | string): Preset[] {
        return this.presets.filter(p => p.category === category);
    }

    /**
     * Sorts presets by a specific field.
     */
    public sortBy(field: 'name' | 'type' | 'createdAt', direction: 'asc' | 'desc'): Preset[] {
        return [...this.presets].sort((a, b) => {
            let valA: string | number;
            let valB: string | number;

            if (field === 'createdAt') {
                valA = a.metadata.createdAt;
                valB = b.metadata.createdAt;
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
     * Retrieves a preset by its ID.
     */
    public getPresetById(id: string): Preset | undefined {
        return this.presets.find(p => p.id === id);
    }

    /**
     * Resets the entire library to defaults.
     */
    public resetToDefaults(): void {
        this.presets = [...DEFAULT_PRESETS];
        this.saveToStorage();
    }

    private saveToStorage(): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
        }
    }
}
