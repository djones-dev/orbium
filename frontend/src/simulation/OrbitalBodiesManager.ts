import { OrbitalBody } from '../types/orbital';
import { SunParameters } from '../types/audio';
import { bodyService } from '../services/BodyService';


export class OrbitalBodiesManager {
    private bodies: OrbitalBody[] = [];
    private onParamsChange?: (id: string, params: Partial<SunParameters>) => void;
    private onBodyAdded?: (body: OrbitalBody) => void;
    private onBodyRemoved?: (id: string) => void;
    private listeners = new Set<() => void>();

    constructor(
        onParamsChange?: (id: string, params: Partial<SunParameters>) => void,
        onBodyAdded?: (body: OrbitalBody) => void,
        onBodyRemoved?: (id: string) => void
    ) {
        this.onParamsChange = onParamsChange;
        this.onBodyAdded = onBodyAdded;
        this.onBodyRemoved = onBodyRemoved;
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    async loadFromBackend(): Promise<void> {
        try {
            const savedBodies = await bodyService.getBodies();

            // Preserve local-only bodies (like the Sun)
            // Strategy: Keep bodies that aren't in the saved list (by ID check? Or type check? 
            // Sun is special. Let's keep 'sun-primary' explicitly.)
            const localBodies = this.bodies.filter(b => b.id === 'sun-primary');

            // Merge: Sun First, then others
            // Note: If backend saves the sun later, we might overlap. 
            // Current assumption: Backend only stores planets/instances. 
            this.bodies = [...localBodies, ...savedBodies];

            this.notify();
        } catch (error) {
            console.error("Failed to load bodies from backend:", error);
            // Optionally initialize with empty or retry logic
        }
    }

    async addBody(body: OrbitalBody, sync: boolean = true): Promise<void> {
        this.bodies.push(body);
        this.onBodyAdded?.(body);
        this.notify();
        if (sync) {
            try {
                const savedBody = await bodyService.createBody(body);
                // Update local body with server data (id, timestamps)
                const index = this.bodies.findIndex(b => b.id === body.id);
                if (index !== -1) {
                    this.bodies[index] = savedBody;
                }
            } catch (error) {
                console.error("Failed to sync body creation:", error);
                this.removeBody(body.id, false); // Revert local add
                throw error;
            }
        }
    }

    async removeBody(id: string, sync: boolean = true): Promise<void> {
        this.bodies = this.bodies.filter(b => b.id !== id);
        this.onBodyRemoved?.(id);
        this.notify();
        if (sync) {
            try {
                await bodyService.deleteBody(id);
            } catch (error) {
                console.error("Failed to sync body deletion:", error);
                // We don't revert deletion because the body is already gone from UI
            }
        }
    }

    getBodyById(id: string): OrbitalBody | undefined {
        return this.bodies.find(b => b.id === id);
    }

    getBodies(): OrbitalBody[] {
        return this.bodies;
    }

    async updateBodyParams(id: string, params: Partial<SunParameters>, sync: boolean = true): Promise<void> {
        const body = this.getBodyById(id);
        if (body) {
            body.audioParams = { ...body.audioParams, ...params };
            if (this.onParamsChange) {
                this.onParamsChange(id, params);
            }

            if (sync) {
                try {
                    await bodyService.updateBody(id, params);
                } catch (error) {
                    console.error("Failed to sync body update:", error);
                }
            }
        }
    }

    async addAttribute(bodyId: string, attributePresetId: string): Promise<void> {
        // Placeholder for now, or calling service
        const body = this.getBodyById(bodyId);
        if (body) {
            // Logic to load attribute preset details would likely be needed here
            // For now we just sync the ID as requested
            try {
                await bodyService.addAttribute(bodyId, { preset_id: attributePresetId });
            } catch (error) {
                console.error("Failed to add attribute:", error);
            }
        }
    }
}
