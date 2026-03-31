import { AudioParams } from '@/types/audio';
import { AudioEffect } from './types';

export class ReverbEffect implements AudioEffect {
  readonly input: AudioNode;
  readonly output: AudioNode;

  private context: AudioContext;
  private inputGain: GainNode;
  private convolverNode: ConvolverNode;
  private reverbGain: GainNode;
  private dryGain: GainNode;
  private outputMix: GainNode;

  private lastReverbSize: number = 2.0;

  constructor(context: AudioContext) {
    this.context = context;

    // Input/output mixing
    this.inputGain = context.createGain();
    this.dryGain = context.createGain();
    this.dryGain.gain.value = 1.0;

    // Reverb path
    this.convolverNode = context.createConvolver();
    this.convolverNode.buffer = this.createImpulseResponse(2.0, 2.0);

    this.reverbGain = context.createGain();
    this.reverbGain.gain.value = 0; // Off by default

    // Output mix
    this.outputMix = context.createGain();

    // Wire signal paths
    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputMix);

    // Wet path
    this.inputGain.connect(this.convolverNode);
    this.convolverNode.connect(this.reverbGain);
    this.reverbGain.connect(this.outputMix);

    this.input = this.inputGain;
    this.output = this.outputMix;
  }

  updateParams(params: Partial<AudioParams>): void {
    const reverbParams = params.reverb;
    const effects = params.effects;
    const now = this.context.currentTime;
    const ramp = 0.01;

    const isReverbActive = effects?.includes('reverb') ?? false;

    if (reverbParams?.reverbMix !== undefined) {
      const targetGain = isReverbActive ? reverbParams.reverbMix : 0;
      this.reverbGain.gain.setTargetAtTime(targetGain, now, ramp);
    } else if (isReverbActive !== undefined) {
      // If effects array changed but reverbMix not specified
      this.reverbGain.gain.setTargetAtTime(isReverbActive ? 0.3 : 0, now, ramp);
    }

    // Regenerate impulse if size changed significantly
    if (isReverbActive && reverbParams?.reverbSize !== undefined && Math.abs(reverbParams.reverbSize - this.lastReverbSize) > 0.1) {
      this.convolverNode.buffer = this.createImpulseResponse(reverbParams.reverbSize, 2.0);
      this.lastReverbSize = reverbParams.reverbSize;
    }
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const envelope = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  dispose(): void {
    this.inputGain.disconnect();
    this.convolverNode.disconnect();
    this.reverbGain.disconnect();
    this.dryGain.disconnect();
    this.outputMix.disconnect();
  }
}
