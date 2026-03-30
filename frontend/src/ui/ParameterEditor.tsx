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
    const pickingTargetForId = useUIStore(state => state.pickingModulationTargetForId);
    const setPickingTarget = useUIStore(state => state.setPickingModulationTarget);

    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'EDITING' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
    const pendingChangesRef = useRef<Partial<SunParameters>>({});

    const [localName, setLocalName] = useState(selectedBody?.name || '');

    // Sync local name when selected body changes
    React.useEffect(() => {
        setLocalName(selectedBody?.name || '');
    }, [selectedBody?.id, selectedBody?.name]);

    const handleNameCommit = () => {
        if (selectedBody && localName !== selectedBody.name) {
            manager.updateBodyName(selectedBody.id, localName);
        }
    };

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
            await bodyService.updateBody(id, { audioParams: changes });
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

    const handlePickParameter = (key: string) => {
        if (pickingTargetForId) {
            manager.updateBodyParams(pickingTargetForId, { modTarget: key }, true);
            setPickingTarget(null);
            showToast(`TARGET SET: ${key.toUpperCase()}`, 'success');
        }
    };

    // Only triggered when user releases the knob
    const onParamCommit = useCallback(() => {
        if (!selectedBody) return;
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
    const hasPhaser = audioParams.effects?.includes('phaser');
    const hasReverb = audioParams.effects?.includes('reverb');

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
        const isPicking = !!pickingTargetForId;

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
            <div 
                className={`flex flex-col items-center gap-1.5 flex-shrink-0 transition-all ${isPicking ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                onClick={() => isPicking && handlePickParameter(paramKey)}
            >
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
                    disabled={isPicking}
                />
                <button
                    onClick={(e) => { e.stopPropagation(); toggleUnitMode(paramKey, availableModes); }}
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
                
                {/* IDENTITY / NAME */}
                <div className="flex flex-col gap-3 p-3 border border-[var(--color-border)] rounded bg-black/20 flex-shrink-0 h-full justify-center relative min-w-max">
                    <div className="absolute top-0 left-2 text-[9px] font-bold text-[var(--color-text-secondary)] tracking-widest -translate-y-1/2 bg-[var(--color-bg)] px-1">IDENTITY</div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] text-[var(--color-text-secondary)] uppercase">Label</label>
                        <input
                            type="text"
                            value={localName}
                            placeholder={selectedBody.type.toUpperCase()}
                            onChange={(e) => setLocalName(e.target.value)}
                            onBlur={handleNameCommit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleNameCommit();
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            className="bg-black/40 border border-[var(--color-border)] text-[10px] p-1.5 outline-none text-[var(--color-accent-primary)] font-mono uppercase w-32 rounded hover:border-[var(--color-accent-secondary)] transition-colors focus:border-[var(--color-accent-primary)]"
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedBody.visualConfig.color }} />
                        <span className="text-[9px] text-[var(--color-text-secondary)] font-mono uppercase">{selectedBody.type}</span>
                    </div>
                </div>

                {/* OSCILLATOR */}
                {isGenerator && (
                    <div className="flex gap-4 p-3 border border-[var(--color-border)] rounded bg-black/20 flex-shrink-0 h-full items-center relative min-w-max">
                        <div className="absolute top-0 left-2 text-[9px] font-bold text-[var(--color-text-secondary)] tracking-widest -translate-y-1/2 bg-[var(--color-bg)] px-1">OSC</div>

                        {renderFrequencyControl('rootFrequency', 'FREQ', 20, 2000, 52)}

                        <div 
                            className={`flex flex-col items-center gap-1.5 transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                            onClick={() => pickingTargetForId && handlePickParameter('detuneSpread')}
                        >
                            <TerminalKnob
                                label="DETUNE"
                                value={getParam('detuneSpread', 0)}
                                min={0}
                                max={50}
                                onChange={(v) => onParamChange('detuneSpread', v)}
                                onCommit={onParamCommit}
                                formatValue={(v) => `${v.toFixed(0)} ct`}
                                size={40}
                                disabled={!!pickingTargetForId}
                            />
                        </div>

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

                {/* PHASER (Dynamic) */}
                {isGenerator && hasPhaser && (
                    <div className="flex gap-4 p-3 border border-[var(--color-border)] rounded bg-black/20 flex-shrink-0 h-full items-center relative min-w-max">
                        <div className="absolute top-0 left-2 text-[9px] font-bold text-[var(--color-accent-primary)] tracking-widest -translate-y-1/2 bg-[var(--color-bg)] px-1">PHASER</div>
                        <div 
                            className={`flex flex-col items-center gap-1.5 transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                            onClick={() => pickingTargetForId && handlePickParameter('phaserRate')}
                        >
                            <TerminalKnob
                                label="RATE"
                                value={getParam('phaserRate', 0.5)}
                                min={0.1}
                                max={10}
                                onChange={(v) => onParamChange('phaserRate', v)}
                                onCommit={onParamCommit}
                                formatValue={(v) => `${v.toFixed(1)} Hz`}
                                size={40}
                                disabled={!!pickingTargetForId}
                            />
                        </div>
                        <div 
                            className={`flex flex-col items-center gap-1.5 transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                            onClick={() => pickingTargetForId && handlePickParameter('phaserDepth')}
                        >
                            <TerminalKnob
                                label="DEPTH"
                                value={getParam('phaserDepth', 0.5)}
                                min={0}
                                max={1}
                                onChange={(v) => onParamChange('phaserDepth', v)}
                                onCommit={onParamCommit}
                                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                                size={40}
                                disabled={!!pickingTargetForId}
                            />
                        </div>
                        <div 
                            className={`flex flex-col items-center gap-1.5 transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                            onClick={() => pickingTargetForId && handlePickParameter('phaserFeedback')}
                        >
                            <TerminalKnob
                                label="FEEDBK"
                                value={getParam('phaserFeedback', 0.4)}
                                min={0}
                                max={0.9}
                                onChange={(v) => onParamChange('phaserFeedback', v)}
                                onCommit={onParamCommit}
                                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                                size={40}
                                disabled={!!pickingTargetForId}
                            />
                        </div>
                        <button 
                            className="text-[8px] text-red-500/60 hover:text-red-500 border border-red-500/20 px-1 py-0.5 rounded"
                            onClick={() => onParamChange('effects', audioParams.effects?.filter(e => e !== 'phaser'))}
                        >REMOVE</button>
                    </div>
                )}

                {/* REVERB (Dynamic) */}
                {isGenerator && hasReverb && (
                    <div className="flex gap-4 p-3 border border-[var(--color-border)] rounded bg-black/20 flex-shrink-0 h-full items-center relative min-w-max">
                        <div className="absolute top-0 left-2 text-[9px] font-bold text-[var(--color-accent-secondary)] tracking-widest -translate-y-1/2 bg-[var(--color-bg)] px-1">REVERB</div>
                        <div 
                            className={`flex flex-col items-center gap-1.5 transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                            onClick={() => pickingTargetForId && handlePickParameter('reverbMix')}
                        >
                            <TerminalKnob
                                label="MIX"
                                value={getParam('reverbMix', 0.3)}
                                min={0}
                                max={1}
                                onChange={(v) => onParamChange('reverbMix', v)}
                                onCommit={onParamCommit}
                                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                                size={40}
                                disabled={!!pickingTargetForId}
                            />
                        </div>
                        <div 
                            className={`flex flex-col items-center gap-1.5 transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                            onClick={() => pickingTargetForId && handlePickParameter('reverbSize')}
                        >
                            <TerminalKnob
                                label="SIZE"
                                value={getParam('reverbSize', 2.0)}
                                min={0.1}
                                max={8}
                                onChange={(v) => onParamChange('reverbSize', v)}
                                onCommit={onParamCommit}
                                formatValue={(v) => `${v.toFixed(1)}s`}
                                size={40}
                                disabled={!!pickingTargetForId}
                            />
                        </div>
                        <button 
                            className="text-[8px] text-red-500/60 hover:text-red-500 border border-red-500/20 px-1 py-0.5 rounded"
                            onClick={() => onParamChange('effects', audioParams.effects?.filter(e => e !== 'reverb'))}
                        >REMOVE</button>
                    </div>
                )}

                {/* FILTER / DRIVE / MODULATOR */}
                {(isGenerator || isModulator) && (
                    <div className="flex gap-4 p-3 border border-[var(--color-border)] rounded bg-black/20 flex-shrink-0 h-full items-center relative min-w-max">
                        <div className="absolute top-0 left-2 text-[9px] font-bold text-[var(--color-text-secondary)] tracking-widest -translate-y-1/2 bg-[var(--color-bg)] px-1">
                            {isGenerator ? 'FILTER / DRIVE' : 'MODULATOR'}
                        </div>

                        {isGenerator ? (
                            <>
                                {renderFrequencyControl('filterCutoff', 'CUTOFF', 20, 20000, 52)}
                                <div 
                                    className={`flex flex-col items-center gap-1.5 transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                                    onClick={() => pickingTargetForId && handlePickParameter('filterResonance')}
                                >
                                    <TerminalKnob
                                        label="RES"
                                        value={getParam('filterResonance', 1)}
                                        min={0}
                                        max={20}
                                        onChange={(v) => onParamChange('filterResonance', v)}
                                        onCommit={onParamCommit}
                                        formatValue={(v) => `Q:${v.toFixed(1)}`}
                                        size={40}
                                        disabled={!!pickingTargetForId}
                                    />
                                </div>
                                <div className="w-px bg-[var(--color-border)] opacity-20 h-2/3"></div>

                                <div 
                                    className={`flex flex-col items-center gap-1.5 transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                                    onClick={() => pickingTargetForId && handlePickParameter('distortion')}
                                >
                                    <TerminalKnob
                                        label="DRIVE"
                                        value={getParam('distortion', 0)}
                                        min={0}
                                        max={100}
                                        onChange={(v) => onParamChange('distortion', v)}
                                        onCommit={onParamCommit}
                                        formatValue={(v) => `${v.toFixed(0)}%`}
                                        size={40}
                                        disabled={!!pickingTargetForId}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex flex-col gap-2 w-24">
                                    <div className="text-[9px] text-[var(--color-text-secondary)] opacity-80 uppercase tracking-tighter">Mode</div>
                                    <div className="flex border border-[var(--color-border)]/30 rounded overflow-hidden">
                                        <button 
                                            onClick={() => { onParamChange('modType', 'lfo'); onParamCommit(); }}
                                            className={`flex-1 text-[8px] py-1 font-bold ${audioParams.modType !== 'adsr' ? 'bg-[var(--color-accent-primary)] text-black' : 'hover:bg-white/5 text-[var(--color-text-secondary)]'}`}
                                        >
                                            LFO
                                        </button>
                                        <button 
                                            onClick={() => { onParamChange('modType', 'adsr'); onParamCommit(); }}
                                            className={`flex-1 text-[8px] py-1 font-bold ${audioParams.modType === 'adsr' ? 'bg-[var(--color-accent-primary)] text-black' : 'hover:bg-white/5 text-[var(--color-text-secondary)]'}`}
                                        >
                                            ADSR
                                        </button>
                                    </div>
                                    
                                    {audioParams.modType !== 'adsr' ? (
                                        renderFrequencyControl('lfoRate', 'RATE', 0.1, 20, 44)
                                    ) : (
                                        <div className="flex items-center justify-center h-[60px] text-[8px] text-[var(--color-accent-primary)] font-bold text-center leading-tight">
                                            TRIGGERED BY<br/>ORBIT
                                        </div>
                                    )}
                                </div>

                                <div className="w-px bg-[var(--color-border)] opacity-20 h-2/3"></div>

                                {audioParams.modType === 'adsr' ? (
                                    <div className="flex gap-2 items-center">
                                        <TerminalKnob
                                            label="A"
                                            value={getParam('attack', 0.1)}
                                            min={0.01}
                                            max={2}
                                            onChange={(v) => onParamChange('attack', v)}
                                            onCommit={onParamCommit}
                                            formatValue={(v) => `${v.toFixed(2)}s`}
                                            size={32}
                                        />
                                        <TerminalKnob
                                            label="D"
                                            value={getParam('decay', 0.2)}
                                            min={0.01}
                                            max={2}
                                            onChange={(v) => onParamChange('decay', v)}
                                            onCommit={onParamCommit}
                                            formatValue={(v) => `${v.toFixed(2)}s`}
                                            size={32}
                                        />
                                        <TerminalKnob
                                            label="S"
                                            value={getParam('sustain', 0.5)}
                                            min={0}
                                            max={1}
                                            onChange={(v) => onParamChange('sustain', v)}
                                            onCommit={onParamCommit}
                                            formatValue={(v) => `${v.toFixed(1)}`}
                                            size={32}
                                        />
                                        <TerminalKnob
                                            label="R"
                                            value={getParam('release', 0.5)}
                                            min={0.01}
                                            max={4}
                                            onChange={(v) => onParamChange('release', v)}
                                            onCommit={onParamCommit}
                                            formatValue={(v) => `${v.toFixed(2)}s`}
                                            size={32}
                                        />
                                    </div>
                                ) : (
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
                                )}

                                <div className="w-px bg-[var(--color-border)] opacity-20 h-2/3"></div>
                                <div className="flex flex-col gap-3 w-36">
                                    <button
                                        onClick={() => setPickingTarget(selectedBody.id)}
                                        className={`w-full py-2 text-[9px] font-bold border transition-all rounded uppercase tracking-widest ${
                                            pickingTargetForId === selectedBody.id 
                                                ? 'bg-[var(--color-accent-primary)] text-black border-[var(--color-accent-primary)] shadow-[0_0_15px_var(--color-accent-primary)] animate-pulse'
                                                : 'bg-black/40 border-[var(--color-border)] text-[var(--color-accent-primary)] hover:border-[var(--color-accent-primary)]'
                                        }`}
                                    >
                                        {pickingTargetForId === selectedBody.id ? 'Click Target...' : 'Choose Parameter'}
                                    </button>
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[8px] text-[var(--color-text-secondary)] uppercase">Current Target</div>
                                        <div className="text-[10px] text-[var(--color-accent-primary)] font-bold font-mono p-1 bg-black/40 border border-[var(--color-border)]/30 rounded text-center">
                                            {(audioParams.modTarget || 'NONE').toUpperCase()}
                                        </div>
                                    </div>
                                    {audioParams.modType === 'adsr' && (
                                        <TerminalKnob
                                            label="DEPTH"
                                            value={getParam('modDepth', 0)}
                                            min={0}
                                            max={100}
                                            onChange={(v) => onParamChange('modDepth', v)}
                                            onCommit={onParamCommit}
                                            formatValue={(v) => `${v.toFixed(0)}%`}
                                            size={32}
                                        />
                                    )}
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
                        <div 
                            className={`transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                            onClick={() => pickingTargetForId && handlePickParameter('gainLevel')}
                        >
                            <TerminalKnob
                                label="MAIN"
                                value={getParam('gainLevel', -10)}
                                min={-60}
                                max={0}
                                onChange={(v) => onParamChange('gainLevel', v)}
                                onCommit={onParamCommit}
                                formatValue={(v) => `${v.toFixed(0)} dB`}
                                size={48}
                                disabled={!!pickingTargetForId}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div 
                                    className={`transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                                    onClick={() => pickingTargetForId && handlePickParameter('subVol')}
                                >
                                    <TerminalKnob
                                        label="SUB"
                                        value={getParam('subVol', -60)}
                                        min={-60}
                                        max={0}
                                        onChange={(v) => onParamChange('subVol', v)}
                                        onCommit={onParamCommit}
                                        formatValue={(v) => `${v.toFixed(0)}`}
                                        size={30}
                                        disabled={!!pickingTargetForId}
                                    />
                                </div>
                                <span className="text-[9px] text-[var(--color-text-secondary)] font-mono w-4 text-center">S</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div 
                                    className={`transition-all ${pickingTargetForId ? 'cursor-crosshair scale-105 filter drop-shadow-[0_0_8px_var(--color-accent-primary)]' : ''}`}
                                    onClick={() => pickingTargetForId && handlePickParameter('noiseVol')}
                                >
                                    <TerminalKnob
                                        label="NOISE"
                                        value={getParam('noiseVol', -60)}
                                        min={-60}
                                        max={0}
                                        onChange={(v) => onParamChange('noiseVol', v)}
                                        onCommit={onParamCommit}
                                        formatValue={(v) => `${v.toFixed(0)}`}
                                        size={30}
                                        disabled={!!pickingTargetForId}
                                    />
                                </div>
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
