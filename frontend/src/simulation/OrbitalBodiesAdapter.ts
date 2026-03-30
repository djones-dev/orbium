import { OrbitalBody } from '../types/orbital';
import { SunParameters } from '../types/audio';
import { World } from '../ecs/World';
import { ComponentType } from '../ecs/components/Component';
import { createPositionComponent, PositionComponent } from '../ecs/components/PositionComponent';
import { createVelocityComponent, VelocityComponent } from '../ecs/components/VelocityComponent';
import { createAudioComponent, AudioComponent } from '../ecs/components/AudioComponent';
import { createVisualComponent, VisualComponent } from '../ecs/components/VisualComponent';
import { createHierarchyComponent, HierarchyComponent } from '../ecs/components/HierarchyComponent';
import { createPresetComponent, PresetComponent } from '../ecs/components/PresetComponent';
import { createPhysicsComponent, PhysicsComponent } from '../ecs/components/PhysicsComponent';

/**
 * OrbitalBodiesAdapter — the bridge between the legacy OrbitalBody API and
 * the ECS World during the migration period (Phases 4–6).
 */
export class OrbitalBodiesAdapter {
    private world: World;

    constructor(world: World) {
        this.world = world;
    }

    /**
     * Create or update ECS entity + components from an OrbitalBody.
     * Idempotent — safe to call on an entity that already exists.
     */
    addEntity(body: OrbitalBody): void {
        const em = this.world.entities;

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
        em.addComponent(body.id, createPresetComponent(body.type, body.presetId));
        em.addComponent(body.id, createPhysicsComponent(1, 0.999));
    }

    /** Remove the entity and all its components from the ECS World. */
    removeEntity(id: string): void {
        this.world.entities.destroyEntity(id);
    }

    /**
     * Update the AudioComponent's parameters in place.
     * Does NOT emit an event — OrbitalBodiesManager handles that directly to
     * avoid double emission during Phase 4.  In Phase 5, modulation systems
     * can call `world.audio.markDirty()` after mutating parameters directly.
     */
    updateAudioParams(id: string, params: Partial<SunParameters>): void {
        const audio = this.world.entities.getComponent<AudioComponent>(id, ComponentType.Audio);
        if (audio) {
            audio.parameters = { ...audio.parameters, ...params };
        }
    }

    /**
     * Reconstruct an OrbitalBody from ECS components.
     * Returns `undefined` if the entity or any required component is missing.
     *
     * Used in Phase 7 to replace the OrbitalBody[] array entirely.
     */
    toOrbitalBody(id: string): OrbitalBody | undefined {
        const em = this.world.entities;
        if (!em.hasEntity(id)) return undefined;

        const pos = em.getComponent<PositionComponent>(id, ComponentType.Position);
        const vel = em.getComponent<VelocityComponent>(id, ComponentType.Velocity);
        const audio = em.getComponent<AudioComponent>(id, ComponentType.Audio);
        const visual = em.getComponent<VisualComponent>(id, ComponentType.Visual);
        const hierarchy = em.getComponent<HierarchyComponent>(id, ComponentType.Hierarchy);
        const preset = em.getComponent<PresetComponent>(id, ComponentType.Preset);

        if (!pos || !vel || !audio || !visual) return undefined;

        return {
            id,
            type: preset?.bodyType ?? 'planet',
            position: { radius: pos.radius, angle: pos.angle },
            velocity: vel.angular,
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
