import React, { useState, useEffect } from 'react';
import { TerminalPanel } from './terminal/TerminalPanel';
import { TerminalSlider } from './terminal/TerminalSlider';
import { TerminalSelect } from './terminal/TerminalSelect';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { AudioParams, BasicOscillatorParams, FilterParams } from '../types/audio';
import { freqToNote, midiToFreq, freqToMidi } from '../audio/audioUtils';

// Available Root Modes
type RootMode = 'HZ' | 'NOTE';

export const SunPanel: React.FC = () => {
    const { engine, isAudioActive } = useAudioEngine();
    const SUN_ID = 'sun-primary';

    // Initial State must match AudioEngine default
    const [params, setParams] = useState<AudioParams>({
        oscillator: {
            type: 'basic',
            params: {
                rootFrequency: 110,
                detuneSpread: 10,
                waveform: 'sine',
                subVol: -12,
                subEnabled: true,
                noiseVol: -40,
                noiseEnabled: true,
            }
        },
        gainLevel: -12,
        filter: {
            filterCutoff: 1000,
            filterResonance: 1.0,
            lfoRate: 0.5,
        },
        distortion: { distortion: 0 },
        reverb: { reverbMix: 0.3, reverbSize: 2.0 },
        phaser: { phaserRate: 0.5, phaserDepth: 0.5, phaserFeedback: 0.4 },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.0 },
        effects: [],
    });

    // UI State
    const [rootMode, setRootMode] = useState<RootMode>('HZ');

    // Sync params from engine on mount/update
    useEffect(() => {
        const current = engine.getSunParams();
        if (current) {
            setParams(current);
        }
    }, [engine, isAudioActive]);

    // Helper to get current oscillator params
    const oscParams = () => (params.oscillator as any)?.params ?? {};

    // Per-module update helpers that build properly nested updates
    const updateOscParam = (key: keyof BasicOscillatorParams, value: any) => {
        const updated: Partial<AudioParams> = { oscillator: { type: 'basic', params: { ...oscParams(), [key]: value } } };
        setParams(prev => ({ ...prev, oscillator: updated.oscillator! }));
        engine.bodiesManager.updateBodyParams(SUN_ID, updated);
    };

    const updateFilterParam = (key: keyof FilterParams, value: number) => {
        const updated: Partial<AudioParams> = { filter: { ...params.filter, [key]: value } };
        setParams(prev => ({ ...prev, filter: { ...prev.filter, ...updated.filter } }));
        engine.bodiesManager.updateBodyParams(SUN_ID, updated);
    };

    const updateDistortion = (value: number) => {
        const updated: Partial<AudioParams> = { distortion: { distortion: value } };
        setParams(prev => ({ ...prev, distortion: updated.distortion }));
        engine.bodiesManager.updateBodyParams(SUN_ID, updated);
    };

    const updateGain = (value: number) => {
        setParams(prev => ({ ...prev, gainLevel: value }));
        engine.bodiesManager.updateBodyParams(SUN_ID, { gainLevel: value });
    };

    // Special handler for Root Frequency to support modes
    const handleRootChange = (value: number) => {
        if (rootMode === 'NOTE') {
            // value comes in as MIDI index from the slider
            const freq = midiToFreq(Math.round(value));
            updateOscParam('rootFrequency', freq);
        } else {
            // value is Hz
            updateOscParam('rootFrequency', value);
        }
    };

    // Calculate current MIDI value for the slider when in Note mode
    // We assume the stored param is always Hz
    const currentMidi = freqToMidi((params.oscillator as any)?.params?.rootFrequency ?? 110);

    return (
        <div className="sun-panel-container pointer-events-auto">
            <TerminalPanel title="SUN PARAMETERS">

                {/* TOOLBAR / MODE SWITCH */}
                <div className="flex justify-end px-2 pt-1">
                    <div className="flex gap-2 text-[10px] font-mono">
                        <button
                            onClick={() => setRootMode('HZ')}
                            className={`px-2 py-0.5 border ${rootMode === 'HZ' ? 'bg-[var(--color-accent-primary)] text-black border-[var(--color-accent-primary)]' : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-white'}`}
                        >
                            HZ MODE
                        </button>
                        <button
                            onClick={() => setRootMode('NOTE')}
                            className={`px-2 py-0.5 border ${rootMode === 'NOTE' ? 'bg-[var(--color-accent-primary)] text-black border-[var(--color-accent-primary)]' : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-white'}`}
                        >
                            NOTE MODE
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2 p-2">

                    <TerminalSelect
                        label="WAVEFORM"
                        value={(params.oscillator as any)?.params?.waveform ?? 'sine'}
                        options={[
                            { label: 'SINE', value: 'sine' },
                            { label: 'TRI', value: 'triangle' },
                            { label: 'SAW', value: 'sawtooth' },
                            { label: 'SQR', value: 'square' },
                        ]}
                        onChange={(v) => updateOscParam('waveform', v as any)}
                    />

                    {/* ROOT Slider changes behavior based on Mode */}
                    {rootMode === 'HZ' ? (
                        <TerminalSlider
                            label="ROOT FREQ"
                            value={(params.oscillator as any)?.params?.rootFrequency ?? 110}
                            min={20}
                            max={880}
                            unit=" Hz"
                            logarithmic={true}
                            precision={1}
                            onChange={handleRootChange}
                        />
                    ) : (
                        <TerminalSlider
                            label="ROOT NOTE"
                            value={currentMidi}
                            min={21} // A0
                            max={108} // C8
                            unit=""
                            precision={0}
                            // Display the calculated Note Name for the current MIDI integer
                            formatValue={(v) => freqToNote(midiToFreq(Math.round(v)))}
                            onChange={handleRootChange}
                        />
                    )}

                    <TerminalSlider
                        label="CUTOFF"
                        value={params.filter?.filterCutoff ?? 1000}
                        min={20}
                        max={10000}
                        unit=" Hz"
                        logarithmic={true}
                        formatValue={(v) => `${Math.round(v)} Hz`}
                        onChange={(v) => updateFilterParam('filterCutoff', v)}
                    />

                    <TerminalSlider
                        label="SPREAD"
                        value={(params.oscillator as any)?.params?.detuneSpread ?? 10}
                        min={0}
                        max={50}
                        unit=" cts"
                        precision={1}
                        onChange={(v) => updateOscParam('detuneSpread', v)}
                    />

                    <TerminalSlider
                        label="LFO RATE"
                        value={params.filter?.lfoRate ?? 0.5}
                        min={0.1}
                        max={20}
                        unit=" Hz"
                        precision={2}
                        logarithmic={true}
                        onChange={(v) => updateFilterParam('lfoRate', v)}
                    />

                    <TerminalSlider
                        label="DISTORTION"
                        value={params.distortion?.distortion ?? 0}
                        min={0}
                        max={100}
                        unit="%"
                        precision={0}
                        onChange={(v) => updateDistortion(v)}
                    />

                    <TerminalSlider
                        label="GAIN"
                        value={params.gainLevel ?? -12}
                        min={-60}
                        max={0}
                        unit=" dB"
                        precision={1}
                        onChange={(v) => updateGain(v)}
                    />

                    {/* MIXER SECTION */}
                    <div className="pt-2 mt-2 border-t border-[var(--color-border)]">
                        <div className="text-[10px] text-[var(--color-text-secondary)] mb-1 font-bold">MIXER</div>

                        {/* SUB CHANNEL */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1">
                                <TerminalSlider
                                    label="SUB"
                                    value={(params.oscillator as any)?.params?.subVol ?? -12}
                                    min={-60}
                                    max={0}
                                    unit=" dB"
                                    precision={0}
                                    onChange={(v) => updateOscParam('subVol', v)}
                                />
                            </div>
                            <button
                                className={`w-8 h-8 flex items-center justify-center border text-[10px] font-bold transition-all ${(params.oscillator as any)?.params?.subEnabled !== false // default true
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)]'
                                    }`}
                                onClick={() => updateOscParam('subEnabled', (params.oscillator as any)?.params?.subEnabled === false)}
                            >
                                {(params.oscillator as any)?.params?.subEnabled !== false ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {/* NOISE CHANNEL */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <TerminalSlider
                                    label="NOISE"
                                    value={(params.oscillator as any)?.params?.noiseVol ?? -40}
                                    min={-60}
                                    max={0}
                                    unit=" dB"
                                    precision={0}
                                    onChange={(v) => updateOscParam('noiseVol', v)}
                                />
                            </div>
                            <button
                                className={`w-8 h-8 flex items-center justify-center border text-[10px] font-bold transition-all ${(params.oscillator as any)?.params?.noiseEnabled !== false // default true
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)]'
                                    }`}
                                onClick={() => updateOscParam('noiseEnabled', (params.oscillator as any)?.params?.noiseEnabled === false)}
                            >
                                {(params.oscillator as any)?.params?.noiseEnabled !== false ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                </div>
            </TerminalPanel>
        </div>
    );
};
