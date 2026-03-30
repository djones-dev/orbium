import { Component, ComponentType } from './Component';
import { EffectType } from '../../types/audio';

export interface EffectInstance {
    type: EffectType;
    intensity: number; // 0-1
}

export interface EffectComponent extends Component {
    readonly type: ComponentType.Effect;
    effects: EffectInstance[];
}

export const createEffectComponent = (
    effects: EffectInstance[] = []
): EffectComponent => ({
    type: ComponentType.Effect,
    effects: [...effects],
});
