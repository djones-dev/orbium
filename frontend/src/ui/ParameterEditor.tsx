import React, { useState, useRef, useCallback } from 'react';
import { useSelection } from '../contexts/SelectionContext';
import { bodyService } from '../services/BodyService';
import { presetService } from '../services/PresetService';
import { useUIStore } from '../stores/uiStore';
import { TerminalKnob } from './terminal/TerminalKnob';
import { TerminalSelect } from './terminal/TerminalSelect';
import { TerminalToggle } from './terminal/TerminalToggle';
import { SunParameters } from '../types/audio';
import { freqToNote, midiToFreq, freqToMidi } from '../audio/audioUtils';
import { logger } from '../utils/logger';

const MODULATABLE_PARAMS = [
    { label: 'FREQUENCY', value: 'rootFrequency' },
    { label: 'FILTER', value: 'filterCutoff' },
    { label: 'DISTORTION', value: 'distortion' },
    { label: 'GAIN', value: 'gainLevel' },
    { label: 'DETUNE', value: 'detuneSpread' },
    { label: 'LFO RATE', value: 'lfoRate' },
];

const WAVEFORM_OPTIONS = [
    { label: 'SIN', value: 'sine' },
    { label: 'TRI', value: 'triangle' },
    { label: 'SAW', value: 'sawtooth' },
    { label: 'SQR', value: 'square' },
];

type UnitMode = 'Hz' | 'Note' | 'ms';

export const ParameterEditor: React.FC = () => {
    const { selectedBody, manager } = useSelection();
    const showToast = useUIStore(state => state.showToast);

    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'EDITING' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
    const pendingChangesRef = useRef<Partial<SunParameters>>({});

    const [unitModes, setUnitModes] = useState<Record<string, UnitMode>>({
        rootFrequency: 'Hz',
        lfoRate: 'Hz',
        filterCutoff: 'Hz'
    });

    const toggleUnitMode = (param: string, modes: UnitMode[]) => {
        setUnitModes(prev => {
            const current = prev[param] || modes[0];
            const nextIdx = (modes.indexOf(current) + 1) % modes.length;
            return { ...prev, [param]: modes[nextIdx] };
        });
    };

    const performSave = async (id: string) => {
        const changes = { ...pendingChangesRef.current };
        if (!id || Object.keys(changes).length === 0) return;

        pendingChangesRef.current = {};
        setSaveStatus('SAVING');
        try {
            await bodyService.updateBody(id, changes);
            setSaveStatus('SAVED');
            setTimeout(() => setSaveStatus(prev => prev === 'SAVED' ? 'IDLE' : prev), 2000);
        } catch (error) {
            logger.error("Save failed", error);
            setSaveStatus('ERROR');
            showToast("Failed to save parameter changes", 'error');
        }
    };

    const onParamChange = useCallback((key: keyof SunParameters, value: any) => {
        if (!selectedBody) return;
        setSaveStatus('EDITING');
        // Update local audio immediately
        pendingChangesRef.current = { ...pendingChangesRef.current, [key]: value };
        manager.updateBodyParams(selectedBody.id, { [key]: value }, false);
    }, [selectedBody, manager]);

    // Only triggered when user releases the knob
    const onParamCommit = useCallback(() => {
        if (!selectedBody) return;
        // Wait a moment before saving to let the user "settle" if they quickly grab it again?
        // Actually user said "happen a couple seconds after that".
        // We'll set a timeout.
        setTimeout(() => {
            performSave(selectedBody.id);
        }, 1000);
    }, [selectedBody]);

    if (!selectedBody) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] opacity-50 text-sm">
                SELECT A BODY TO EDIT PARAMETERS
            </div>
        );
    }

    const { type, audioParams } = selectedBody;
    const isGenerator = type === 'sun' || type === 'planet';
    const isModulator = type === 'moon';

    const getParam = (key: keyof SunParameters, def: number) => {
        const val = audioParams[key];
        return typeof val === 'number' ? val : def;
    }
    const getStringParam = (key: keyof SunParameters, def: string) => {
        const val = audioParams[key] as string;
        return val || def;
    }

    // --- Renderer ---

    const renderFrequencyControl = (paramKey: 'rootFrequency' | 'filterCutoff' | 'lfoRate', label: string, min: number, max: number, size: number = 48) => {
        const mode = unitModes[paramKey] || 'Hz';

        // Value conversion logic
        let value = getParam(paramKey, 440);
        let controlMin = min;
        let controlMax = max;
        let isLog = true;

        if (mode === 'Note') {
            value = freqToMidi(value);
            controlMin = freqToMidi(min);
            controlMax = freqToMidi(max);
            isLog = false;
        } else if (mode === 'ms') {
            value = value > 0 ? 1000 / value : 1000;
            controlMin = 1000 / max;
            controlMax = 1000 / min;
            isLog = true;
        }

        const handleChange = (v: number) => {
            let freq = v;
            if (mode === 'Note') freq = midiToFreq(v);
            else if (mode === 'ms') freq = v > 0 ? 1000 / v : 0.1;
            onParamChange(paramKey, freq);
        };

        const format = (v: number) => {
            if (mode === 'Note') return freqToNote(midiToFreq(v));
            if (mode === 'ms') return `${v.toFixed(0)} ms`;
            return `${v.toFixed(0)} Hz`;
        };

        const availableModes: UnitMode[] = paramKey === 'lfoRate' ? ['Hz', 'ms'] : ['Hz', 'Note'];

        return (
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <TerminalKnob
                    label={label}
                    value={value}
                    min={controlMin}
                    max={controlMax}
                    logarithmic={isLog}
                    onChange={handleChange}
                    onCommit={onParamCommit}
                    formatValue={format}
                    size={size}
                />
                <button
                    onClick={() => toggleUnitMode(paramKey, availableModes)}
                    className="text-[9px] text-[var(--color-text-secondary)] hover:text-[#0ff] bg-black/40 border border-[var(--color-border)] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                    {mode.toUpperCase()}
                </button>
            </div>
        );
    };

    return (
        <div className="h-full bg-[var(--color-bg)] flex overflow-hidden">

            {/* --- LEFT SECTION: Modules (Horizontal) --- */}
            <div className="flex-1 flex gap-4 p-4 items-center overflow-x-auto">

                {/* OSCILLATOR */}
                {isGenerator && (
                    <div className="flex gap-4 p-3 border border-[var(--color-border)] rounded bg-black/20 flex-shrink-0 h-full items-center relative min-w-max">
                        <div className="absolute top-0 left-2 text-[9px] font-bold text-[var(--color-text-secondary)] tracking-widest -translate-y-1/2 bg-[var(--color-bg)] px-1">OSC</div>

                        {renderFrequencyControl('rootFrequency', 'FREQ', 20, 2000, 52)}

                        <TerminalKnob
                            label="DETUNE"
                            value={getParam('detuneSpread', 0)}
                            min={0}
                            max={50}
                            onChange={(v) => onParamChange('detuneSpread', v)}
                            onCommit={onParamCommit}
                            formatValue={(v) => `${v.toFixed(0)} ct`}
                            size={40}
                        />

                        <div className="w-px bg-[var(--color-border)] opacity-20 h-2/3"></div>

                        <div className="flex flex-col gap-3 w-28">
                            <TerminalSelect
                                label="WAVE"
                                value={getStringParam('waveform', 'sine')}
                                options={WAVEFORM_OPTIONS}
                                onChange={(v) => { onParamChange('waveform', v); onParamCommit(); }}
                            />
                            <TerminalToggle
                                label="SUB OSC"
                                checked={!!audioParams.subEnabled}
                                onChange={(v) => { onParamChange('subEnabled', v); onParamCommit(); }}
                            />
                        </div>
                    </div>
                )}

                {/* FILTER / DRIVE / LFO */}
                {(isGenerator || isModulator) && (
                    <div className="flex gap-4 p-3 border border-[var(--color-border)] rounded bg-black/20 flex-shrink-0 h-full items-center relative min-w-max">
                        <div className="absolute top-0 left-2 text-[9px] font-bold text-[var(--color-text-secondary)] tracking-widest -translate-y-1/2 bg-[var(--color-bg)] px-1">
                            {isGenerator ? 'FILTER / DRIVE' : 'MODULATOR'}
                        </div>

                        {isGenerator ? (
                            <>
                                {renderFrequencyControl('filterCutoff', 'CUTOFF', 20, 20000, 52)}
                                <TerminalKnob
                                    label="RES"
                                    value={getParam('filterResonance', 1)}
                                    min={0}
                                    max={20}
                                    onChange={(v) => onParamChange('filterResonance', v)}
                                    onCommit={onParamCommit}
                                    formatValue={(v) => `Q:${v.toFixed(1)}`}
                                    size={40}
                                />
                                <div className="w-px bg-[var(--color-border)] opacity-20 h-2/3"></div>

                                <TerminalKnob
                                    label="DRIVE"
                                    value={getParam('distortion', 0)}
                                    min={0}
                                    max={100}
                                    onChange={(v) => onParamChange('distortion', v)}
                                    onCommit={onParamCommit}
                                    formatValue={(v) => `${v.toFixed(0)}%`}
                                    size={40}
                                />
                            </>
                        ) : (
                            <>
                                {renderFrequencyControl('lfoRate', 'RATE', 0.1, 20, 52)}
                                <TerminalKnob
                                    label="DEPTH"
                                    value={getParam('modDepth', 0)}
                                    min={0}
                                    max={100}
                                    onChange={(v) => onParamChange('modDepth', v)}
                                    onCommit={onParamCommit}
                                    formatValue={(v) => `${v.toFixed(0)}%`}
                                    size={40}
                                />
                                <div className="w-px bg-[var(--color-border)] opacity-20 h-2/3"></div>
                                <div className="flex flex-col gap-2 w-28">
                                    <TerminalSelect
                                        label="SHAPE"
                                        value={getStringParam('waveform', 'sine')}
                                        options={WAVEFORM_OPTIONS}
                                        onChange={(v) => { onParamChange('waveform', v); onParamCommit(); }}
                                    />
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[9px] text-[var(--color-text-secondary)] opacity-80 uppercase">Target</div>
                                        <select
                                            value={getStringParam('modTarget', 'filterCutoff')}
                                            onChange={(e) => { onParamChange('modTarget', e.target.value); onParamCommit(); }}
                                            className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] p-1.5 outline-none text-[var(--color-accent-primary)] font-mono uppercase w-full rounded hover:border-[var(--color-accent-secondary)] transition-colors focus:border-[var(--color-accent-primary)]"
                                        >
                                            {MODULATABLE_PARAMS.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* --- RIGHT SECTION: MIXER & GLOBAL --- */}
            <div className="w-auto border-l border-[var(--color-border)] bg-[var(--color-panel-bg)] flex flex-row items-center p-3 gap-4 flex-shrink-0 z-10 shadow-xl">
                {isGenerator && (
                    <div className="flex items-center gap-4 border-r border-[var(--color-border)] pr-4">
                        <TerminalKnob
                            label="MAIN"
                            value={getParam('gainLevel', -10)}
                            min={-60}
                            max={0}
                            onChange={(v) => onParamChange('gainLevel', v)}
                            onCommit={onParamCommit}
                            formatValue={(v) => `${v.toFixed(0)} dB`}
                            size={48}
                        />
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <TerminalKnob
                                    label="SUB"
                                    value={getParam('subVol', -60)}
                                    min={-60}
                                    max={0}
                                    onChange={(v) => onParamChange('subVol', v)}
                                    onCommit={onParamCommit}
                                    formatValue={(v) => `${v.toFixed(0)}`}
                                    size={30}
                                />
                                <span className="text-[9px] text-[var(--color-text-secondary)] font-mono w-4 text-center">S</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TerminalKnob
                                    label="NOISE"
                                    value={getParam('noiseVol', -60)}
                                    min={-60}
                                    max={0}
                                    onChange={(v) => onParamChange('noiseVol', v)}
                                    onCommit={onParamCommit}
                                    formatValue={(v) => `${v.toFixed(0)}`}
                                    size={30}
                                />
                                <span className="text-[9px] text-[var(--color-text-secondary)] font-mono w-4 text-center">N</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex flex-col gap-2 min-w-[80px]">
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-[var(--color-text-secondary)]">SYNC</span>
                        <span className={`font-mono font-bold ${saveStatus === 'ERROR' ? 'text-red-500' :
                                saveStatus === 'SAVED' ? 'text-green-500' :
                                    'text-[var(--color-accent-primary)]'
                            }`}>
                            {saveStatus === 'SAVED' ? 'OK' : saveStatus}
                        </span>
                    </div>

                    {selectedBody.presetId && (
                        <button
                            onClick={async () => {
                                if (!selectedBody.presetId) return;
                                try {
                                    const preset = await presetService.getPreset(selectedBody.presetId);
                                    if (preset?.parameters) {
                                        manager.updateBodyParams(selectedBody.id, preset.parameters, true);
                                        showToast("Reverted to preset", "success");
                                        // Also trigger save for revert
                                        performSave(selectedBody.id);
                                    }
                                } catch (e) { showToast("Error loading preset", "error"); }
                            }}
                            className="w-full py-1 text-[9px] uppercase tracking-wider border border-[var(--color-border)] hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white transition-all rounded whitespace-nowrap"
                        >
                            Revert
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};
