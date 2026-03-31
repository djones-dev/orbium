import { AudioParams } from '../../types/audio';

const DEFAULTS: AudioParams = {
  oscillator: {
    type: 'basic',
    params: {
      rootFrequency: 110,
      detuneSpread: 10,
      waveform: 'sine',
      subVol: -12,
      subEnabled: true,
      noiseVol: -40,
      noiseEnabled: true,
    }
  },
  gainLevel: -12,
  filter: {
    filterCutoff: 1000,
    filterResonance: 1.0,
    lfoRate: 0.5,
  },
  distortion: { distortion: 0 },
  reverb: { reverbMix: 0.3, reverbSize: 2.0 },
  phaser: { phaserRate: 0.5, phaserDepth: 0.5, phaserFeedback: 0.4 },
  envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.0 },
  effects: [],
};

export class ParameterValidator {
  static getDefaults(): AudioParams {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  static validate(params: Partial<AudioParams>): Partial<AudioParams> {
    // For now, just return the params as-is. Full validation will be per-module.
    return params;
  }

  static withDefaults(params: Partial<AudioParams>): AudioParams {
    return { ...DEFAULTS, ...params };
  }
}
