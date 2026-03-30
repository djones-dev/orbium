import { Component, ComponentType } from './Component';
import { SunParameters } from '../../types/audio';

export interface AudioComponent extends Component {
    readonly type: ComponentType.Audio;
    layerId: string;
    parameters: Partial<SunParameters>;
}

export const createAudioComponent = (
    layerId: string,
    parameters: Partial<SunParameters>,
): AudioComponent => ({
    type: ComponentType.Audio,
    layerId,
    parameters: { ...parameters },
});
