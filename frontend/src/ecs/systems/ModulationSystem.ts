import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { ModulationComponent } from '../components/ModulationComponent';
import { AudioComponent } from '../components/AudioComponent';
import { PositionComponent } from '../components/PositionComponent';
import { World } from '../World';
import { SunParameters } from '../../types/audio';

/**
 * ModulationSystem — routes parameter values between entities.
 *
 * It uses a multi-pass approach:
 * 1. Resets the final 'parameters' of all entities to their 'baseParameters'.
 * 2. Applies modulations from all source entities to their respective targets.
 * 3. Marks target entities as dirty in AudioSystem to trigger engine updates.
 *
 * Priority 180 — runs after MovementSystem (100) and before AudioSystem (200).
 */
export class ModulationSystem extends System {
    readonly priority = 180;
    readonly requiredComponents = [ComponentType.Modulation, ComponentType.Audio];

    private previousDirtyTargets = new Set<string>();

    update(entityManager: EntityManager, _dt: number): void {
        const world = World.getInstance();
        const modulators = entityManager.query(ComponentType.Modulation, ComponentType.Audio);
        const dirtyTargets = new Set<string>();

        // Pass 1: For all entities that were modulated last frame or will be modulated this frame,
        // reset parameters to base values.
        
        // First, find all current targets
        for (const sourceId of modulators) {
            const modComp = entityManager.getComponent<ModulationComponent>(sourceId, ComponentType.Modulation);
            if (modComp) {
                for (const route of modComp.routes) {
                    dirtyTargets.add(route.targetEntityId);
                }
            }
        }

        // Combine with previous targets to ensure clean state for those no longer modulated
        const allRelevantTargets = new Set([...dirtyTargets, ...this.previousDirtyTargets]);

        for (const targetId of allRelevantTargets) {
            const audioComp = entityManager.getComponent<AudioComponent>(targetId, ComponentType.Audio);
            if (audioComp) {
                audioComp.parameters = { ...audioComp.baseParameters };
                // We always mark these as dirty because their parameters either ARE changing
                // or just CHANGED back to base.
                world.audio.markDirty(targetId);
            }
        }

        // Pass 2: Apply modulations.
        for (const sourceId of modulators) {
            const modComp = entityManager.getComponent<ModulationComponent>(sourceId, ComponentType.Modulation);
            const sourceAudio = entityManager.getComponent<AudioComponent>(sourceId, ComponentType.Audio);
            const sourcePos = entityManager.getComponent<PositionComponent>(sourceId, ComponentType.Position);
            
            if (!modComp || !sourceAudio) continue;

            for (const route of modComp.routes) {
                const targetAudio = entityManager.getComponent<AudioComponent>(
                    route.targetEntityId,
                    ComponentType.Audio
                );
                if (!targetAudio) continue;

                let modulationValue = 0;

                if (route.sourceType === 'orbit' && sourcePos) {
                    // Use sine of orbital angle as a -1 to 1 oscillator
                    modulationValue = Math.sin(sourcePos.angle) * route.depth;
                } else if (route.sourceType === 'parameter' && route.sourceParam) {
                    const val = (sourceAudio.parameters as any)[route.sourceParam];
                    if (typeof val === 'number') {
                        modulationValue = val * route.depth;
                    }
                }

                if (modulationValue !== 0) {
                    this.applyModulation(targetAudio.parameters, route.targetParam, modulationValue);
                }
            }
        }

        // Store for next frame
        this.previousDirtyTargets = dirtyTargets;
    }

    private applyModulation(params: Partial<SunParameters>, targetParam: keyof SunParameters, amount: number): void {
        const baseVal = params[targetParam];
        if (typeof baseVal !== 'number') return;

        switch (targetParam) {
            case 'filterCutoff':
                // Modulate cutoff frequency exponentially (up to 3 octaves)
                (params as any)[targetParam] = baseVal * Math.pow(2, amount * 3);
                // Clamp to audible range
                (params as any)[targetParam] = Math.max(20, Math.min(20000, (params as any)[targetParam]));
                break;
            case 'rootFrequency':
                // Modulate root frequency exponentially (up to 1 octave)
                (params as any)[targetParam] = baseVal * Math.pow(2, amount);
                break;
            case 'gainLevel':
                // Modulate gain additively in dB (+/- 12dB)
                (params as any)[targetParam] = baseVal + amount * 12;
                break;
            case 'detuneSpread':
            case 'lfoRate':
            case 'distortion':
            case 'filterResonance':
                // Linear modulation for other numeric params
                (params as any)[targetParam] = baseVal + amount * (baseVal * 0.5);
                break;
            default:
                // No-op for non-numeric or non-modulatable params
                break;
        }
    }
}
