/**
 * MasterChain — bus compression and safety limiting for the audio engine.
 *
 * Signal path: input (GainNode) → Compressor → Limiter → Analyser → destination
 *
 * Bus compressor: -12 dB threshold, 4:1 ratio (gentle glue)
 * Safety limiter: -0.5 dB threshold, 20:1 ratio (brickwall-ish)
 */
export class MasterChain {
    readonly gain: GainNode;
    readonly compressor: DynamicsCompressorNode;
    readonly limiter: DynamicsCompressorNode;
    readonly analyser: AnalyserNode;

    constructor(context: AudioContext) {
        this.gain = context.createGain();
        this.gain.gain.value = 0.8;

        this.compressor = context.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.01;
        this.compressor.release.value = 0.25;

        this.limiter = context.createDynamicsCompressor();
        this.limiter.threshold.value = -0.5;
        this.limiter.knee.value = 0;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = 0.1;

        this.analyser = context.createAnalyser();
        this.analyser.fftSize = 2048;

        this.gain.connect(this.compressor);
        this.compressor.connect(this.limiter);
        this.limiter.connect(this.analyser);
        this.analyser.connect(context.destination);
    }

    /** Connect an audio source to the master bus input. */
    connectSource(source: AudioNode): void {
        source.connect(this.gain);
    }
}
