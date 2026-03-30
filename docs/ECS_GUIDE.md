# ECS Developer Guide

Orbium uses an Entity Component System (ECS) to decouple simulation, audio, and rendering logic. This architecture allows for high performance, modularity, and easy extension.

## Core Concepts

- **Entity**: A unique identifier (UUID string) representing a single object in the world. Entities have no logic or data themselves.
- **Component**: A plain data structure attached to an entity. Components represent specific properties like `Position`, `Audio`, or `Visual`.
- **System**: A logic container that processes entities sharing a specific set of components. Systems run every frame in a predetermined order.
- **World**: The singleton container that owns the `EntityManager` and all registered `Systems`.

## Entity ID Strategy
Entities in Orbium use **string UUIDs** as their unique identifiers. This aligns with the IDs used by the backend database and legacy systems, facilitating synchronization during the migration period.

## Adding a New Component

1. **Register the type**: Add a new entry to the `ComponentType` enum in `frontend/src/ecs/components/Component.ts`.
2. **Define the interface**: Create a new file `frontend/src/ecs/components/FooComponent.ts`.
3. **Add a factory function**:
   ```typescript
   export interface FooComponent extends Component {
       readonly type: ComponentType.Foo;
       data: string;
   }
   export const createFooComponent = (data: string): FooComponent => ({
       type: ComponentType.Foo,
       data,
   });
   ```
4. **Attach to entities**: Use `entityManager.addComponent(id, createFooComponent('bar'))` during entity creation, typically in `OrbitalBodiesManager.addEntityToECS()`.

## Adding a New System

1. **Create the system**: Create a new file `frontend/src/ecs/systems/FooSystem.ts` extending the `System` base class.
2. **Define priority and requirements**:
   ```typescript
   export class FooSystem extends System {
       readonly priority = 250; // Use the priority table below
       readonly requiredComponents = [ComponentType.Foo, ComponentType.Position];
       update(em: EntityManager, dt: number): void {
           for (const id of em.query(...this.requiredComponents)) {
               // Your logic here
           }
       }
   }
   ```
3. **Register the system**: Instantiate and add it to the `systems` array in the `World` constructor (`frontend/src/ecs/World.ts`).

## System Priority Table

LOWER numbers run FIRST.

| System | Priority | Role | Reads | Writes |
|---|---|---|---|---|
| **HierarchySystem** | 50 | World-space conversion | Hierarchy, Position | Position |
| **PhysicsSystem** | 90 | Force integration | Physics, Position | Velocity |
| **MovementSystem** | 100 | Sync from Physics | Velocity, Physics | Position |
| **CollisionSystem** | 150 | Proximity detection | Position, Collider | EventBus |
| **ModulationSystem** | 180 | Parameter routing | Modulation, Audio | Audio, Dirty Set |
| **AudioSystem** | 200 | Flush audio updates | Audio (dirty set) | EventBus |
| **RenderSystem** | 300 | Cartesian cache | Position, Visual | Render Cache |

## Querying Entities

To find all entities with a specific set of components:
```typescript
const world = World.getInstance();
const entities = world.entities.query(ComponentType.Position, ComponentType.Audio);
```

To read/modify a component on a specific entity:
```typescript
const pos = world.entities.getComponent<PositionComponent>(id, ComponentType.Position);
if (pos) {
    pos.radius += 1.0;
}
```

## Performance Optimizations

### Archetype-based Storage
The `EntityManager` groups entities into **archetypes** based on their unique set of component types. When querying for entities with specific components, the manager only iterates over matching archetypes, making queries extremely efficient even with thousands of entities.

### Object Pooling
To minimize garbage collection pressure during frequent body additions and removals, `EntityManager` utilizes an internal pool for component maps. Destroyed entities return their storage maps to the pool for reuse by new entities.

## Simulation Bridge: OrbitalBodiesManager

The `OrbitalBodiesManager` acts as the primary coordinator between the simulation state, the ECS World, and the backend persistence layer.

- `loadFromBackend()`: Restores simulation state from the database into ECS.
- `addBody(body)`: Instantiates a new celestial body, adding its components to the ECS World.
- `updateBodyParams(id, params)`: Updates parameters in the `AudioComponent` and notifies relevant systems.
- `getBodies()`: Reconstructs legacy `OrbitalBody` structures from ECS components for consumers that still require the monolithic format.
