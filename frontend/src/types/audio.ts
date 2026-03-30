export interface SunParameters {
    rootFrequency: number; // Hz
    filterCutoff: number;  // Hz (was brightness)
    filterResonance: number; // Q factor (0-20)
    detuneSpread: number;  // Cents (was richness)
    lfoRate: number;       // Hz (was pulseRate)
    gainLevel: number;     // dB (was volume)
    waveform: 'sine' | 'triangle' | 'sawtooth' | 'square';
    distortion: number; // 0-100
    noiseVol: number; // dB
    subVol: number; // dB
    noiseEnabled: boolean;
    subEnabled: boolean;
    modDepth?: number; // 0-100%
    modTarget?: string; // key of target param
}

export interface AudioLayer {
    readonly id: string;
    readonly type: string;
    readonly analyser: AnalyserNode;
    connect(destination: AudioNode): void;
    disconnect(): void;
    setVolume(value: number): void;
    updateParams(params: Partial<SunParameters>): void;
    getParams(): SunParameters;
    dispose(): void;
}
