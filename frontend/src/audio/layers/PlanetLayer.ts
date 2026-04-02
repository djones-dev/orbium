import { AudioLayer, AudioParams } from '../../types/audio';
import { OscillatorBank } from '@/audio/sources/OscillatorBank';
import { FilterEffect } from '@/audio/effects/FilterEffect';
import { ReverbEffect } from '@/audio/effects/ReverbEffect';
import { PhaserEffect } from '@/audio/effects/PhaserEffect';

/**
 * PlanetLayer — Lightweight Synthesis
 *
 * Signal Flow:
 * [OscillatorBank] ─► FilterEffect ─► outputGain ─► analyser
 *
 * Planets use a minimal signal chain without reverb, phaser, or distortion by default.
 * Additional effects can be driven via EffectComponent in the ECS.
 */
export class PlanetLayer implements AudioLayer {
  readonly id: string;
  readonly type = 'planet';
  readonly analyser: AnalyserNode;

  private context: AudioContext;
  private outputGain: GainNode;
  private splitGain: GainNode;

  private oscillatorBank: OscillatorBank;
  private filter: FilterEffect;
  private reverb: ReverbEffect;
  private phaser: PhaserEffect;

  private params: AudioParams = {
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
      },
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

  constructor(context: AudioContext, id: string = crypto.randomUUID()) {
    this.context = context;
    this.id = id;

    // Create analyser
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;

    // Create output gain
    this.outputGain = context.createGain();
    this.outputGain.connect(this.analyser);

    // Create split gain for effect routing
    this.splitGain = context.createGain();

    // Create modules
    this.oscillatorBank = new OscillatorBank(context, false);
    this.filter = new FilterEffect(context);
    this.reverb = new ReverbEffect(context);
    this.phaser = new PhaserEffect(context);

    // Wire the signal chain:
    // OscillatorBank → FilterEffect → splitGain
    //                                  → ReverbEffect → outputGain
    //                                  → PhaserEffect → outputGain
    //                                  → (dry) → outputGain
    //                                → analyser
    this.oscillatorBank.output.connect(this.filter.input);
    this.filter.output.connect(this.splitGain);

    this.splitGain.connect(this.reverb.input);
    this.reverb.output.connect(this.outputGain);

    this.splitGain.connect(this.phaser.input);
    this.phaser.output.connect(this.outputGain);

    this.splitGain.connect(this.outputGain);

    // Apply initial params
    this.updateParams(this.params);
  }

  updateParams(newParams: Partial<AudioParams>): void {
    this.params = {
      ...this.params,
      ...newParams,
      oscillator: newParams.oscillator ?? this.params.oscillator,
      filter: newParams.filter ? { ...this.params.filter, ...newParams.filter } : this.params.filter,
      distortion: newParams.distortion ? { ...this.params.distortion, ...newParams.distortion } : this.params.distortion,
      reverb: newParams.reverb ? { ...this.params.reverb, ...newParams.reverb } : this.params.reverb,
      phaser: newParams.phaser ? { ...this.params.phaser, ...newParams.phaser } : this.params.phaser,
      envelope: newParams.envelope ? { ...this.params.envelope, ...newParams.envelope } : this.params.envelope,
    };

    // Delegate to modules
    this.oscillatorBank.updateParams(this.params);
    this.filter.updateParams(this.params);
    this.reverb.updateParams(this.params);
    this.phaser.updateParams(this.params);

    // Handle output gain
    const { gainLevel } = this.params;
    if (gainLevel !== undefined) {
      const now = this.context.currentTime;
      const ramp = 0.01;
      const linearGain = Math.pow(10, gainLevel / 20);
      this.outputGain.gain.setTargetAtTime(linearGain, now, ramp);
    }
  }

  getParams(): AudioParams {
    return { ...this.params };
  }

  connect(destination: AudioNode): void {
    this.analyser.connect(destination);
  }

  disconnect(): void {
    this.analyser.disconnect();
  }

  setVolume(value: number): void {
    this.updateParams({ gainLevel: value });
  }

  dispose(): void {
    this.oscillatorBank.dispose();
    this.filter.dispose();
    this.reverb.dispose();
    this.phaser.dispose();
    this.splitGain.disconnect();
    this.outputGain.disconnect();
    this.analyser.disconnect();
  }

  public trigger(time: number): void {
    const envelopeParams = this.params.envelope ?? { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.0 };
    const { attack = 0.01, decay = 0.5 } = envelopeParams;
    const peakLevel = 1.0;

    const gain = this.oscillatorBank.getMasterMixGain().gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(0, time);
    gain.linearRampToValueAtTime(peakLevel, time + attack);
    gain.linearRampToValueAtTime(0, time + attack + decay);
  }
}
