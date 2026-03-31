import { Component, ComponentType } from './Component';
import { AudioParams } from '../../types/audio';

export interface AudioComponent extends Component {
    readonly type: ComponentType.Audio;
    layerId: string;
    baseParameters: Partial<AudioParams>;
    parameters: Partial<AudioParams>;
}

export const createAudioComponent = (
    layerId: string,
    parameters: Partial<AudioParams>,
): AudioComponent => ({
    type: ComponentType.Audio,
    layerId,
    baseParameters: { ...parameters },
    parameters: { ...parameters },
});
