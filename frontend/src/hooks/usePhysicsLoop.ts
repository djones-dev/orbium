import { useFrame } from '@react-three/fiber';
import { PhysicsSystem } from '../simulation/PhysicsSystem';
import { World } from '../ecs/World';
import { useUIStore } from '../stores/uiStore';

/**
 * Drives PhysicsSystem and the ECS World forward on each render frame.
 * Must be called from a component mounted inside an R3F Canvas.
 *
 * Execution order each frame:
 *   1. PhysicsSystem.step(delta)  — integrates body positions (fixed timestep)
 *   2. World.update(delta)        — runs systems in priority order:
 *        MovementSystem  (100) — syncs ECS PositionComponent from PhysicsSystem
 *        AudioSystem     (200) — flushes any dirty AudioComponent changes
 *        RenderSystem    (300) — updates Cartesian render cache
 *
 * Physics and ECS only advance while audio is playing so the simulation
 * stays in sync with the audio transport state.
 */
export const usePhysicsLoop = (): void => {
    const isPlaying = useUIStore(s => s.isPlaying);
    const physics = PhysicsSystem.getInstance();
    const world = World.getInstance();

    useFrame((_, delta) => {
        if (isPlaying) {
            physics.step(delta);
            world.update(delta);
        }
    });
};
