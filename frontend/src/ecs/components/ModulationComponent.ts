import { Component, ComponentType } from './Component';
import { SunParameters } from '../../types/audio';

export interface ModulationRoute {
    sourceParam: keyof SunParameters; // e.g. 'rootFrequency'
    targetEntityId: string;
    targetParam: keyof SunParameters;
    depth: number; // 0–1 mix
}

export interface ModulationComponent extends Component {
    readonly type: ComponentType.Modulation;
    routes: ModulationRoute[];
}

export const createModulationComponent = (
    routes: ModulationRoute[] = []
): ModulationComponent => ({
    type: ComponentType.Modulation,
    routes: [...routes],
});
