export enum ComponentType {
    Position = 'position',
    Velocity = 'velocity',
    Audio = 'audio',
    Visual = 'visual',
    Hierarchy = 'hierarchy',
    Preset = 'preset',
    Physics = 'physics',
    Modulation = 'modulation',
    Effect = 'effect',
    Collider = 'collider',
    Metadata = 'metadata',
    Phenomena = 'phenomena',
}

/** Marker interface — all components carry their discriminant type. */
export interface Component {
    readonly type: ComponentType;
}
