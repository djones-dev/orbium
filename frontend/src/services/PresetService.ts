import { Preset, PresetFilters } from '../types/preset';

class PresetError extends Error {
    constructor(message: string, public originalError?: any) {
        super(message);
        this.name = 'PresetServiceError';
    }
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
        console.error('[PresetService Error]:', error);
        if (error instanceof PresetError) {
            throw error;
        }
        throw new PresetError('Network or server error. Please try again later.', error);
    }

    async fetchPresets(filters?: PresetFilters): Promise<Preset[]> {
        try {
            const queryParams = new URLSearchParams();
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value) queryParams.append(key, value);
                });
            }
            const queryString = queryParams.toString();
            const url = `${this.baseUrl}${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url);
            return await this.handleResponse<Preset[]>(response);
        } catch (error) {
            this.handleError(error);
        }
    }

    async getPreset(id: string): Promise<Preset> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`);
            return await this.handleResponse<Preset>(response);
        } catch (error) {
            this.handleError(error);
        }
    }

    async createPreset(preset: Omit<Preset, 'id' | 'created_at' | 'updated_at' | 'is_default'>): Promise<Preset> {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preset),
            });
            return await this.handleResponse<Preset>(response);
        } catch (error) {
            this.handleError(error);
        }
    }

    async updatePreset(id: string, updates: Partial<Preset>): Promise<Preset> {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });
            return await this.handleResponse<Preset>(response);
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

    async getDefaults(): Promise<Preset[]> {
        try {
            const response = await fetch(`${this.baseUrl}/defaults`);
            return await this.handleResponse<Preset[]>(response);
        } catch (error) {
            this.handleError(error);
        }
    }
}

export const presetService = new PresetService();
