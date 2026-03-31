import { AudioParams } from '@/types/audio';
import { AudioEffect } from './types';

export class PhaserEffect implements AudioEffect {
  readonly input: AudioNode;
  readonly output: AudioNode;

  private context: AudioContext;
  private inputGain: GainNode;
  private phaserFilters: BiquadFilterNode[] = [];
  private phaserLFO: OscillatorNode;
  private phaserLFOGain: GainNode;
  private phaserFeedbackNode: GainNode;
  private phaserGain: GainNode;

  constructor(context: AudioContext) {
    this.context = context;

    // Input passthrough
    this.inputGain = context.createGain();

    // Create 4 stages of allpass filters
    for (let i = 0; i < 4; i++) {
      const ap = context.createBiquadFilter();
      ap.type = 'allpass';
      ap.frequency.value = 1000 + i * 200;
      this.phaserFilters.push(ap);
    }

    // Chain the allpass stages together
    for (let i = 0; i < 3; i++) {
      this.phaserFilters[i].connect(this.phaserFilters[i + 1]);
    }

    // Feedback path (stage 4 -> stage 1)
    this.phaserFeedbackNode = context.createGain();
    this.phaserFeedbackNode.gain.value = 0.4; // Default feedback amount
    this.phaserFilters[3].connect(this.phaserFeedbackNode);
    this.phaserFeedbackNode.connect(this.phaserFilters[0]);

    // LFO to modulate all allpass frequencies
    this.phaserLFO = context.createOscillator();
    this.phaserLFO.frequency.value = 0.5;

    this.phaserLFOGain = context.createGain();
    this.phaserLFOGain.gain.value = 500; // Default depth

    this.phaserLFO.connect(this.phaserLFOGain);

    // Connect LFO gain to all filter frequencies
    for (const filter of this.phaserFilters) {
      this.phaserLFOGain.connect(filter.frequency);
    }

    // Output with mix control
    this.phaserGain = context.createGain();
    this.phaserGain.gain.value = 0; // Off by default

    // Wire signal chain
    this.inputGain.connect(this.phaserFilters[0]);
    this.phaserFilters[3].connect(this.phaserGain);

    // Start the LFO
    const now = context.currentTime;
    this.phaserLFO.start(now);

    this.input = this.inputGain;
    this.output = this.phaserGain;
  }

  updateParams(params: Partial<AudioParams>): void {
    const phaserParams = params.phaser;
    const effects = params.effects;
    const now = this.context.currentTime;
    const ramp = 0.01;

    const isPhaserActive = effects?.includes('phaser') ?? false;

    // Gate the output
    if (phaserParams?.phaserDepth !== undefined) {
      const targetGain = isPhaserActive ? phaserParams.phaserDepth : 0;
      this.phaserGain.gain.setTargetAtTime(targetGain, now, ramp);
    } else if (isPhaserActive !== undefined) {
      // If effects array changed but phaserDepth not specified
      this.phaserGain.gain.setTargetAtTime(isPhaserActive ? 0.5 : 0, now, ramp);
    }

    // Update LFO rate and depth
    if (isPhaserActive && phaserParams) {
      if (phaserParams.phaserRate !== undefined) {
        this.phaserLFO.frequency.setTargetAtTime(phaserParams.phaserRate, now, ramp);
      }

      if (phaserParams.phaserDepth !== undefined) {
        this.phaserLFOGain.gain.setTargetAtTime(phaserParams.phaserDepth * 1000, now, ramp);
      }

      if (phaserParams.phaserFeedback !== undefined) {
        this.phaserFeedbackNode.gain.setTargetAtTime(phaserParams.phaserFeedback, now, ramp);
      }
    }
  }

  dispose(): void {
    this.phaserLFO.stop();
    this.inputGain.disconnect();
    this.phaserFilters.forEach(f => f.disconnect());
    this.phaserFeedbackNode.disconnect();
    this.phaserLFOGain.disconnect();
    this.phaserGain.disconnect();
  }
}
