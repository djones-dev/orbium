import { OrbitalBody } from '../types/orbital';
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
import { createModulationComponent, ModulationRoute, ModulationComponent } from '../ecs/components/ModulationComponent';
import { createEffectComponent, EffectComponent, EffectInstance } from '../ecs/components/EffectComponent';
import { createPhenomenaComponent } from '../ecs/components/PhenomenaComponent';
import { NoteEvent } from '../events/NoteEvents';
import { cometModifier, pulsarModifier, lagrangeModifier } from '../ecs/systems/phenomena-modifiers';
import { logger } from '../utils/logger';
import { EffectType, AudioParams } from '../types/audio';
import { AudioEngine } from '../audio/AudioEngine';

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
        params: Partial<AudioParams>,
        sync: boolean = true,
    ): Promise<void> {
        const em = World.getInstance().entities;
        const audio = em.getComponent<AudioComponent>(id, ComponentType.Audio);
        if (!audio) return;

        audio.baseParameters = { ...audio.baseParameters, ...params };
        // ModulationSystem will reconcile these into .parameters every frame.
        // For immediate feedback and non-modulated entities:
        audio.parameters = { ...audio.parameters, ...params };

        // If modTarget, modDepth, or modType changed, update ModulationComponent routes
        if (params.modTarget !== undefined || params.modDepth !== undefined || params.modType !== undefined) {
            let modComp = em.getComponent<ModulationComponent>(id, ComponentType.Modulation);
            const hierarchy = em.getComponent<HierarchyComponent>(id, ComponentType.Hierarchy);
            const preset = em.getComponent<PresetComponent>(id, ComponentType.Preset);
            
            if (hierarchy?.parentId && (preset?.bodyType === 'moon' || id.startsWith('moon-'))) {
                const target = params.modTarget ?? audio.baseParameters.modTarget;
                const depth = params.modDepth ?? audio.baseParameters.modDepth;
                const modType = params.modType ?? audio.baseParameters.modType ?? 'lfo';
                
                if (target && depth !== undefined) {
                    const routes: ModulationRoute[] = [{
                        sourceType: 'orbit',
                        modType,
                        targetEntityId: hierarchy.parentId,
                        targetParam: target as string, // dot-path like "filter.filterCutoff"
                        depth: depth / 100,
                    }];

                    if (!modComp) {
                        em.addComponent(id, createModulationComponent(routes));
                    } else {
                        modComp.routes = routes;
                    }
                }
            }
        }

        this.bus.emit<ParamsChangedEvent>(AudioEventType.PARAMS_CHANGED, { id, params });
        this.notify();

        // If effects changed in params, update EffectComponent
        if (params.effects !== undefined) {
            let effectComp = em.getComponent<EffectComponent>(id, ComponentType.Effect);
            if (!effectComp) {
                effectComp = createEffectComponent();
                em.addComponent(id, effectComp);
            }
            effectComp.effects = params.effects.map(type => ({ type, intensity: 1.0 }));
        }

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
        const em = World.getInstance().entities;
        const audio = em.getComponent<AudioComponent>(bodyId, ComponentType.Audio);
        if (!audio) return;

        try {
            // Get preset to know what kind of effect it is
            const preset = await AudioEngine.getInstance().presets.getPresetById(attributePresetId);
            if (!preset) return;

            const name = preset.name.toLowerCase();
            const effectType = (name.includes('phaser')) ? 'phaser' 
                             : (name.includes('reverb')) ? 'reverb'
                             : (name.includes('sweep') || name.includes('atmosphere')) ? 'atmosphere'
                             : 'reverb' as EffectType;

            const currentEffects = audio.baseParameters.effects || [];
            if (!currentEffects.includes(effectType)) {
                const newEffects = [...currentEffects, effectType];
                await this.updateBodyParams(bodyId, { effects: newEffects });
            }

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

        // Add Effect component
        const initialEffects: EffectInstance[] = (body.audioParams.effects || []).map(type => ({ type, intensity: 1.0 }));
        em.addComponent(body.id, createEffectComponent(initialEffects));

        // Add modulation if this is a moon (modulator/effect) and has a parent
        if (body.type === 'moon' && body.parentId) {
            const routes: ModulationRoute[] = [];

            // If it has modDepth and modTarget, it's a dynamic modulator
            if (body.audioParams.modDepth !== undefined && body.audioParams.modTarget) {
                routes.push({
                    sourceType: 'orbit',
                    modType: body.audioParams.modType ?? 'lfo',
                    targetEntityId: body.parentId,
                    targetParam: body.audioParams.modTarget as string, // dot-path like "filter.filterCutoff"
                    depth: body.audioParams.modDepth / 100, // normalized 0-1
                });
            } else if (body.presetType === 'modulator') {
                // Fallback: default modulation for these types if not explicitly configured
                routes.push({
                    sourceType: 'orbit',
                    modType: 'lfo',
                    targetEntityId: body.parentId,
                    targetParam: 'filter.filterCutoff', // dot-path
                    depth: 0.3,
                });
            }

            if (routes.length > 0) {
                em.addComponent(body.id, createModulationComponent(routes));
            }
        }
        
        if (body.name) {
            em.addComponent(body.id, createMetadataComponent(body.name));
        }

        if (body.type === 'phenomenon') {
            const { phenomenonType, zone, properties } = body.audioParams as any;
            let modifier;

            switch (phenomenonType) {
                case 'comet':
                    modifier = cometModifier(body.id);
                    break;
                case 'pulsar':
                    modifier = pulsarModifier(body.id);
                    break;
                case 'lagrange_point':
                    modifier = lagrangeModifier(body.id);
                    break;
                default:
                    modifier = (note: NoteEvent) => note;
            }

            em.addComponent(body.id, createPhenomenaComponent(
                phenomenonType,
                zone ?? {},
                modifier,
                properties ?? {},
            ));
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

        const effectComp = em.getComponent<EffectComponent>(id, ComponentType.Effect);
        const audioParams = { ...audio.baseParameters };
        if (effectComp) {
            audioParams.effects = effectComp.effects.map(e => e.type);
        }

        return {
            id,
            name: metadata?.name,
            type: preset?.bodyType ?? (id === 'sun-primary' ? 'sun' : 'planet'),
            position: { radius: pos.radius, angle: pos.angle },
            velocity: vel?.angular ?? 0,
            audioParams,
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