import React, { useState, useEffect } from 'react';
import { TerminalPanel } from './terminal/TerminalPanel';
import { TerminalSlider } from './terminal/TerminalSlider';
import { TerminalSelect } from './terminal/TerminalSelect';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { SunParameters } from '../types/audio';
import { freqToNote, midiToFreq, freqToMidi } from '../audio/audioUtils';

// Available Root Modes
type RootMode = 'HZ' | 'NOTE';

export const SunPanel: React.FC = () => {
    const { engine, isAudioActive } = useAudioEngine();
    const SUN_ID = 'sun-primary';

    // Initial State must match AudioEngine default
    const [params, setParams] = useState<SunParameters>({
        rootFrequency: 110,
        filterCutoff: 1000,
        detuneSpread: 10,
        lfoRate: 0.5,
        gainLevel: -12,
        waveform: 'sine',
        distortion: 0,
        noiseVol: -40,
        subVol: -12,
        noiseEnabled: true,
        subEnabled: true,
        filterResonance: 1.0,
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

    const handleParamChange = (key: keyof SunParameters, value: number | string | boolean) => {
        const newParams = { ...params, [key]: value };
        setParams(newParams);
        engine.bodiesManager.updateBodyParams(SUN_ID, { [key]: value });
    };

    // Special handler for Root Frequency to support modes
    const handleRootChange = (value: number) => {
        if (rootMode === 'NOTE') {
            // value comes in as MIDI index from the slider
            const freq = midiToFreq(Math.round(value));
            handleParamChange('rootFrequency', freq);
        } else {
            // value is Hz
            handleParamChange('rootFrequency', value);
        }
    };

    // Calculate current MIDI value for the slider when in Note mode
    // We assume the stored param is always Hz
    const currentMidi = freqToMidi(params.rootFrequency);

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
                        value={params.waveform}
                        options={[
                            { label: 'SINE', value: 'sine' },
                            { label: 'TRI', value: 'triangle' },
                            { label: 'SAW', value: 'sawtooth' },
                            { label: 'SQR', value: 'square' },
                        ]}
                        onChange={(v) => handleParamChange('waveform', v)}
                    />

                    {/* ROOT Slider changes behavior based on Mode */}
                    {rootMode === 'HZ' ? (
                        <TerminalSlider
                            label="ROOT FREQ"
                            value={params.rootFrequency}
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
                        value={params.filterCutoff}
                        min={20}
                        max={10000}
                        unit=" Hz"
                        logarithmic={true}
                        formatValue={(v) => `${Math.round(v)} Hz`}
                        onChange={(v) => handleParamChange('filterCutoff', v)}
                    />

                    <TerminalSlider
                        label="SPREAD"
                        value={params.detuneSpread}
                        min={0}
                        max={50}
                        unit=" cts"
                        precision={1}
                        onChange={(v) => handleParamChange('detuneSpread', v)}
                    />

                    <TerminalSlider
                        label="LFO RATE"
                        value={params.lfoRate}
                        min={0.1}
                        max={20}
                        unit=" Hz"
                        precision={2}
                        logarithmic={true}
                        onChange={(v) => handleParamChange('lfoRate', v)}
                    />

                    <TerminalSlider
                        label="DISTORTION"
                        value={params.distortion}
                        min={0}
                        max={100}
                        unit="%"
                        precision={0}
                        onChange={(v) => handleParamChange('distortion', v)}
                    />

                    <TerminalSlider
                        label="GAIN"
                        value={params.gainLevel}
                        min={-60}
                        max={0}
                        unit=" dB"
                        precision={1}
                        onChange={(v) => handleParamChange('gainLevel', v)}
                    />

                    {/* MIXER SECTION */}
                    <div className="pt-2 mt-2 border-t border-[var(--color-border)]">
                        <div className="text-[10px] text-[var(--color-text-secondary)] mb-1 font-bold">MIXER</div>

                        {/* SUB CHANNEL */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1">
                                <TerminalSlider
                                    label="SUB"
                                    value={params.subVol || -12}
                                    min={-60}
                                    max={0}
                                    unit=" dB"
                                    precision={0}
                                    onChange={(v) => handleParamChange('subVol', v)}
                                />
                            </div>
                            <button
                                className={`w-8 h-8 flex items-center justify-center border text-[10px] font-bold transition-all ${params.subEnabled !== false // default true
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)]'
                                    }`}
                                onClick={() => handleParamChange('subEnabled', params.subEnabled === false)}
                            >
                                {params.subEnabled !== false ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {/* NOISE CHANNEL */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <TerminalSlider
                                    label="NOISE"
                                    value={params.noiseVol || -40}
                                    min={-60}
                                    max={0}
                                    unit=" dB"
                                    precision={0}
                                    onChange={(v) => handleParamChange('noiseVol', v)}
                                />
                            </div>
                            <button
                                className={`w-8 h-8 flex items-center justify-center border text-[10px] font-bold transition-all ${params.noiseEnabled !== false // default true
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)]'
                                    }`}
                                onClick={() => handleParamChange('noiseEnabled', params.noiseEnabled === false)}
                            >
                                {params.noiseEnabled !== false ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                </div>
            </TerminalPanel>
        </div>
    );
};
