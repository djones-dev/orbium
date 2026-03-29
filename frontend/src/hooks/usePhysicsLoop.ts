import { useFrame } from '@react-three/fiber';
import { PhysicsSystem } from '../simulation/PhysicsSystem';
import { useUIStore } from '../stores/uiStore';

/**
 * Drives the PhysicsSystem forward on each render frame.
 * Must be called from a component that is mounted inside an R3F Canvas.
 *
 * Physics only advances while audio is playing so the visual simulation
 * stays in sync with the audio transport state.
 */
export const usePhysicsLoop = (): void => {
    const isPlaying = useUIStore(s => s.isPlaying);
    const physics = PhysicsSystem.getInstance();

    useFrame((_, delta) => {
        if (isPlaying) {
            physics.step(delta);
        }
    });
};
