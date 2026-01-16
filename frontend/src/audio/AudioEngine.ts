// Imports
import { SunLayer } from './SunLayer';
import { SunParameters } from '../types/audio';
import { OrbitalBodiesManager } from '../simulation/OrbitalBodiesManager';
import { PresetManager } from '../presets/PresetManager';
import { OrbitalBody } from '../types/orbital';
import { Preset } from '../types/preset';
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
    public layers = new Map<string, SunLayer>(); // Manage multiple layers

    private constructor() {
        this.presets = new PresetManager();
        this.bodiesManager = new OrbitalBodiesManager(
            (id, params) => {
                // onParamsChange
                if (id === 'sun-primary') {
                    this.updateSunParams(params);
                    return;
                }
                const layer = this.layers.get(id);
                if (layer) {
                    layer.updateParams(params);
                }
            },
            (body) => {
                // onBodyAdded
                this.createLayerForBody(body);
            },
            (id) => {
                // onBodyRemoved
                this.removeLayerForBody(id);
            }
        );
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
                shaderUniforms: {}
            }
        }, false); // Sync false because sun is static/default

        // Load bodies from backend
        // This will trigger onBodyAdded for each body, creating layers
        await this.bodiesManager.loadFromBackend();

        // If Sun was loaded from backend, we might have a duplicate 'sun-primary' or conflict.
        // For simplicity, we assume backend stores planets/moons. 
        // If backend sends a 'sun', we should probably reuse the sunLayer.
        // Current implementation of createLayerForBody handles this check.

        console.log('Audio Engine Initialized');
    }

    private createLayerForBody(body: OrbitalBody) {
        if (!this.context || !this.masterGain) return;

        if (body.type === 'sun') {
            // If it's the primary sun, we already have it.
            // If we support multiple suns, we'd add logic here.
            return;
        }

        if (this.layers.has(body.id)) return;

        console.log(`Creating audio layer for body ${body.id} (${body.type})`);
        const layer = new SunLayer(this.context);
        if (body.audioParams) {
            layer.updateParams(body.audioParams);
        }
        layer.connect(this.masterGain);
        this.layers.set(body.id, layer);
    }

    private removeLayerForBody(id: string) {
        const layer = this.layers.get(id);
        if (layer) {
            console.log(`Removing audio layer for body ${id}`);
            layer.dispose();
            this.layers.delete(id);
        }
    }

    public async instantiateBodyFromPreset(preset: Preset, position: { radius: number, angle: number }) {
        const id = crypto.randomUUID();
        const body: OrbitalBody = {
            id,
            type: preset.type === 'generator' ? 'planet' : 'moon',
            presetId: preset.id,
            position,
            velocity: 0.2, // Default velocity
            audioParams: preset.parameters,
            audioLayerId: `layer-${id}`,
            visualConfig: {
                color: preset.type === 'generator' ? '#4169E1' : '#32CD32',
                size: preset.type === 'generator' ? 20 : 10,
                shaderUniforms: {}
            }
        };

        // Add to manager, which triggers onBodyAdded -> createLayerForBody
        await this.bodiesManager.addBody(body);
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
