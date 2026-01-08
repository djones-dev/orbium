export interface SunParameters {
    rootFrequency: number; // Hz
    filterCutoff: number;  // Hz (was brightness)
    detuneSpread: number;  // Cents (was richness)
    lfoRate: number;       // Hz (was pulseRate)
    gainLevel: number;     // dB (was volume)
    waveform: 'sine' | 'triangle' | 'sawtooth' | 'square';
    distortion: number; // 0-100
    noiseVol: number; // dB
    subVol: number; // dB
    noiseEnabled: boolean;
    subEnabled: boolean;
}

export interface AudioLayer {
    connect(destination: AudioNode): void;
    disconnect(): void;
    setVolume(value: number): void;
}
