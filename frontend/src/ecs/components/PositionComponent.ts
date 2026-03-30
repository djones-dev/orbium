import { Component, ComponentType } from './Component';

export interface PositionComponent extends Component {
    readonly type: ComponentType.Position;
    radius: number;
    angle: number; // radians, increases with angular velocity
}

export const createPositionComponent = (radius: number, angle: number): PositionComponent => ({
    type: ComponentType.Position,
    radius,
    angle,
});
