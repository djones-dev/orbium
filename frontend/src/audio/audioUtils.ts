// Standard A4 frequency
const A4_FREQ = 440;

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert frequency (Hz) to the nearest Note Name (e.g. 440 -> "A4")
 */
export const freqToNote = (freq: number): string => {
    if (freq <= 0) return '';

    // Formula: MIDI = 69 + 12 * log2(freq / 440)
    const midi = Math.round(69 + 12 * Math.log2(freq / A4_FREQ));

    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    const noteName = NOTES[noteIndex >= 0 ? noteIndex : noteIndex + 12];

    return `${noteName}${octave}`;
};

/**
     * Convert frequency (Hz) to an exact string representation with "Hz"
 */
export const freqToDisplay = (freq: number): string => {
    return `${freq.toFixed(2)} Hz`;
};

/**
 * Convert a linear slider value (0-1) to a logarithmic frequency
 */
export const toLogScale = (value0to1: number, min: number, max: number): number => {
    // min * (max / min) ^ value
    return min * Math.pow(max / min, value0to1);
};

/**
 * Convert a logarithmic frequency to a linear slider value (0-1)
 */
export const fromLogScale = (freq: number, min: number, max: number): number => {
    // log(freq / min) / log(max / min)
    return Math.log(freq / min) / Math.log(max / min);
};

export const midiToFreq = (midi: number): number => {
    return A4_FREQ * Math.pow(2, (midi - 69) / 12);
};

export const freqToMidi = (freq: number): number => {
    if (freq <= 0) return 0;
    return 69 + 12 * Math.log2(freq / A4_FREQ);
};
