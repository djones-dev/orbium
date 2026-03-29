import { SunParameters, AudioLayer } from '../types/audio';
import { OrbitalBodiesManager } from '../simulation/OrbitalBodiesManager';
import { PresetManager } from '../presets/PresetManager';
import { OrbitalBody } from '../types/orbital';
import { Preset } from '../types/preset';
import { EventBus } from '../events/EventBus';
import {
    AudioEventType,
    BodyAddedEvent,
    BodyRemovedEvent,
    ParamsChangedEvent,
} from '../events/AudioEvents';
import { MasterChain } from './MasterChain';
import { WorkletManager } from './WorkletManager';
import { LayerFactory } from './layers/LayerFactory';
import { SunLayer } from './layers/SunLayer';
// @ts-ignore
import noiseProcessorUrl from './worklets/noise-processor.js?url';

export class AudioEngine {
    private static instance: AudioEngine;

    public context: AudioContext | null = null;
    public sunLayer: SunLayer | null = null;
    public bodiesManager: OrbitalBodiesManager;
    public presets: PresetManager;
    public layers = new Map<string, AudioLayer>();

    private masterChain: MasterChain | null = null;
    private workletManager = new WorkletManager();
    private bus = EventBus.getInstance();
    private unsubscribers: Array<() => void> = [];

    private constructor() {
        this.presets = new PresetManager();
        this.bodiesManager = new OrbitalBodiesManager();
        this.wireEventHandlers();
    }

    public static getInstance(): AudioEngine {
        if (!AudioEngine.instance) {
            AudioEngine.instance = new AudioEngine();
        }
        return AudioEngine.instance;
    }

    /** Expose master chain nodes for visualisation / metering. */
    get masterGain(): GainNode | null { return this.masterChain?.gain ?? null; }
    get compressor(): DynamicsCompressorNode | null { return this.masterChain?.compressor ?? null; }
    get limiter(): DynamicsCompressorNode | null { return this.masterChain?.limiter ?? null; }
    get analyser(): AnalyserNode | null { return this.masterChain?.analyser ?? null; }

    private wireEventHandlers(): void {
        this.unsubscribers.push(
            this.bus.on<BodyAddedEvent>(AudioEventType.BODY_ADDED, ({ body }) => {
                this.handleBodyAdded(body);
            }),
            this.bus.on<BodyRemovedEvent>(AudioEventType.BODY_REMOVED, ({ id }) => {
                this.handleBodyRemoved(id);
            }),
            this.bus.on<ParamsChangedEvent>(AudioEventType.PARAMS_CHANGED, ({ id, params }) => {
                this.handleParamsChanged(id, params);
            }),
        );
    }

    public async initialize(): Promise<void> {
        if (this.context) {
            if (this.context.state === 'suspended') {
                await this.context.resume();
            }
            return;
        }

        const AudioContextClass =
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.context = new AudioContextClass();

        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        try {
            await this.workletManager.load(this.context, noiseProcessorUrl, 'noise-processor');
        } catch (e) {
            // Noise will fall back to silent node inside SunLayer
        }

        this.masterChain = new MasterChain(this.context);

        this.sunLayer = new SunLayer(this.context, 'sun-primary');
        this.sunLayer.connect(this.masterChain.gain);

        await this.bodiesManager.addBody(
            {
                id: 'sun-primary',
                type: 'sun',
                position: { radius: 0, angle: 0 },
                velocity: 0,
                audioParams: this.sunLayer.getParams(),
                audioLayerId: 'sun-main-layer',
                visualConfig: { color: '#ffcc00', size: 1.4, shaderUniforms: {} },
            },
            false,
        );

        await this.bodiesManager.loadFromBackend();

        console.log('Audio Engine Initialized');
    }

    private handleBodyAdded(body: OrbitalBody): void {
        if (!this.context || !this.masterChain) return;
        if (body.type === 'sun') return;
        if (this.layers.has(body.id)) return;

        const layer = LayerFactory.create(this.context, {
            id: body.id,
            bodyType: body.type,
        });

        if (body.audioParams) {
            layer.updateParams(body.audioParams);
        }

        layer.connect(this.masterChain.gain);
        this.layers.set(body.id, layer);
    }

    private handleBodyRemoved(id: string): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.dispose();
            this.layers.delete(id);
        }
    }

    private handleParamsChanged(id: string, params: Partial<SunParameters>): void {
        if (id === 'sun-primary') {
            this.sunLayer?.updateParams(params);
            return;
        }
        this.layers.get(id)?.updateParams(params);
    }

    public async instantiateBodyFromPreset(
        preset: Preset,
        position: { radius: number; angle: number },
    ): Promise<void> {
        const id = crypto.randomUUID();
        const body: OrbitalBody = {
            id,
            type: preset.type === 'generator' ? 'planet' : 'moon',
            presetId: preset.id,
            position,
            velocity: 0.2,
            audioParams: preset.parameters,
            audioLayerId: `layer-${id}`,
            visualConfig: {
                color: preset.type === 'generator' ? '#4169E1' : '#32CD32',
                size: preset.type === 'generator' ? 20 : 10,
                shaderUniforms: {},
            },
        };
        await this.bodiesManager.addBody(body);
    }

    public updateSunParams(params: Partial<SunParameters>): void {
        this.sunLayer?.updateParams(params);
    }

    public getSunParams(): SunParameters | null {
        return this.sunLayer ? this.sunLayer.getParams() : null;
    }

    public resume(): void {
        if (this.context?.state === 'suspended') {
            this.context.resume();
        }
    }

    public suspend(): void {
        if (this.context?.state === 'running') {
            this.context.suspend();
        }
    }
}
