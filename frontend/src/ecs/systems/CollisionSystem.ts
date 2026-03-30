import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { PositionComponent } from '../components/PositionComponent';
import { ColliderComponent } from '../components/ColliderComponent';
import { EventBus } from '../../events/EventBus';
import { SimulationEventType, BodyCollisionEvent } from '../../events/SimulationEvents';

/**
 * CollisionSystem — proximity detection between entities with a ColliderComponent.
 *
 * For each pair of entities:
 * 1. Computes world-space Cartesian distance.
 * 2. If distance < sum of radii, emits a BODY_COLLISION event.
 *
 * Priority 150 — runs after MovementSystem (100) and before AudioSystem (200).
 */
export class CollisionSystem extends System {
    readonly priority = 150;
    readonly requiredComponents = [ComponentType.Position, ComponentType.Collider];

    private bus = EventBus.getInstance();

    update(entityManager: EntityManager, _dt: number): void {
        const ids = entityManager.query(ComponentType.Position, ComponentType.Collider);

        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const idA = ids[i];
                const idB = ids[j];

                const posA = entityManager.getComponent<PositionComponent>(idA, ComponentType.Position);
                const posB = entityManager.getComponent<PositionComponent>(idB, ComponentType.Position);
                const colA = entityManager.getComponent<ColliderComponent>(idA, ComponentType.Collider);
                const colB = entityManager.getComponent<ColliderComponent>(idB, ComponentType.Collider);

                if (!posA || !posB || !colA || !colB) continue;

                // Convert polar to Cartesian
                const x1 = posA.radius * Math.cos(posA.angle);
                const z1 = posA.radius * Math.sin(posA.angle);
                const x2 = posB.radius * Math.cos(posB.angle);
                const z2 = posB.radius * Math.sin(posB.angle);

                const dx = x2 - x1;
                const dz = z2 - z1;
                const distSq = dx * dx + dz * dz;
                const radiusSum = colA.radius + colB.radius;

                if (distSq < radiusSum * radiusSum) {
                    this.bus.emit<BodyCollisionEvent>(SimulationEventType.BODY_COLLISION, {
                        idA,
                        idB,
                        distance: Math.sqrt(distSq),
                    });
                }
            }
        }
    }
}
