import { Component, ComponentType } from './Component';
import { OrbitalBodyType } from '../../types/orbital';
import { PresetType } from '../../types/preset';

export interface PresetComponent extends Component {
    readonly type: ComponentType.Preset;
    bodyType: OrbitalBodyType;
    presetType?: PresetType;
    presetId?: string; // absent for the primary sun
}

export const createPresetComponent = (
    bodyType: OrbitalBodyType,
    presetId?: string,
    presetType?: PresetType,
): PresetComponent => ({
    type: ComponentType.Preset,
    bodyType,
    presetType,
    presetId,
});
