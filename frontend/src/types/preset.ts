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

// Re-export new module types
export type { SynthModule, ModuleRole, ModuleFilters } from './module';
import type { SynthModule, ModuleRole } from './module';

// Adapter: convert backend Preset JSON to SynthModule frontend type
export function toSynthModule(p: Preset): SynthModule {
    const roleMap: Record<PresetType, ModuleRole> = {
        generator: 'oscillator',
        effect: 'effect',
        modulator: 'modulator',
        phenomenon: 'phenomenon',
    };
    return {
        id: p.id,
        name: p.name,
        description: p.description,
        role: roleMap[p.type] ?? 'oscillator',
        category: p.category,
        defaults: p.parameters,
        is_default: p.is_default,
        created_at: p.created_at,
        updated_at: p.updated_at,
    };
}
