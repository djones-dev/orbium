import { Preset, PresetFilters, SynthModule, ModuleRole, toSynthModule } from '../types/preset';
import { logger } from '@/utils/logger';

class PresetError extends Error {
    constructor(message: string, public originalError?: any) {
        super(message);
        this.name = 'PresetServiceError';
    }
}

// Helper to convert ModuleRole back to PresetType for backend
function roleToPresetType(role: ModuleRole): Preset['type'] {
    const map: Record<ModuleRole, Preset['type']> = {
        oscillator: 'generator',
        effect: 'effect',
        modulator: 'modulator',
        phenomenon: 'phenomenon',
    };
    return map[role];
}

export class PresetService {
    private baseUrl: string = '/api/presets';

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            let errorMessage = 'An error occurred while communicating with the preset service.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // Response might not be JSON
            }
            throw new PresetError(errorMessage);
        }
        return response.json();
    }

    private handleError(error: any): never {
        logger.error('[PresetService Error]:', error);
        if (error instanceof PresetError) {
            throw error;
        }
        throw new PresetError('Network or server error. Please try again later.', error);
    }

    async fetchPresets(filters?: PresetFilters): Promise<SynthModule[]> {
        try {
            const queryParams = new URLSearchParams();
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value) queryParams.append(key, String(value));
                });
            }
            const queryString = queryParams.toString();
            const url = `${this.baseUrl}${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url);
            const presets = await this.handleResponse<Preset[]>(response);
            return presets.map(toSynthModule);
        } catch (error) {
            this.handleError(error);
        }
    }

    async getPreset(id: string): Promise<SynthModule> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`);
            const preset = await this.handleResponse<Preset>(response);
            return toSynthModule(preset);
        } catch (error) {
            this.handleError(error);
        }
    }

    async createPreset(module: Omit<SynthModule, 'id' | 'created_at' | 'updated_at'>): Promise<SynthModule> {
        try {
            // Convert SynthModule back to Preset format for backend
            const presetData: Omit<Preset, 'id' | 'created_at' | 'updated_at'> = {
                name: module.name,
                description: module.description,
                type: roleToPresetType(module.role),
                category: module.category,
                parameters: module.defaults,
                is_default: module.is_default,
            };
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(presetData),
            });
            const preset = await this.handleResponse<Preset>(response);
            return toSynthModule(preset);
        } catch (error) {
            this.handleError(error);
        }
    }

    async updatePreset(id: string, updates: Partial<SynthModule>): Promise<SynthModule> {
        try {
            // Convert partial SynthModule to partial Preset format
            const presetUpdates: Partial<Preset> = {};
            if (updates.name) presetUpdates.name = updates.name;
            if (updates.description) presetUpdates.description = updates.description;
            if (updates.role) presetUpdates.type = roleToPresetType(updates.role);
            if (updates.category) presetUpdates.category = updates.category;
            if (updates.defaults) presetUpdates.parameters = updates.defaults;
            if (updates.is_default !== undefined) presetUpdates.is_default = updates.is_default;

            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(presetUpdates),
            });
            const preset = await this.handleResponse<Preset>(response);
            return toSynthModule(preset);
        } catch (error) {
            this.handleError(error);
        }
    }

    async deletePreset(id: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                await this.handleResponse(response);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    async getDefaults(): Promise<SynthModule[]> {
        try {
            const response = await fetch(`${this.baseUrl}/defaults`);
            const presets = await this.handleResponse<Preset[]>(response);
            return presets.map(toSynthModule);
        } catch (error) {
            this.handleError(error);
        }
    }
}

export const presetService = new PresetService();
