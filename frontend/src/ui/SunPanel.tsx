import React, { useState, useEffect } from 'react';
import { TerminalPanel } from './terminal/TerminalPanel';
import { TerminalSlider } from './terminal/TerminalSlider';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { SunParameters } from '../types/audio';
import { freqToNote } from '../audio/audioUtils';

export const SunPanel: React.FC = () => {
    const { engine, isAudioActive } = useAudioEngine();

    // Initial State must match AudioEngine default
    const [params, setParams] = useState<SunParameters>({
        rootFrequency: 110,
        filterCutoff: 1000,
        detuneSpread: 10,
        lfoRate: 0.5,
        gainLevel: -12
    });

    // Display modes
    const [showNoteName, setShowNoteName] = useState(true);

    // Sync params from engine on mount/update
    useEffect(() => {
        const current = engine.getSunParams();
        if (current) {
            setParams(current);
        }
    }, [engine, isAudioActive]);

    const handleParamChange = (key: keyof SunParameters, value: number) => {
        const newParams = { ...params, [key]: value };
        setParams(newParams);
        engine.updateSunParams({ [key]: value });
    };

    return (
        <div className="sun-panel-container pointer-events-auto">
            <TerminalPanel title="SUN PARAMETERS">
                <div className="flex flex-col gap-2 p-2">

                    {/* ROOT: DUAL DISPLAY (Hz / Note) */}
                    <div onClick={() => setShowNoteName(!showNoteName)} className="cursor-pointer" title="Click to toggle Hz/Note">
                        <TerminalSlider
                            label="ROOT"
                            value={params.rootFrequency}
                            min={20}
                            max={880}
                            unit=""
                            logarithmic={true}
                            formatValue={(v) => showNoteName ? freqToNote(v) : `${v.toFixed(1)} Hz`}
                            onChange={(v) => handleParamChange('rootFrequency', v)}
                        />
                    </div>

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
                        label="GAIN"
                        value={params.gainLevel}
                        min={-60}
                        max={0}
                        unit=" dB"
                        precision={1}
                        onChange={(v) => handleParamChange('gainLevel', v)}
                    />

                </div>
            </TerminalPanel>
        </div>
    );
};
