import { AudioLayer, AudioParams } from '../../types/audio';
import { SunLayer } from './SunLayer';
import { PlanetLayer } from './PlanetLayer';

class SilentLayer implements AudioLayer {
    readonly id: string;
    readonly type: string = 'silent';
    readonly analyser: AnalyserNode;
    private gain: GainNode;

    constructor(context: AudioContext, id:string) {
        this.id = id;
        this.gain = context.createGain();
        this.gain.gain.value = 0;
        this.analyser = context.createAnalyser();
        this.gain.connect(this.analyser);
    }
    connect(destination: AudioNode): void { this.analyser.connect(destination); }
    disconnect(): void { this.analyser.disconnect(); }
    setVolume(_value: number): void {}
    updateParams(_params: Partial<AudioParams>): void {}
    getParams(): AudioParams { return {} as AudioParams; }
    dispose(): void { this.disconnect(); }
    trigger(_time: number): void {}
}


export interface LayerConfig {
    id: string;
    bodyType: string;
}

/**
 * Creates audio layers based on body type.
 * Extend the switch statement to add new layer types as new body types are introduced.
 */
export class LayerFactory {
    static create(context: AudioContext, config: LayerConfig): AudioLayer {
        switch (config.bodyType) {
            case 'sun':
                return new SunLayer(context, config.id);
            case 'planet':
                return new PlanetLayer(context, config.id);
            case 'moon':
            case 'phenomenon':
                return new SilentLayer(context, config.id);
            default:
                return new SunLayer(context, config.id);
        }
    }
}
