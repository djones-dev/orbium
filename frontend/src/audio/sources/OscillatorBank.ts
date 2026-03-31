import { AudioParams, BasicOscillatorParams } from '@/types/audio';
import { AudioEffect } from '@/audio/effects/types';

export class OscillatorBank implements AudioEffect {
  readonly input: AudioNode; // Not used; this is a source
  readonly output: AudioNode;

  private context: AudioContext;
  private osc1: OscillatorNode;
  private osc2: OscillatorNode;
  private osc3: OscillatorNode;
  private subOsc: OscillatorNode;
  private osc1Gain: GainNode;
  private osc2Gain: GainNode;
  private osc3Gain: GainNode;
  private subGain: GainNode;
  private masterMixGain: GainNode;

  private lastWaveform: BasicOscillatorParams['waveform'] = 'sine';

  constructor(context: AudioContext, isSun: boolean = false) {
    this.context = context;

    // Create all oscillators
    this.osc1 = context.createOscillator();
    this.osc2 = context.createOscillator();
    this.osc3 = context.createOscillator();
    this.subOsc = context.createOscillator();

    // Create gain nodes
    this.osc1Gain = context.createGain();
    this.osc1Gain.gain.value = 0.25;

    this.osc2Gain = context.createGain();
    this.osc2Gain.gain.value = 0.1;

    this.osc3Gain = context.createGain();
    this.osc3Gain.gain.value = 0.1;

    this.subGain = context.createGain();
    this.subGain.gain.value = 0.15;

    // Master mix node
    this.masterMixGain = context.createGain();
    // Sun primary is always on, others start at zero
    this.masterMixGain.gain.value = isSun ? 1.0 : 0.0;

    // Wire oscillators to their gains
    this.osc1.connect(this.osc1Gain);
    this.osc2.connect(this.osc2Gain);
    this.osc3.connect(this.osc3Gain);
    this.subOsc.connect(this.subGain);

    // Wire all gains to master mix
    this.osc1Gain.connect(this.masterMixGain);
    this.osc2Gain.connect(this.masterMixGain);
    this.osc3Gain.connect(this.masterMixGain);
    this.subGain.connect(this.masterMixGain);

    // Start oscillators
    const now = context.currentTime;
    this.osc1.start(now);
    this.osc2.start(now);
    this.osc3.start(now);
    this.subOsc.start(now);

    // output and input both point to masterMixGain (sources have no input)
    this.input = this.masterMixGain; // Dummy; not actually connected
    this.output = this.masterMixGain;
  }

  updateParams(params: Partial<AudioParams>): void {
    const oscConfig = params.oscillator;
    if (!oscConfig || oscConfig.type !== 'basic') return;

    const basicParams = oscConfig.params as Partial<BasicOscillatorParams>;
    const { rootFrequency, detuneSpread, waveform, subVol, subEnabled } = basicParams;
    const now = this.context.currentTime;
    const ramp = 0.01;

    if (waveform && waveform !== this.lastWaveform) {
      this.osc1.type = waveform;
      this.osc2.type = waveform;
      this.osc3.type = waveform;
      this.subOsc.type = (waveform === 'sawtooth' || waveform === 'square') ? 'square' : 'sine';
      this.lastWaveform = waveform;
    }

    if (rootFrequency !== undefined) {
      this.osc1.frequency.setTargetAtTime(rootFrequency, now, ramp);
      this.osc2.frequency.setTargetAtTime(rootFrequency, now, ramp);
      this.osc3.frequency.setTargetAtTime(rootFrequency, now, ramp);
      this.subOsc.frequency.setTargetAtTime(rootFrequency / 2, now, ramp);
    }

    if (detuneSpread !== undefined) {
      this.osc2.detune.setTargetAtTime(detuneSpread, now, ramp);
      this.osc3.detune.setTargetAtTime(-detuneSpread, now, ramp);
    }

    if (subVol !== undefined || subEnabled !== undefined) {
      const subTarget = subEnabled !== false ? Math.pow(10, (subVol ?? -12) / 20) : 0;
      this.subGain.gain.setTargetAtTime(subTarget, now, ramp);
    }
  }

  getMasterMixGain(): GainNode {
    return this.masterMixGain;
  }

  dispose(): void {
    this.osc1.stop();
    this.osc2.stop();
    this.osc3.stop();
    this.subOsc.stop();
    this.masterMixGain.disconnect();
  }
}
