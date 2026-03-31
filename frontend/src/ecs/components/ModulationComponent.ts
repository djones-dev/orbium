import { Component, ComponentType } from './Component';
import { ModulatorType } from '../../types/audio';

export interface ModulationRoute {
    sourceType: 'parameter' | 'orbit';
    modType: ModulatorType;
    sourceParam?: string; // dot-path like "filter.filterCutoff"
    targetEntityId: string;
    targetParam: string;  // dot-path like "oscillator.rootFrequency"
    depth: number; // 0–1 mix
}

export interface ModulationComponent extends Component {
    readonly type: ComponentType.Modulation;
    routes: ModulationRoute[];
    
    // Runtime state for ADSR
    adsrState: {
        phase: 'idle' | 'attack' | 'decay' | 'sustain' | 'release';
        value: number; // 0-1
        startTime: number;
        lastTriggerTime: number;
    };
}

export const createModulationComponent = (
    routes: ModulationRoute[] = []
): ModulationComponent => ({
    type: ComponentType.Modulation,
    routes: [...routes],
    adsrState: {
        phase: 'idle',
        value: 0,
        startTime: 0,
        lastTriggerTime: 0
    }
});
