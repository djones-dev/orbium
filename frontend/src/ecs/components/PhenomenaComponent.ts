import { NoteEvent } from '@/events/NoteEvents';
import { Component, ComponentType } from './Component';

export type PhenomenonType = 'comet' | 'pulsar' | 'lagrange_point';

export interface ZoneOfInfluence {
    // Define properties for zone of influence, e.g.,
    radiusRange?: [number, number];
    angleRange?: [number, number];
    proximity?: number;
}

export type NoteModifier = (note: NoteEvent) => NoteEvent | null;

export interface PhenomenaComponent extends Component {
    readonly type: ComponentType.Phenomena;
    phenomenonType: PhenomenonType;
    zone: ZoneOfInfluence;
    modifier: NoteModifier;
    properties: Record<string, any>;
}

export const createPhenomenaComponent = (
    phenomenonType: PhenomenonType,
    zone: ZoneOfInfluence,
    modifier: NoteModifier,
    properties: Record<string, any> = {},
): PhenomenaComponent => ({
    type: ComponentType.Phenomena,
    phenomenonType,
    zone,
    modifier,
    properties,
});
