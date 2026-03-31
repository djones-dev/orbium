/**
 * Audio Type System — Modular Parameter Hierarchy
 *
 * This replaces the monolithic SunParameters with per-module typed interfaces
 * and a discriminated OscillatorConfig for different oscillator types.
 *
 * Usage:
 * - Layers and effects accept Partial<AudioParams>
 * - Each module reads only its own nested keys
 * - OscillatorConfig discriminates by type for type-safe oscillator selection
 */

// === Oscillator Types ===

export type OscillatorType = 'basic' | 'fm' | 'wavetable' | 'additive';

// Basic oscillator: sine/triangle/saw/square + sub + noise
export interface BasicOscillatorParams {
  rootFrequency: number;
  detuneSpread: number;
  waveform: 'sine' | 'triangle' | 'sawtooth' | 'square';
  subVol: number;
  subEnabled: boolean;
  noiseVol: number;
  noiseEnabled: boolean;
}

// Stubs for future oscillator types
export interface FMOscillatorParams {
  rootFrequency: number;
  modulationIndex: number;
  harmonicity: number;
}

export interface WavetableOscillatorParams {
  rootFrequency: number;
  wavetableIndex: number;
  interpolation: 'linear' | 'cubic';
}

export interface AdditiveOscillatorParams {
  rootFrequency: number;
  harmonics: number;
  rolloff: number;
}

// Discriminated union for type-safe oscillator configuration
export type OscillatorConfig =
  | { type: 'basic'; params: Partial<BasicOscillatorParams> }
  | { type: 'fm'; params: Partial<FMOscillatorParams> }
  | { type: 'wavetable'; params: Partial<WavetableOscillatorParams> }
  | { type: 'additive'; params: Partial<AdditiveOscillatorParams> };

// === Effect Parameter Interfaces ===

export interface FilterParams {
  filterCutoff: number;
  filterResonance: number;
  lfoRate: number;
}

export interface DistortionParams {
  distortion: number;
}

export interface ReverbParams {
  reverbMix: number;
  reverbSize: number;
}

export interface PhaserParams {
  phaserRate: number;
  phaserDepth: number;
  phaserFeedback: number;
}

export interface EnvelopeParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

// === Master Audio Parameters (replaces SunParameters) ===

export type EffectType = 'reverb' | 'phaser' | 'atmosphere' | 'distortion';
export type ModulatorType = 'lfo' | 'adsr';

export interface AudioParams {
  oscillator: OscillatorConfig;
  gainLevel: number;
  filter?: Partial<FilterParams>;
  distortion?: Partial<DistortionParams>;
  reverb?: Partial<ReverbParams>;
  phaser?: Partial<PhaserParams>;
  envelope?: Partial<EnvelopeParams>;
  effects?: EffectType[];
  // Modulation routing
  modType?: ModulatorType;
  modDepth?: number;
  modTarget?: string; // dot-path like "filter.filterCutoff"
}

// === Audio Layer Interface ===

export interface AudioLayer {
  readonly id: string;
  readonly type: string;
  readonly analyser: AnalyserNode;
  connect(destination: AudioNode): void;
  disconnect(): void;
  setVolume(value: number): void;
  updateParams(params: Partial<AudioParams>): void;
  getParams(): AudioParams;
  dispose(): void;
  trigger?(time: number): void;
}
