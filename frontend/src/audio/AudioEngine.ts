import { SunLayer } from './SunLayer';
import { SunParameters } from '../types/audio';

export class AudioEngine {
    private static instance: AudioEngine;
    public context: AudioContext | null = null;
    public masterGain: GainNode | null = null;
    public compressor: DynamicsCompressorNode | null = null;
    public analyser: AnalyserNode | null = null;

    public sunLayer: SunLayer | null = null;

    private constructor() { }

    public static getInstance(): AudioEngine {
        if (!AudioEngine.instance) {
            AudioEngine.instance = new AudioEngine();
        }
        return AudioEngine.instance;
    }

    public async initialize(): Promise<void> {
        if (this.context) {
            if (this.context.state === 'suspended') {
                await this.context.resume();
            }
            return;
        }

        // 1. Create AudioContext
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        this.context = new AudioContextClass();

        // Also resume here just in case browser policy started it suspended
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        // 2. Master Chain
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.8;

        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -10;
        this.compressor.knee.value = 40;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0;
        this.compressor.release.value = 0.25;

        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 2048;

        // Connect Chain: MasterGain -> Compressor -> Analyser -> Destination
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.context.destination);

        // 3. Initialize Sun Layer
        this.sunLayer = new SunLayer(this.context);
        this.sunLayer.connect(this.masterGain);

        console.log('Audio Engine Initialized');
    }

    public updateSunParams(params: Partial<SunParameters>) {
        if (this.sunLayer) {
            this.sunLayer.updateParams(params);
        }
    }

    public getSunParams(): SunParameters | null {
        return this.sunLayer ? this.sunLayer.getParams() : null;
    }

    public resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    public suspend() {
        if (this.context && this.context.state === 'running') {
            this.context.suspend();
        }
    }
}
