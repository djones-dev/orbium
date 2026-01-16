import { SunParameters } from './audio';

export type OrbitalBodyType = 'sun' | 'planet' | 'moon';

export interface OrbitalBody {
    id: string;
    type: OrbitalBodyType;
    position: {
        radius: number;
        angle: number;
    };
    velocity: number; // Angular velocity
    audioParams: Partial<SunParameters>;
    audioLayerId: string;
    visualConfig: {
        color: string;
        size: number;
        shaderUniforms: Record<string, any>;
    };
}
