import { Component, ComponentType } from './Component';
import { SunParameters } from '../../types/audio';

export interface AudioComponent extends Component {
    readonly type: ComponentType.Audio;
    layerId: string;
    baseParameters: Partial<SunParameters>;
    parameters: Partial<SunParameters>;
}

export const createAudioComponent = (
    layerId: string,
    parameters: Partial<SunParameters>,
): AudioComponent => ({
    type: ComponentType.Audio,
    layerId,
    baseParameters: { ...parameters },
    parameters: { ...parameters },
});
