import { NoteEvent } from "@/events/NoteEvents";
import { VelocityComponent } from "../components/VelocityComponent";
import { World } from "../World";
import { ComponentType } from "../components/Component";
import { PhenomenaComponent } from "../components/PhenomenaComponent";

export const cometModifier = (phenomenonId: string) => (note: NoteEvent): NoteEvent | null => {
    const world = World.getInstance();
    const velocity = world.entities.getComponent<VelocityComponent>(phenomenonId, ComponentType.Velocity);
    if (!velocity) return note;

    const pitchShift = (velocity.angular * 100); // placeholder scaling factor
    const modifiedNote = {
        ...note,
        pitch: note.pitch + pitchShift,
    };
    modifiedNote.modifiers.push({
        sourceId: phenomenonId,
        type: 'comet_pitch_shift',
        params: { pitchShift }
    });

    return modifiedNote;
};

export const pulsarModifier = (phenomenonId: string) => (note: NoteEvent): NoteEvent | null => {
    const world = World.getInstance();
    const phenomenon = world.entities.getComponent<PhenomenaComponent>(phenomenonId, ComponentType.Phenomena);
    if (!phenomenon || phenomenon.phenomenonType !== 'pulsar') return note;

    const { beamAngle = 0, beamWidth = 0.1 } = phenomenon.properties;
    const angleToPlanet = note.position.angle;
    
    let angleDifference = Math.abs(angleToPlanet - beamAngle);
    angleDifference = Math.min(angleDifference, 2 * Math.PI - angleDifference);

    if (angleDifference <= beamWidth / 2) {
        note.modifiers.push({
            sourceId: phenomenonId,
            type: 'pulsar_gate',
            params: { beamAngle, beamWidth, angleToPlanet }
        });
        return note;
    } else {
        return null;
    }
};

const scales = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
};

const pitchToMidi = (pitch: number) => {
    return 69 + 12 * Math.log2(pitch / 440);
};

const midiToPitch = (midi: number) => {
    return 440 * Math.pow(2, (midi - 69) / 12);
};

const quantize = (midi: number, scale: number[], root: number) => {
    const octave = Math.floor(midi / 12);
    const noteInOctave = midi % 12;
    const rootNote = root % 12;

    let closest = scale[0];
    let smallestDistance = Infinity;

    for (const scaleNote of scale) {
        let dist = Math.abs(noteInOctave - (rootNote + scaleNote) % 12);
        dist = Math.min(dist, 12 - dist);
        if (dist < smallestDistance) {
            smallestDistance = dist;
            closest = scaleNote;
        }
    }
    
    return (octave * 12) + rootNote + closest;
}

export const lagrangeModifier = (phenomenonId: string) => (note: NoteEvent): NoteEvent | null => {
    const world = World.getInstance();
    const phenomenon = world.entities.getComponent<PhenomenaComponent>(phenomenonId, ComponentType.Phenomena);
    if (!phenomenon || phenomenon.phenomenonType !== 'lagrange_point') return note;

    const { scale = 'major', root = 60 } = phenomenon.properties;
    const scaleNotes = scales[scale as keyof typeof scales] ?? scales.major;
    
    const midiNote = pitchToMidi(note.pitch);
    const quantizedMidi = quantize(midiNote, scaleNotes, root);
    const quantizedPitch = midiToPitch(quantizedMidi);

    const modifiedNote = {
        ...note,
        pitch: quantizedPitch,
    };

    modifiedNote.modifiers.push({
        sourceId: phenomenonId,
        type: 'lagrange_quantize',
        params: { scale, root, originalPitch: note.pitch, quantizedPitch }
    });
    
    return modifiedNote;
};