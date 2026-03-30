import { EntityId } from './Entity';
import { Component, ComponentType } from './components/Component';

/**
 * EntityManager — core ECS storage and query engine.
 *
 * Components are stored in per-type Maps:  ComponentType → Map<EntityId, Component>
 * This keeps iteration over a single component type cache-friendly, and allows
 * multi-component queries by intersecting the smallest store first.
 *
 * Phase 7 will replace this with archetype-based storage for O(1) queries.
 */
export class EntityManager {
    private entities = new Set<EntityId>();
    private stores = new Map<ComponentType, Map<EntityId, Component>>();

    // ── Entity lifecycle ──────────────────────────────────────────────────────

    createEntity(id: EntityId): EntityId {
        this.entities.add(id);
        return id;
    }

    destroyEntity(id: EntityId): void {
        this.entities.delete(id);
        for (const store of this.stores.values()) {
            store.delete(id);
        }
    }

    hasEntity(id: EntityId): boolean {
        return this.entities.has(id);
    }

    getEntities(): EntityId[] {
        return Array.from(this.entities);
    }

    // ── Component storage ─────────────────────────────────────────────────────

    addComponent<T extends Component>(entityId: EntityId, component: T): void {
        if (!this.entities.has(entityId)) {
            throw new Error(`EntityManager: entity "${entityId}" does not exist`);
        }
        this.getOrCreateStore(component.type).set(entityId, component);
    }

    removeComponent(entityId: EntityId, type: ComponentType): void {
        this.stores.get(type)?.delete(entityId);
    }

    getComponent<T extends Component>(entityId: EntityId, type: ComponentType): T | undefined {
        return this.stores.get(type)?.get(entityId) as T | undefined;
    }

    hasComponent(entityId: EntityId, type: ComponentType): boolean {
        return this.stores.get(type)?.has(entityId) ?? false;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /**
     * Returns all entity IDs that possess every listed component type.
     * Uses the smallest matching store as the primary iterator to minimise
     * the number of hash lookups.
     */
    query(...types: ComponentType[]): EntityId[] {
        if (types.length === 0) return this.getEntities();

        // Find the store with the fewest entries — iterate over it
        let smallestStore: Map<EntityId, Component> | undefined;
        let remaining = types;

        for (const type of types) {
            const store = this.stores.get(type);
            if (!store) return []; // No entity can match a missing store
            if (!smallestStore || store.size < smallestStore.size) {
                smallestStore = store;
                remaining = types.filter(t => t !== type);
            }
        }

        const results: EntityId[] = [];
        for (const id of smallestStore!.keys()) {
            if (remaining.every(t => this.stores.get(t)?.has(id))) {
                results.push(id);
            }
        }
        return results;
    }

    // ── Diagnostics ───────────────────────────────────────────────────────────

    entityCount(): number {
        return this.entities.size;
    }

    componentCount(): number {
        let n = 0;
        for (const store of this.stores.values()) n += store.size;
        return n;
    }

    private getOrCreateStore(type: ComponentType): Map<EntityId, Component> {
        let store = this.stores.get(type);
        if (!store) {
            store = new Map();
            this.stores.set(type, store);
        }
        return store;
    }
}
