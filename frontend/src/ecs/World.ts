import { EntityManager } from './EntityManager';
import { System } from './systems/System';
import { MovementSystem } from './systems/MovementSystem';
import { AudioSystem } from './systems/AudioSystem';
import { RenderSystem } from './systems/RenderSystem';

/**
 * World — the root ECS container.
 *
 * Owns the EntityManager and all registered Systems.  Each call to `update(dt)`
 * executes every system in ascending priority order.
 *
 * The singleton is shared across OrbitalBodiesAdapter, usePhysicsLoop, and any
 * future system that needs to query entity state.
 */
export class World {
    private static instance: World;

    readonly entities: EntityManager;
    readonly movement: MovementSystem;
    readonly audio: AudioSystem;
    readonly render: RenderSystem;

    private systems: System[];

    private constructor() {
        this.entities = new EntityManager();
        this.movement = new MovementSystem();
        this.audio = new AudioSystem();
        this.render = new RenderSystem();

        this.systems = [this.movement, this.audio, this.render];
        // Systems are already in priority order; sort defensively for future additions.
        this.systems.sort((a, b) => a.priority - b.priority);
    }

    static getInstance(): World {
        if (!World.instance) {
            World.instance = new World();
        }
        return World.instance;
    }

    /**
     * Register an additional system (e.g., HierarchySystem in Phase 5).
     * Re-sorts by priority after insertion.
     */
    registerSystem(system: System): void {
        this.systems.push(system);
        this.systems.sort((a, b) => a.priority - b.priority);
    }

    /** Advance all systems by `dt` seconds (called once per render frame). */
    update(dt: number): void {
        for (const system of this.systems) {
            system.update(this.entities, dt);
        }
    }
}
