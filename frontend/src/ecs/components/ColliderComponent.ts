import { Component, ComponentType } from './Component';

export interface ColliderComponent extends Component {
    readonly type: ComponentType.Collider;
    radius: number; // world units, for proximity detection
}

export const createColliderComponent = (radius: number): ColliderComponent => ({
    type: ComponentType.Collider,
    radius,
});
