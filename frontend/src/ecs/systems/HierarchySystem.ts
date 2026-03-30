import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { PositionComponent } from '../components/PositionComponent';
import { HierarchyComponent } from '../components/HierarchyComponent';
import { PhysicsSystem } from '../../simulation/PhysicsSystem';

/**
 * HierarchySystem — computes world-space positions for entities with parents.
 *
 * For a child entity, its world-space position is its parent's world-space
 * position plus its own local (relative) position.
 *
 * Priority 50 — runs before MovementSystem (100).
 */
export class HierarchySystem extends System {
    readonly priority = 150; // must run after MovementSystem (100) so parent positions are current
    readonly requiredComponents = [ComponentType.Hierarchy, ComponentType.Position];

    update(entityManager: EntityManager, _dt: number): void {
        const physics = PhysicsSystem.getInstance();

        for (const id of entityManager.query(ComponentType.Hierarchy, ComponentType.Position)) {
            const hierarchy = entityManager.getComponent<HierarchyComponent>(id, ComponentType.Hierarchy);
            if (!hierarchy || !hierarchy.parentId) continue;

            // Get parent's world position
            const parentPos = entityManager.getComponent<PositionComponent>(
                hierarchy.parentId,
                ComponentType.Position
            );
            if (!parentPos) continue;

            // Get child's local position from PhysicsSystem
            const localSimPos = physics.getPosition(id);
            if (!localSimPos) continue;

            const childPos = entityManager.getComponent<PositionComponent>(id, ComponentType.Position);
            if (!childPos) continue;

            // Convert parent polar to Cartesian
            const px = parentPos.radius * Math.cos(parentPos.angle);
            const pz = parentPos.radius * Math.sin(parentPos.angle);

            // Convert child local polar to Cartesian
            const lx = localSimPos.radius * Math.cos(localSimPos.angle);
            const lz = localSimPos.radius * Math.sin(localSimPos.angle);

            // World Cartesian
            const wx = px + lx;
            const wz = pz + lz;

            // Convert back to world polar
            childPos.radius = Math.sqrt(wx * wx + wz * wz);
            childPos.angle = Math.atan2(wz, wx);
        }
    }
}
