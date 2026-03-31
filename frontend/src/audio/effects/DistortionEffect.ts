import { AudioParams } from '@/types/audio';
import { AudioEffect } from './types';

export class DistortionEffect implements AudioEffect {
  readonly input: AudioNode;
  readonly output: AudioNode;

  private waveshaper: WaveShaperNode;

  constructor(context: AudioContext) {

    this.waveshaper = context.createWaveShaper();
    this.waveshaper.oversample = '4x';
    this.waveshaper.curve = this.makeTanhCurve(0);

    this.input = this.waveshaper;
    this.output = this.waveshaper;
  }

  updateParams(params: Partial<AudioParams>): void {
    const distortionParams = params.distortion;
    const effects = params.effects;

    // Force distortion to 80 if 'distortion' is in effects array
    if (effects?.includes('distortion')) {
      this.waveshaper.curve = this.makeTanhCurve(80);
    } else if (distortionParams?.distortion !== undefined) {
      this.waveshaper.curve = this.makeTanhCurve(distortionParams.distortion);
    }
  }

  private makeTanhCurve(inputDrive: number): Float32Array<ArrayBuffer> {
    const drive = 1.0 + inputDrive * 0.2;
    const n = 8192;
    const buf = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buf) as Float32Array<ArrayBuffer>;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = inputDrive === 0 ? x : Math.tanh(x * drive);
    }
    return curve;
  }

  dispose(): void {
    this.waveshaper.disconnect();
  }
}
