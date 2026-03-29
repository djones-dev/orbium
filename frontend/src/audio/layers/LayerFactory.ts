import { AudioLayer } from '../../types/audio';
import { SunLayer } from './SunLayer';

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
            case 'planet':
            case 'moon':
            default:
                return new SunLayer(context, config.id);
        }
    }
}
