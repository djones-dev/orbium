import { EntityId } from './Entity';
import { Component, ComponentType } from './components/Component';

type ArchetypeKey = string;

interface Archetype {
    key: ArchetypeKey;
    types: Set<ComponentType>;
    entities: Set<EntityId>;
}

/**
 * EntityManager — core ECS storage and query engine.
 *
 * Uses archetype grouping for efficient queries. Entities sharing the same set
 * of components are grouped together. Querying for a set of component types
 * only iterates over matching archetypes.
 *
 * O(1) for most operations; O(n_archetypes) for queries.
 */
export class EntityManager {
    private entities = new Set<EntityId>();
    
    // Archetype storage
    private archetypes = new Map<ArchetypeKey, Archetype>();
    private entityToArchetype = new Map<EntityId, ArchetypeKey>();
    
    // Component data storage: Map<EntityId, Map<ComponentType, Component>>
    private components = new Map<EntityId, Map<ComponentType, Component>>();

    // ── Entity lifecycle ──────────────────────────────────────────────────────

    createEntity(id: EntityId): EntityId {
        this.entities.add(id);
        this.components.set(id, new Map());
        this.updateArchetype(id);
        return id;
    }

    destroyEntity(id: EntityId): void {
        const key = this.entityToArchetype.get(id);
        if (key) {
            this.archetypes.get(key)?.entities.delete(id);
        }
        this.entityToArchetype.delete(id);
        this.components.delete(id);
        this.entities.delete(id);
    }

    hasEntity(id: EntityId): boolean {
        return this.entities.has(id);
    }

    getEntities(): EntityId[] {
        return Array.from(this.entities);
    }

    // ── Component storage ─────────────────────────────────────────────────────

    addComponent<T extends Component>(entityId: EntityId, component: T): void {
        const entityComponents = this.components.get(entityId);
        if (!entityComponents) {
            throw new Error(`EntityManager: entity "${entityId}" does not exist`);
        }
        
        entityComponents.set(component.type, component);
        this.updateArchetype(entityId);
    }

    removeComponent(entityId: EntityId, type: ComponentType): void {
        const entityComponents = this.components.get(entityId);
        if (entityComponents?.delete(type)) {
            this.updateArchetype(entityId);
        }
    }

    getComponent<T extends Component>(entityId: EntityId, type: ComponentType): T | undefined {
        return this.components.get(entityId)?.get(type) as T | undefined;
    }

    hasComponent(entityId: EntityId, type: ComponentType): boolean {
        return this.components.get(entityId)?.has(type) ?? false;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /**
     * Returns all entity IDs that possess every listed component type.
     * Iterates over all matching archetypes.
     */
    query(...types: ComponentType[]): EntityId[] {
        if (types.length === 0) return this.getEntities();

        const results: EntityId[] = [];
        for (const arch of this.archetypes.values()) {
            // Check if archetype contains all requested types
            if (types.every(t => arch.types.has(t))) {
                results.push(...Array.from(arch.entities));
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
        for (const comps of this.components.values()) {
            n += comps.size;
        }
        return n;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private updateArchetype(id: EntityId): void {
        const comps = this.components.get(id);
        if (!comps) return;

        // 1. Remove from old archetype
        const oldKey = this.entityToArchetype.get(id);
        if (oldKey) {
            this.archetypes.get(oldKey)?.entities.delete(id);
        }

        // 2. Compute new archetype key (sorted types)
        const typesList = Array.from(comps.keys()).sort();
        const newKey = typesList.join('|');

        // 3. Get or create new archetype
        let arch = this.archetypes.get(newKey);
        if (!arch) {
            arch = {
                key: newKey,
                types: new Set(typesList),
                entities: new Set()
            };
            this.archetypes.set(newKey, arch);
        }

        // 4. Add to new archetype
        arch.entities.add(id);
        this.entityToArchetype.set(id, newKey);
    }
}
