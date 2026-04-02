import { AudioParams, OscillatorType, EffectType } from './audio';
import { PresetCategory } from './preset';

export type ModuleRole = 'oscillator' | 'effect' | 'modulator' | 'phenomenon';

export interface SynthModule {
    id: string;
    name: string;
    description: string;
    role: ModuleRole;
    category: PresetCategory;
    oscillatorType?: OscillatorType;
    effectType?: EffectType;
    defaults: Partial<AudioParams>;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface ModuleFilters {
    role?: ModuleRole;
    category?: PresetCategory;
    oscillatorType?: OscillatorType;
    sortBy?: 'name' | 'role' | 'createdAt';
    order?: 'asc' | 'desc';
}
