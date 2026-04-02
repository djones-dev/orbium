import { Component, ComponentType } from './Component';
import { OrbitalBodyType } from '../../types/orbital';
import { ModuleRole } from '../../types/module';

export interface PresetComponent extends Component {
    readonly type: ComponentType.Preset;
    bodyType: OrbitalBodyType;
    presetType?: ModuleRole;
    presetId?: string; // absent for the primary sun
}

export const createPresetComponent = (
    bodyType: OrbitalBodyType,
    presetId?: string,
    presetType?: ModuleRole,
): PresetComponent => ({
    type: ComponentType.Preset,
    bodyType,
    presetType,
    presetId,
});
