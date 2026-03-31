import { OscillatorType, OscillatorConfig } from '@/types/audio';
import { Oscillator } from './Oscillator';
import { OscillatorBank } from './OscillatorBank';

export class OscillatorFactory {
    static create(context: AudioContext, type: OscillatorType, isSun?: boolean): Oscillator {
        switch (type) {
            case 'basic':
                return new OscillatorBank(context, isSun) as unknown as Oscillator;
            case 'fm':
                throw new Error('FM oscillator not yet implemented');
            case 'wavetable':
                throw new Error('Wavetable oscillator not yet implemented');
            case 'additive':
                throw new Error('Additive oscillator not yet implemented');
        }
    }

    static getDefaults(type: OscillatorType): OscillatorConfig {
        switch (type) {
            case 'basic':
                return {
                    type: 'basic',
                    params: {
                        rootFrequency: 110,
                        detuneSpread: 10,
                        waveform: 'sine',
                        subVol: -12,
                        subEnabled: true,
                        noiseVol: -40,
                        noiseEnabled: true
                    }
                };
            case 'fm':
                return { type: 'fm', params: { rootFrequency: 110, modulationIndex: 1, harmonicity: 2 } };
            case 'wavetable':
                return { type: 'wavetable', params: { rootFrequency: 110, wavetableIndex: 0, interpolation: 'linear' } };
            case 'additive':
                return { type: 'additive', params: { rootFrequency: 110, harmonics: 8, rolloff: 1 } };
        }
    }
}
