import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { ModulationComponent } from '../components/ModulationComponent';
import { AudioComponent } from '../components/AudioComponent';
import { World } from '../World';
import { SunParameters } from '../../types/audio';

/**
 * ModulationSystem — routes parameter values between entities.
 *
 * For each modulation route:
 * 1. Reads source parameter value from source entity's AudioComponent.
 * 2. Scales value by depth (if numeric).
 * 3. Writes result to target entity's AudioComponent.parameters.
 * 4. Marks the target entity as dirty in AudioSystem to trigger update.
 *
 * Priority 180 — runs after MovementSystem (100) and before AudioSystem (200).
 */
export class ModulationSystem extends System {
    readonly priority = 180;
    readonly requiredComponents = [ComponentType.Modulation, ComponentType.Audio];

    update(entityManager: EntityManager, _dt: number): void {
        const world = World.getInstance();

        for (const id of entityManager.query(ComponentType.Modulation, ComponentType.Audio)) {
            const modComp = entityManager.getComponent<ModulationComponent>(id, ComponentType.Modulation);
            const audioComp = entityManager.getComponent<AudioComponent>(id, ComponentType.Audio);
            if (!modComp || !audioComp) continue;

            for (const route of modComp.routes) {
                const sourceVal = audioComp.parameters[route.sourceParam];
                if (sourceVal === undefined) continue;

                const targetAudio = entityManager.getComponent<AudioComponent>(
                    route.targetEntityId,
                    ComponentType.Audio
                );
                if (!targetAudio) continue;

                // Only modulate numeric parameters
                if (typeof sourceVal === 'number') {
                    const modulatedValue = sourceVal * route.depth;
                    
                    // We need to type-cast to any to write to a dynamic key of SunParameters
                    (targetAudio.parameters as any)[route.targetParam] = modulatedValue;

                    // Notify AudioSystem that this entity has changed
                    world.audio.markDirty(route.targetEntityId);
                }
            }
        }
    }
}
