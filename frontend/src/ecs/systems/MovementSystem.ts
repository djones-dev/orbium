import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { PositionComponent } from '../components/PositionComponent';
import { PhysicsSystem } from '../../simulation/PhysicsSystem';

/**
 * MovementSystem — syncs the ECS PositionComponent with the authoritative
 * positions held by PhysicsSystem after each fixed-timestep integration.
 *
 * This keeps ECS position data current so other systems (AudioSystem,
 * RenderSystem) can query it without depending on PhysicsSystem directly.
 *
 * Priority 100 — runs before AudioSystem (200) and RenderSystem (300).
 */
export class MovementSystem extends System {
    readonly priority = 100;
    readonly requiredComponents = [ComponentType.Position, ComponentType.Velocity];

    update(entityManager: EntityManager, _dt: number): void {
        const physics = PhysicsSystem.getInstance();

        for (const id of entityManager.query(ComponentType.Position, ComponentType.Velocity)) {
            const simPos = physics.getPosition(id);
            if (!simPos) continue;

            const pos = entityManager.getComponent<PositionComponent>(id, ComponentType.Position);
            if (pos) {
                pos.radius = simPos.radius;
                pos.angle = simPos.angle;
            }
        }
    }
}
