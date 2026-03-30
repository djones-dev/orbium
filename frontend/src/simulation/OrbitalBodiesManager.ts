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
import { World } from '../ecs/World';
import { ComponentType } from '../ecs/components/Component';
import { createPositionComponent, PositionComponent } from '../ecs/components/PositionComponent';
import { createVelocityComponent, VelocityComponent } from '../ecs/components/VelocityComponent';
import { createAudioComponent, AudioComponent } from '../ecs/components/AudioComponent';
import { createVisualComponent, VisualComponent } from '../ecs/components/VisualComponent';
import { createHierarchyComponent, HierarchyComponent } from '../ecs/components/HierarchyComponent';
import { createPresetComponent, PresetComponent } from '../ecs/components/PresetComponent';
import { createPhysicsComponent } from '../ecs/components/PhysicsComponent';
import { createColliderComponent } from '../ecs/components/ColliderComponent';
import { createMetadataComponent, MetadataComponent } from '../ecs/components/MetadataComponent';
import { logger } from '../utils/logger';

export class OrbitalBodiesManager {
    private listeners = new Set<() => void>();
    private bus = EventBus.getInstance();

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(l => l());
    }

    async loadFromBackend(
        enrichBody?: (body: OrbitalBody) => void
    ): Promise<void> {
        try {
            const savedBodies = await bodyService.getBodies();

            for (const body of savedBodies) {
                // Allow caller to enrich body (e.g. derive presetType/color from preset cache)
                enrichBody?.(body);
                this.addEntityToECS(body);
                // Emit BODY_ADDED so PhysicsSystem registers the body (rotation)
                // and AudioEngine creates an audio layer (sound)
                this.bus.emit<BodyAddedEvent>(AudioEventType.BODY_ADDED, { body });
            }

            this.notify();
            this.bus.emit<BodiesLoadedEvent>(SimulationEventType.BODIES_LOADED, {
                count: savedBodies.length,
            });
        } catch (error) {
            logger.error('Failed to load bodies from backend:', error);
        }
    }

    async resetScene(): Promise<void> {
        const world = World.getInstance();
        const ids = world.entities.query(ComponentType.Position);

        for (const id of ids) {
            if (id === 'sun-primary') continue;
            this.removeEntityFromECS(id);
            this.bus.emit<BodyRemovedEvent>(AudioEventType.BODY_REMOVED, { id });
        }

        this.notify();

        try {
            await bodyService.clearAllBodies();
        } catch (error) {
            logger.error('Failed to clear bodies from backend:', error);
        }
    }

    async addBody(body: OrbitalBody, sync: boolean = true): Promise<void> {
        this.addEntityToECS(body);
        this.bus.emit<BodyAddedEvent>(AudioEventType.BODY_ADDED, { body });
        this.notify();

        if (sync && body.id !== 'sun-primary') {
            try {
                await bodyService.createBody(body);
            } catch (error) {
                logger.error('Failed to sync body creation:', error);
                this.removeBody(body.id, false);
                throw error;
            }
        }
    }

    async removeBody(id: string, sync: boolean = true): Promise<void> {
        this.removeEntityFromECS(id);
        this.bus.emit<BodyRemovedEvent>(AudioEventType.BODY_REMOVED, { id });
        this.notify();

        if (sync && id !== 'sun-primary') {
            try {
                await bodyService.deleteBody(id);
            } catch (error) {
                logger.error('Failed to sync body deletion:', error);
            }
        }
    }

    async updateBodyParams(
        id: string,
        params: Partial<SunParameters>,
        sync: boolean = true,
    ): Promise<void> {
        const audio = World.getInstance().entities.getComponent<AudioComponent>(id, ComponentType.Audio);
        if (!audio) return;

        audio.parameters = { ...audio.parameters, ...params };
        this.bus.emit<ParamsChangedEvent>(AudioEventType.PARAMS_CHANGED, { id, params });
        this.notify();

        if (sync && id !== 'sun-primary') {
            try {
                await bodyService.updateBody(id, { audioParams: params });
            } catch (error) {
                logger.error('Failed to sync body update:', error);
            }
        }
    }

    async updateBodyName(id: string, name: string, sync: boolean = true): Promise<void> {
        const em = World.getInstance().entities;
        const metadata = em.getComponent<MetadataComponent>(id, ComponentType.Metadata);
        if (!metadata) {
            em.addComponent(id, createMetadataComponent(name));
        } else {
            metadata.name = name;
        }

        this.notify();

        if (sync && id !== 'sun-primary') {
            try {
                await bodyService.updateBody(id, { name });
            } catch (error) {
                logger.error('Failed to sync body name update:', error);
            }
        }
    }

    async addAttribute(bodyId: string, attributePresetId: string): Promise<void> {
        try {
            await bodyService.addAttribute(bodyId, { preset_id: attributePresetId });
        } catch (error) {
            logger.error('Failed to add attribute:', error);
        }
    }

    getBodyById(id: string): OrbitalBody | undefined {
        return this.toOrbitalBody(id);
    }

    getBodies(): OrbitalBody[] {
        const world = World.getInstance();
        const ids = world.entities.query(ComponentType.Position, ComponentType.Audio);
        return ids.map(id => this.toOrbitalBody(id)).filter((b): b is OrbitalBody => b !== undefined);
    }

    // --- ECS Bridge Methods (Inlined from Adapter) ---

    private addEntityToECS(body: OrbitalBody): void {
        const em = World.getInstance().entities;

        if (!em.hasEntity(body.id)) {
            em.createEntity(body.id);
        }

        em.addComponent(body.id, createPositionComponent(body.position.radius, body.position.angle));
        em.addComponent(body.id, createVelocityComponent(body.velocity ?? 0));
        em.addComponent(body.id, createAudioComponent(body.audioLayerId, body.audioParams));
        em.addComponent(
            body.id,
            createVisualComponent(
                body.visualConfig.color,
                body.visualConfig.size,
                body.visualConfig.shaderUniforms as Record<string, unknown>,
            ),
        );
        em.addComponent(body.id, createHierarchyComponent(body.parentId ?? null));
        em.addComponent(body.id, createPresetComponent(body.type, body.presetId, body.presetType));
        em.addComponent(body.id, createPhysicsComponent(1, 0.999));
        em.addComponent(body.id, createColliderComponent(body.visualConfig.size));
        
        if (body.name) {
            em.addComponent(body.id, createMetadataComponent(body.name));
        }
    }

    private removeEntityFromECS(id: string): void {
        World.getInstance().entities.destroyEntity(id);
    }

    private toOrbitalBody(id: string): OrbitalBody | undefined {
        const em = World.getInstance().entities;
        if (!em.hasEntity(id)) return undefined;

        const pos = em.getComponent<PositionComponent>(id, ComponentType.Position);
        const vel = em.getComponent<VelocityComponent>(id, ComponentType.Velocity);
        const audio = em.getComponent<AudioComponent>(id, ComponentType.Audio);
        const visual = em.getComponent<VisualComponent>(id, ComponentType.Visual);
        const hierarchy = em.getComponent<HierarchyComponent>(id, ComponentType.Hierarchy);
        const preset = em.getComponent<PresetComponent>(id, ComponentType.Preset);
        const metadata = em.getComponent<MetadataComponent>(id, ComponentType.Metadata);

        if (!pos || !audio || !visual) return undefined;

        return {
            id,
            name: metadata?.name,
            type: preset?.bodyType ?? (id === 'sun-primary' ? 'sun' : 'planet'),
            position: { radius: pos.radius, angle: pos.angle },
            velocity: vel?.angular ?? 0,
            audioParams: audio.parameters,
            audioLayerId: audio.layerId,
            visualConfig: {
                color: visual.color,
                size: visual.size,
                shaderUniforms: visual.shaderUniforms as Record<string, unknown>,
            },
            presetId: preset?.presetId,
            parentId: hierarchy?.parentId ?? undefined,
        };
    }
}
