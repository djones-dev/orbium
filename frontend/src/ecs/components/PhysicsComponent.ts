import { Component, ComponentType } from './Component';

export interface PhysicsComponent extends Component {
    readonly type: ComponentType.Physics;
    mass: number;
    forces: Array<{ x: number; y: number }>; // accumulated each frame, cleared after integration
    damping: number; // 0–1
}

export const createPhysicsComponent = (
    mass = 1,
    damping = 0.999
): PhysicsComponent => ({
    type: ComponentType.Physics,
    mass,
    forces: [],
    damping,
});
