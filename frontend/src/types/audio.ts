export interface SunParameters {
    rootFrequency: number; // Hz
    filterCutoff: number;  // Hz (was brightness)
    detuneSpread: number;  // Cents (was richness)
    lfoRate: number;       // Hz (was pulseRate)
    gainLevel: number;     // dB (was volume)
}

export interface AudioLayer {
    connect(destination: AudioNode): void;
    disconnect(): void;
    setVolume(value: number): void;
}
