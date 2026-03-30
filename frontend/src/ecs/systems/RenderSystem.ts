import { System } from './System';
import { EntityManager } from '../EntityManager';
import { ComponentType } from '../components/Component';
import { PositionComponent } from '../components/PositionComponent';
import { VisualComponent } from '../components/VisualComponent';

export interface RenderData {
    id: string;
    x: number;
    z: number;
    color: string;
    size: number;
}

/**
 * RenderSystem — projects polar PositionComponent into Cartesian render data
 * and caches it for React consumers.
 *
 * React components call `getRenderData()` rather than querying EntityManager
 * directly, keeping the rendering layer decoupled from ECS internals.
 *
 * In Phase 4 this is a secondary data source — Scene.tsx still reads from
 * OrbitalBodiesManager.  In Phase 7 (once the adapter is removed), Scene.tsx
 * will switch to `getRenderData()` as the single source of truth.
 *
 * Priority 300 — runs last, after positions have been updated by MovementSystem.
 */
export class RenderSystem extends System {
    readonly priority = 300;
    readonly requiredComponents = [ComponentType.Position, ComponentType.Visual];

    private cache = new Map<string, RenderData>();

    update(entityManager: EntityManager, _dt: number): void {
        // Remove stale entries for destroyed entities
        for (const id of this.cache.keys()) {
            if (!entityManager.hasEntity(id)) this.cache.delete(id);
        }

        for (const id of entityManager.query(ComponentType.Position, ComponentType.Visual)) {
            const pos = entityManager.getComponent<PositionComponent>(id, ComponentType.Position);
            const visual = entityManager.getComponent<VisualComponent>(id, ComponentType.Visual);
            if (!pos || !visual) continue;

            this.cache.set(id, {
                id,
                x: pos.radius * Math.cos(pos.angle),
                z: pos.radius * Math.sin(pos.angle),
                color: visual.color,
                size: visual.size,
            });
        }
    }

    getRenderData(): RenderData[] {
        return Array.from(this.cache.values());
    }

    getRenderDataById(id: string): RenderData | undefined {
        return this.cache.get(id);
    }
}
