export type EffectType = 'reverb' | 'phaser' | 'atmosphere' | 'distortion';
export type ModulatorType = 'lfo' | 'adsr';

export interface SunParameters {
    rootFrequency: number; // Hz
    filterCutoff: number;  // Hz
    filterResonance: number; // Q factor (0-20)
    detuneSpread: number;  // Cents
    lfoRate: number;       // Hz
    gainLevel: number;     // dB
    waveform: 'sine' | 'triangle' | 'sawtooth' | 'square';
    distortion: number; // 0-100 (Legacy)
    noiseVol: number; // dB
    subVol: number; // dB
    noiseEnabled: boolean;
    subEnabled: boolean;
    
    // Modulation
    modType?: ModulatorType;
    modDepth?: number; // 0-100%
    modTarget?: string; // key of target param
    
    // ADSR (used if modType === 'adsr')
    attack?: number;  // seconds
    decay?: number;   // seconds
    sustain?: number; // 0-1
    release?: number; // seconds
    
    effects?: EffectType[]; // Active effects
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
