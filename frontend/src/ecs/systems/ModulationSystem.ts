import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { ModulationComponent } from '../components/ModulationComponent';
import { AudioComponent } from '../components/AudioComponent';
import { PositionComponent } from '../components/PositionComponent';
import { World } from '../World';
import { SunParameters } from '../../types/audio';
import { EventBus } from '../../events/EventBus';
import { SimulationEventType, BodyTriggerFiredEvent } from '../../events/SimulationEvents';

/**
 * ModulationSystem — routes parameter values between entities.
 * Supports LFO (continuous) and ADSR (trigger-based) modulators.
 */
export class ModulationSystem extends System {
    readonly priority = 180;
    readonly requiredComponents = [ComponentType.Modulation, ComponentType.Audio];

    private previousDirtyTargets = new Set<string>();
    private bus = EventBus.getInstance();

    constructor() {
        super();
        this.bus.on<BodyTriggerFiredEvent>(SimulationEventType.BODY_TRIGGER_FIRED, ({ id }: BodyTriggerFiredEvent) => {
            const world = World.getInstance();
            const mod = world.entities.getComponent<ModulationComponent>(id, ComponentType.Modulation);
            if (mod) {
                mod.adsrState.phase = 'attack';
                mod.adsrState.startTime = performance.now() / 1000;
                mod.adsrState.lastTriggerTime = mod.adsrState.startTime;
            }
        });
    }

    update(entityManager: EntityManager, _dt: number): void {
        const world = World.getInstance();
        const modulators = entityManager.query(ComponentType.Modulation, ComponentType.Audio);
        const dirtyTargets = new Set<string>();

        // Find all current targets to reset
        for (const sourceId of modulators) {
            const modComp = entityManager.getComponent<ModulationComponent>(sourceId, ComponentType.Modulation);
            if (modComp) {
                for (const route of modComp.routes) {
                    dirtyTargets.add(route.targetEntityId);
                }
            }
        }

        const allRelevantTargets = new Set([...dirtyTargets, ...this.previousDirtyTargets]);

        for (const targetId of allRelevantTargets) {
            const audioComp = entityManager.getComponent<AudioComponent>(targetId, ComponentType.Audio);
            if (audioComp) {
                audioComp.parameters = { ...audioComp.baseParameters };
                world.audio.markDirty(targetId);
            }
        }

        const now = performance.now() / 1000;

        // Apply modulations
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

                if (route.modType === 'lfo') {
                    if (route.sourceType === 'orbit' && sourcePos) {
                        // Rate is derived from orbital frequency: depth * sin(angle)
                        modulationValue = Math.sin(sourcePos.angle) * route.depth;
                    } else if (route.sourceParam) {
                        const val = (sourceAudio.parameters as any)[route.sourceParam];
                        if (typeof val === 'number') modulationValue = val * route.depth;
                    }
                } else if (route.modType === 'adsr') {
                    modulationValue = this.updateADSR(modComp, sourceAudio.baseParameters, now) * route.depth;
                }

                if (modulationValue !== 0) {
                    this.applyModulation(targetAudio.parameters, route.targetParam, modulationValue);
                }
            }
        }

        this.previousDirtyTargets = dirtyTargets;
    }

    private updateADSR(mod: ModulationComponent, params: Partial<SunParameters>, now: number): number {
        const { attack = 0.1, decay = 0.2, sustain = 0.5, release = 0.5 } = params;
        const state = mod.adsrState;
        const elapsed = now - state.startTime;

        if (state.phase === 'attack') {
            if (elapsed < attack) {
                state.value = elapsed / attack;
            } else {
                state.phase = 'decay';
                state.startTime = now;
                state.value = 1.0;
            }
        } else if (state.phase === 'decay') {
            const decayElapsed = now - state.startTime;
            if (decayElapsed < decay) {
                state.value = 1.0 - (decayElapsed / decay) * (1.0 - sustain);
            } else {
                state.phase = 'sustain';
                state.value = sustain;
            }
        } else if (state.phase === 'sustain') {
            state.value = sustain;
            // Auto-release after 1s for now
            if (now - state.lastTriggerTime > 1.0) {
                state.phase = 'release';
                state.startTime = now;
            }
        } else if (state.phase === 'release') {
            const releaseElapsed = now - state.startTime;
            if (releaseElapsed < release) {
                state.value = sustain * (1.0 - releaseElapsed / release);
            } else {
                state.phase = 'idle';
                state.value = 0;
            }
        }

        return state.value;
    }

    private applyModulation(params: Partial<SunParameters>, targetParam: keyof SunParameters, amount: number): void {
        const baseVal = (params as any)[targetParam];
        if (typeof baseVal !== 'number') return;

        switch (targetParam) {
            case 'filterCutoff':
                // Modulate cutoff frequency exponentially (up to 4 octaves)
                (params as any)[targetParam] = baseVal * Math.pow(2, amount * 4);
                (params as any)[targetParam] = Math.max(20, Math.min(20000, (params as any)[targetParam]));
                break;
            case 'rootFrequency':
                // Modulate root frequency exponentially (up to 2 octaves)
                (params as any)[targetParam] = baseVal * Math.pow(2, amount * 2);
                break;
            case 'gainLevel':
                // Modulate gain (+/- 24dB)
                (params as any)[targetParam] = baseVal + amount * 24;
                break;
            default:
                // Linear modulation 50% depth for others
                (params as any)[targetParam] = baseVal + amount * (baseVal * 0.5);
                break;
        }
    }
}
