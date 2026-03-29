import { OrbitalBody } from '../types/orbital';
import { SunParameters } from '../types/audio';
import { bodyService } from '../services/BodyService';
import { EventBus } from '../events/EventBus';
import {
    AudioEventType,
    BodyAddedEvent,
    BodyRemovedEvent,
    ParamsChangedEvent,
} from '../events/AudioEvents';
import { SimulationEventType, BodiesLoadedEvent } from '../events/SimulationEvents';

export class OrbitalBodiesManager {
    private bodies: OrbitalBody[] = [];
    private listeners = new Set<() => void>();
    private bus = EventBus.getInstance();

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(l => l());
    }

    async loadFromBackend(): Promise<void> {
        try {
            const savedBodies = await bodyService.getBodies();
            const localBodies = this.bodies.filter(b => b.id === 'sun-primary');
            this.bodies = [...localBodies, ...savedBodies];
            this.notify();
            this.bus.emit<BodiesLoadedEvent>(SimulationEventType.BODIES_LOADED, {
                count: this.bodies.length,
            });
        } catch (error) {
            console.error('Failed to load bodies from backend:', error);
        }
    }

    async addBody(body: OrbitalBody, sync: boolean = true): Promise<void> {
        this.bodies.push(body);
        this.bus.emit<BodyAddedEvent>(AudioEventType.BODY_ADDED, { body });
        this.notify();

        if (sync) {
            try {
                const savedBody = await bodyService.createBody(body);
                const index = this.bodies.findIndex(b => b.id === body.id);
                if (index !== -1) {
                    this.bodies[index] = savedBody;
                }
            } catch (error) {
                console.error('Failed to sync body creation:', error);
                this.removeBody(body.id, false);
                throw error;
            }
        }
    }

    async removeBody(id: string, sync: boolean = true): Promise<void> {
        this.bodies = this.bodies.filter(b => b.id !== id);
        this.bus.emit<BodyRemovedEvent>(AudioEventType.BODY_REMOVED, { id });
        this.notify();

        if (sync) {
            try {
                await bodyService.deleteBody(id);
            } catch (error) {
                console.error('Failed to sync body deletion:', error);
            }
        }
    }

    async updateBodyParams(
        id: string,
        params: Partial<SunParameters>,
        sync: boolean = true,
    ): Promise<void> {
        const body = this.getBodyById(id);
        if (!body) return;

        body.audioParams = { ...body.audioParams, ...params };
        this.bus.emit<ParamsChangedEvent>(AudioEventType.PARAMS_CHANGED, { id, params });

        if (sync) {
            try {
                await bodyService.updateBody(id, params);
            } catch (error) {
                console.error('Failed to sync body update:', error);
            }
        }
    }

    async addAttribute(bodyId: string, attributePresetId: string): Promise<void> {
        const body = this.getBodyById(bodyId);
        if (!body) return;
        try {
            await bodyService.addAttribute(bodyId, { preset_id: attributePresetId });
        } catch (error) {
            console.error('Failed to add attribute:', error);
        }
    }

    getBodyById(id: string): OrbitalBody | undefined {
        return this.bodies.find(b => b.id === id);
    }

    getBodies(): OrbitalBody[] {
        return this.bodies;
    }
}
