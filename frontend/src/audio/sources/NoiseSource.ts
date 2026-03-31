import { AudioParams } from '@/types/audio';
import { AudioEffect } from '@/audio/effects/types';
import { logger } from '@/utils/logger';

export class NoiseSource implements AudioEffect {
  readonly input: AudioNode; // Not used; this is a source
  readonly output: AudioNode;

  private context: AudioContext;
  private noiseNode: AudioNode;
  private noiseFilter: BiquadFilterNode;
  private noiseGain: GainNode;

  constructor(context: AudioContext, workletLoaded: boolean = true) {
    this.context = context;

    // Try to load the AudioWorklet noise processor
    if (workletLoaded) {
      try {
        const worklet = new AudioWorkletNode(context, 'noise-processor', {
          parameterData: { color: 2.0 },
        });
        worklet.onprocessorerror = (err: Event) => {
          logger.error('NoiseProcessor Error:', err);
        };
        this.noiseNode = worklet;
      } catch (e) {
        logger.warn('NoiseSource: Noise processor unavailable, using silent fallback.', e);
        const silence = context.createGain();
        silence.gain.value = 0;
        this.noiseNode = silence;
      }
    } else {
      // Silent fallback if worklet not available
      const silence = context.createGain();
      silence.gain.value = 0;
      this.noiseNode = silence;
    }

    // Create filter and gain
    this.noiseFilter = context.createBiquadFilter();
    this.noiseFilter.type = 'highpass';
    this.noiseFilter.frequency.value = 300;

    this.noiseGain = context.createGain();
    this.noiseGain.gain.value = 0.03; // Default dB-to-linear conversion from -30dB

    // Wire signal chain
    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);

    // Both input and output point to noiseGain
    this.input = this.noiseNode; // Dummy; not actually connected
    this.output = this.noiseGain;
  }

  updateParams(params: Partial<AudioParams>): void {
    // Noise params are nested under oscillator when type is 'basic'
    const oscConfig = params.oscillator;
    if (!oscConfig || oscConfig.type !== 'basic') return;

    const oscParams = oscConfig.params as any; // params is Partial<BasicOscillatorParams>
    const { noiseVol, noiseEnabled } = oscParams;

    if (noiseVol !== undefined || noiseEnabled !== undefined) {
      const now = this.context.currentTime;
      const ramp = 0.01;
      const noiseTarget = noiseEnabled !== false ? Math.pow(10, (noiseVol ?? -40) / 20) : 0;
      this.noiseGain.gain.setTargetAtTime(noiseTarget, now, ramp);
    }
  }

  dispose(): void {
    this.noiseNode.disconnect();
    this.noiseFilter.disconnect();
    this.noiseGain.disconnect();
  }
}
