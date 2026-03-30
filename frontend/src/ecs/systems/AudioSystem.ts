import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { AudioComponent } from '../components/AudioComponent';
import { EventBus } from '../../events/EventBus';
import { AudioEventType, ParamsChangedEvent } from '../../events/AudioEvents';

/**
 * AudioSystem — flushes dirty AudioComponent changes to the EventBus so
 * AudioEngine's PARAMS_CHANGED handler can update the corresponding audio layer.
 *
 * Usage: call `markDirty(entityId)` whenever an AudioComponent's parameters
 * are mutated outside of OrbitalBodiesManager (e.g., by future modulation
 * systems in Phase 5).  OrbitalBodiesManager.updateBodyParams() still emits
 * its own event directly and does NOT go through the dirty set.
 *
 * Priority 200 — runs after MovementSystem (100), before RenderSystem (300).
 */
export class AudioSystem extends System {
    readonly priority = 200;
    readonly requiredComponents = [ComponentType.Audio];

    private bus = EventBus.getInstance();
    private dirty = new Set<string>();

    markDirty(entityId: string): void {
        this.dirty.add(entityId);
    }

    private lastEmittedParams = new Map<string, string>();

    update(entityManager: EntityManager, _dt: number): void {
        if (this.dirty.size === 0) return;

        for (const id of this.dirty) {
            if (!entityManager.hasEntity(id)) continue;
            const audio = entityManager.getComponent<AudioComponent>(id, ComponentType.Audio);
            if (audio) {
                // Check if parameters actually changed since last emission
                const paramStr = JSON.stringify(audio.parameters);
                if (this.lastEmittedParams.get(id) === paramStr) continue;

                this.bus.emit<ParamsChangedEvent>(AudioEventType.PARAMS_CHANGED, {
                    id,
                    params: audio.parameters,
                });
                this.lastEmittedParams.set(id, paramStr);
            }
        }
        this.dirty.clear();
    }
}
