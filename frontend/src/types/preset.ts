import { SunParameters } from './audio';

export type PresetType = 'generator' | 'effect' | 'modulator';
export type PresetCategory = 'planet' | 'moon' | 'attribute' | 'sun';

export interface Preset {
    id: string;
    name: string;
    description: string;
    type: PresetType;
    category: PresetCategory;
    parameters: Partial<SunParameters>;
    metadata: {
        createdAt: number;
        updatedAt: number;
    };
}
