export enum SimulationEventType {
    BODY_POSITION_UPDATED = 'sim:position_updated',
    BODY_TRIGGER_FIRED = 'sim:trigger_fired',
    BODIES_LOADED = 'sim:bodies_loaded',
    BODY_COLLISION = 'sim:collision',
}

export interface BodyCollisionEvent {
    idA: string;
    idB: string;
    distance: number;
}

export interface BodyPositionUpdatedEvent {
    id: string;
    radius: number;
    angle: number;
}

export interface BodyTriggerFiredEvent {
    id: string;
    angle: number;
    timestamp: number;
}

export interface BodiesLoadedEvent {
    count: number;
}
