import { Component, ComponentType } from './Component';

export interface VisualComponent extends Component {
    readonly type: ComponentType.Visual;
    color: string;
    size: number;
    shaderUniforms: Record<string, unknown>;
}

export const createVisualComponent = (
    color: string,
    size: number,
    shaderUniforms: Record<string, unknown> = {},
): VisualComponent => ({
    type: ComponentType.Visual,
    color,
    size,
    shaderUniforms,
});
