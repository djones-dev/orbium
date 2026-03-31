import { AudioParams } from './audio';

export type PresetType = 'generator' | 'effect' | 'modulator' | 'phenomenon';
export type PresetCategory = 'planet' | 'moon' | 'attribute' | 'sun' | 'phenomenon';

export interface Preset {
    id: string;
    name: string;
    description: string;
    type: PresetType;
    category: PresetCategory;
    parameters: Partial<AudioParams>;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface PresetFilters {
    type?: PresetType;
    category?: PresetCategory;
    sortBy?: 'name' | 'type' | 'createdAt';
    order?: 'asc' | 'desc';
}
