import { SimPosition } from '../simulation/types';

export enum NoteEventType {
    NOTE_EVENT_FIRED = 'note:fired',
    MODIFIED_NOTE_EVENT = 'note:modified',
}

export interface NoteEventModifier {
    sourceId: string; // ID of the phenomenon that applied the modifier
    type: string; // e.g., 'pitch_shift', 'gate', 'delay'
    params: Record<string, any>; // modifier-specific parameters
}

export interface NoteEvent {
    id: string; // Unique ID for this note event
    planetId: string; // ID of the planet that triggered the note
    pitch: number; // MIDI note number or frequency
    velocity: number; // 0-1
    timestamp: number; // performance.now()
    position: SimPosition;
    modifiers: NoteEventModifier[];
}
