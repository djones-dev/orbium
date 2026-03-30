import { Component, ComponentType } from './Component';

export interface VelocityComponent extends Component {
    readonly type: ComponentType.Velocity;
    angular: number; // radians/second
}

export const createVelocityComponent = (angular: number): VelocityComponent => ({
    type: ComponentType.Velocity,
    angular,
});
