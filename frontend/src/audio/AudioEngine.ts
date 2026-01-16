import { SunLayer } from './SunLayer';
import { SunParameters } from '../types/audio';
import { OrbitalBodiesManager } from '../simulation/OrbitalBodiesManager';
import { PresetManager } from '../presets/PresetManager';
// @ts-ignore
import noiseProcessorUrl from './worklets/noise-processor.js?url';

export class AudioEngine {
    private static instance: AudioEngine;
    public context: AudioContext | null = null;
    public masterGain: GainNode | null = null;
    public compressor: DynamicsCompressorNode | null = null;
    public limiter: DynamicsCompressorNode | null = null;
    public analyser: AnalyserNode | null = null;
    public sunLayer: SunLayer | null = null;
    public bodiesManager: OrbitalBodiesManager;
    public presets: PresetManager;

    private constructor() {
        this.presets = new PresetManager();
        this.bodiesManager = new OrbitalBodiesManager((id, params) => {
            // Check if this is the sun
            const body = this.bodiesManager.getBodyById(id);
            if (body && body.type === 'sun') {
                this.updateSunParams(params);
            }
        });
    }

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

        // Load AudioWorklet Modules
        try {
            await this.context.audioWorklet.addModule(noiseProcessorUrl);
        } catch (e) {
            console.error('Failed to load AudioWorklet:', e);
        }

        // 2. Master Chain
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.8;

        // Bus Compressor (Glue)
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 4; // Gentle glue
        this.compressor.attack.value = 0.01;
        this.compressor.release.value = 0.25;

        // Safety Limiter (Brickwall-ish)
        this.limiter = this.context.createDynamicsCompressor();
        this.limiter.threshold.value = -0.5;
        this.limiter.knee.value = 0;
        this.limiter.ratio.value = 20; // Hard limiting
        this.limiter.attack.value = 0.001; // Fast
        this.limiter.release.value = 0.1;

        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 2048;

        // Connect Chain: MasterGain -> Compressor -> Limiter -> Analyser -> Destination
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.limiter);
        this.limiter.connect(this.analyser);
        this.analyser.connect(this.context.destination);

        // 3. Initialize Sun Layer
        this.sunLayer = new SunLayer(this.context);
        this.sunLayer.connect(this.masterGain);

        // Register Sun as an OrbitalBody
        this.bodiesManager.addBody({
            id: 'sun-primary',
            type: 'sun',
            position: { radius: 0, angle: 0 },
            velocity: 0,
            audioParams: this.sunLayer.getParams(),
            audioLayerId: 'sun-main-layer',
            visualConfig: {
                color: '#ffcc00',
                size: 1.4,
                shaderUniforms: {} // Populated by Sun.tsx
            }
        });

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
