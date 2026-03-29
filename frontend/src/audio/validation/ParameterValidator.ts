import { SunParameters } from '../../types/audio';

const DEFAULTS: SunParameters = {
    rootFrequency: 110,
    filterCutoff: 1000,
    filterResonance: 1.0,
    detuneSpread: 10,
    lfoRate: 0.5,
    gainLevel: -12,
    waveform: 'sine',
    distortion: 0,
    noiseVol: -40,
    subVol: -12,
    noiseEnabled: true,
    subEnabled: true,
};

const RANGES: Partial<Record<keyof SunParameters, [number, number]>> = {
    rootFrequency:  [20,    20000],
    filterCutoff:   [20,    20000],
    filterResonance:[0,     20],
    detuneSpread:   [0,     1200],
    lfoRate:        [0.01,  20],
    gainLevel:      [-60,   0],
    distortion:     [0,     100],
    noiseVol:       [-80,   0],
    subVol:         [-80,   0],
};

const WAVEFORMS: SunParameters['waveform'][] = ['sine', 'triangle', 'sawtooth', 'square'];

export class ParameterValidator {
    static getDefaults(): SunParameters {
        return { ...DEFAULTS };
    }

    static validate(params: Partial<SunParameters>): Partial<SunParameters> {
        const out: Partial<SunParameters> = {};

        for (const key of Object.keys(params) as (keyof SunParameters)[]) {
            const value = params[key];
            if (value === undefined) continue;

            if (key === 'waveform') {
                out.waveform = WAVEFORMS.includes(value as SunParameters['waveform'])
                    ? (value as SunParameters['waveform'])
                    : DEFAULTS.waveform;
                continue;
            }

            if (key === 'noiseEnabled' || key === 'subEnabled') {
                out[key] = Boolean(value);
                continue;
            }

            const range = RANGES[key as keyof typeof RANGES];
            if (range && typeof value === 'number') {
                (out as Record<string, unknown>)[key] = Math.max(range[0], Math.min(range[1], value));
            } else {
                (out as Record<string, unknown>)[key] = value;
            }
        }

        return out;
    }

    static withDefaults(params: Partial<SunParameters>): SunParameters {
        return { ...DEFAULTS, ...ParameterValidator.validate(params) };
    }
}
