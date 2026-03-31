import { AudioParams } from '@/types/audio';
import { AudioEffect } from './types';

export class FilterEffect implements AudioEffect {
  readonly input: AudioNode;
  readonly output: AudioNode;

  private context: AudioContext;
  private filter: BiquadFilterNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;

  constructor(context: AudioContext) {
    this.context = context;

    // Create the lowpass filter
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 1.0;

    // Create LFO for modulation
    this.lfo = context.createOscillator();
    this.lfo.frequency.value = 0.5;

    this.lfoGain = context.createGain();
    this.lfoGain.gain.value = 300; // Default 30% of 1000 Hz cutoff

    // Wire LFO to modulate filter frequency
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);

    // Start the LFO
    const now = context.currentTime;
    this.lfo.start(now);

    this.input = this.filter;
    this.output = this.filter;
  }

  updateParams(params: Partial<AudioParams>): void {
    const filterParams = params.filter;
    if (!filterParams) return;

    const now = this.context.currentTime;
    const ramp = 0.01;

    if (filterParams.filterCutoff !== undefined) {
      this.filter.frequency.setTargetAtTime(filterParams.filterCutoff, now, ramp);
      // LFO depth is 30% of the cutoff frequency
      this.lfoGain.gain.setTargetAtTime(filterParams.filterCutoff * 0.3, now, ramp);
    }

    if (filterParams.filterResonance !== undefined) {
      this.filter.Q.setTargetAtTime(filterParams.filterResonance, now, ramp);
    }

    if (filterParams.lfoRate !== undefined) {
      this.lfo.frequency.setTargetAtTime(filterParams.lfoRate, now, ramp);
    }
  }

  dispose(): void {
    this.lfo.stop();
    this.filter.disconnect();
    this.lfoGain.disconnect();
  }
}
