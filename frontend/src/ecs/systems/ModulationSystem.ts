import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { ModulationComponent } from '../components/ModulationComponent';
import { AudioComponent } from '../components/AudioComponent';
import { PositionComponent } from '../components/PositionComponent';
import { World } from '../World';
import { AudioParams } from '../../types/audio';
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

    private updateADSR(mod: ModulationComponent, params: Partial<AudioParams>, now: number): number {
        const envelopeParams = params.envelope ?? { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.5 };
        const { attack = 0.1, decay = 0.2, sustain = 0.5, release = 0.5 } = envelopeParams;
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

    private applyModulation(params: Partial<AudioParams>, targetPath: string, amount: number): void {
        // targetPath can be dot-separated like "filter.filterCutoff" or just "gainLevel"
        const parts = targetPath.split('.');
        let obj: any = params;

        // Navigate to the parent object
        for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) obj[parts[i]] = {};
            obj = obj[parts[i]];
        }

        const key = parts[parts.length - 1];
        const baseVal = obj[key];
        if (typeof baseVal !== 'number') return;

        // Apply modulation based on the parameter type
        if (targetPath.includes('filterCutoff')) {
            // Exponential for frequency (up to 4 octaves)
            obj[key] = baseVal * Math.pow(2, amount * 4);
            obj[key] = Math.max(20, Math.min(20000, obj[key]));
        } else if (targetPath.includes('rootFrequency')) {
            // Exponential for frequency (up to 2 octaves)
            obj[key] = baseVal * Math.pow(2, amount * 2);
        } else if (targetPath.includes('gainLevel')) {
            // Linear for gain (+/- 24dB)
            obj[key] = baseVal + amount * 24;
        } else {
            // Linear for others (50% depth)
            obj[key] = baseVal + amount * (baseVal * 0.5);
        }
    }
}
