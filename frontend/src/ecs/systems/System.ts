import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';

/**
 * Base class for all ECS systems.
 *
 * Systems contain only behaviour — no mutable state beyond caches.
 * They read component data from EntityManager and produce side effects
 * (events, PhysicsSystem calls, render cache updates).
 *
 * Execution order is determined by `priority` (lower = earlier).
 */
export abstract class System {
    /** Execution order — lower numbers run first. */
    abstract readonly priority: number;

    /**
     * Hint to the World about which component types this system needs.
     * Not enforced at runtime in Phase 4; used for documentation and
     * future archetype optimisation.
     */
    abstract readonly requiredComponents: ComponentType[];

    abstract update(entityManager: EntityManager, dt: number): void;
}
