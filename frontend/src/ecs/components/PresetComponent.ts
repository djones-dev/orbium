import { Component, ComponentType } from './Component';
import { OrbitalBodyType } from '../../types/orbital';

export interface PresetComponent extends Component {
    readonly type: ComponentType.Preset;
    bodyType: OrbitalBodyType;
    presetId?: string; // absent for the primary sun
}

export const createPresetComponent = (
    bodyType: OrbitalBodyType,
    presetId?: string,
): PresetComponent => ({
    type: ComponentType.Preset,
    bodyType,
    presetId,
});
