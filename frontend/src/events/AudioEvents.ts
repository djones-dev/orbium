import { OrbitalBody } from '../types/orbital';
import { AudioParams } from '../types/audio';

export enum AudioEventType {
    BODY_ADDED = 'audio:body_added',
    BODY_REMOVED = 'audio:body_removed',
    PARAMS_CHANGED = 'audio:params_changed',
    ENGINE_INITIALIZED = 'audio:engine_initialized',
    ENGINE_SUSPENDED = 'audio:engine_suspended',
    ENGINE_RESUMED = 'audio:engine_resumed',
}

export interface BodyAddedEvent {
    body: OrbitalBody;
}

export interface BodyRemovedEvent {
    id: string;
}

export interface ParamsChangedEvent {
    id: string;
    params: Partial<AudioParams>;
}

export interface EngineInitializedEvent {
    contextSampleRate: number;
}
