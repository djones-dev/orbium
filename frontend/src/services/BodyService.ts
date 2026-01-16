import { OrbitalBody } from '../types/orbital';
import { SunParameters } from '../types/audio';

class BodyServiceError extends Error {
    constructor(message: string, public originalError?: any) {
        super(message);
        this.name = 'BodyServiceError';
    }
}

export class BodyService {
    private baseUrl: string = '/api/bodies';

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            let errorMessage = 'An error occurred while communicating with the body service.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // Response might not be JSON
            }
            throw new BodyServiceError(errorMessage);
        }
        return response.json();
    }

    private handleError(error: any): never {
        console.error('[BodyService Error]:', error);
        if (error instanceof BodyServiceError) {
            throw error;
        }
        throw new BodyServiceError('Network or server error. Please try again later.', error);
    }

    async getBodies(): Promise<OrbitalBody[]> {
        try {
            const response = await fetch(this.baseUrl);
            const bodies = await this.handleResponse<any[]>(response);

            // Map backend response to Frontend OrbitalBody
            return bodies.map(b => ({
                id: b.id,
                presetId: b.preset_id,
                type: b.type,
                position: b.position,
                velocity: b.velocity,
                audioParams: b.audio_params, // backend uses snake_case in dict? No, we defined it as audio_params in Pydantic but the dict content assumes matching frontend keys? 
                // Wait, backend model has 'audio_params' field. content is Dict.
                audioLayerId: `layer-${b.id}`, // specific to frontend runtime
                visualConfig: {
                    color: b.type === 'sun' ? '#FFD700' : b.type === 'planet' ? '#4169E1' : '#32CD32', // Default colors, should probably derive from type better
                    size: b.type === 'sun' ? 50 : b.type === 'planet' ? 20 : 10,
                    shaderUniforms: {}
                },
                attributes: b.attributes,
                parentId: b.parent_id
            }));
        } catch (error) {
            this.handleError(error);
        }
    }

    async createBody(body: Partial<OrbitalBody>): Promise<OrbitalBody> {
        try {
            // Map Frontend -> Backend
            const payload = {
                id: body.id,
                preset_id: body.presetId,
                type: body.type,
                position: body.position,
                velocity: body.velocity,
                audio_params: body.audioParams,
                attributes: body.attributes || [],
                parent_id: body.parentId
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const b = await this.handleResponse<any>(response);

            return {
                ...body,
                id: b.id,
                // Ensure we respect server returned values
                position: b.position,
                velocity: b.velocity,
                audioParams: b.audio_params
            } as OrbitalBody;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateBody(id: string, params: Partial<SunParameters>): Promise<void> {
        try {
            const payload = {
                audio_params: params
            };

            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            await this.handleResponse(response);
        } catch (error) {
            this.handleError(error);
        }
    }

    async deleteBody(id: string): Promise<void> {
        try {
            await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
        } catch (error) {
            this.handleError(error);
        }
    }

    async addAttribute(bodyId: string, attribute: Record<string, any>): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/${bodyId}/attributes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attribute)
            });
            await this.handleResponse(response);
        } catch (error) {
            this.handleError(error);
        }
    }
}

export const bodyService = new BodyService();
