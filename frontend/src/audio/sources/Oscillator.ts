import { AudioParams, OscillatorType } from '@/types/audio';

export interface Oscillator {
    readonly output: AudioNode;
    readonly oscillatorType: OscillatorType;
    updateParams(params: Partial<AudioParams>): void;
    getMasterMixGain(): GainNode;
    dispose(): void;
}
