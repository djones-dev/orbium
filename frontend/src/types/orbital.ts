import { AudioParams } from './audio';
import { PresetType } from './preset';

export type OrbitalBodyType = 'sun' | 'planet' | 'moon' | 'phenomenon';

export interface OrbitalBody {
    id: string;
    name?: string;
    type: OrbitalBodyType;
    position: {
        radius: number;
        angle: number;
    };
    velocity: number; // Angular velocity
    audioParams: Partial<AudioParams>;
    audioLayerId: string;
    visualConfig: {
        color: string;
        size: number;
        shaderUniforms: Record<string, any>;
    };
    // Backend persistence fields
    presetId?: string;
    presetType?: PresetType;
    attributes?: Record<string, any>[];
    parentId?: string;
}
