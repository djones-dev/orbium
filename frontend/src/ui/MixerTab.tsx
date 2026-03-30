import React, { useState, useEffect, useRef } from 'react';
import { OrbitalBody } from '../types/orbital';
import { TerminalVerticalSlider } from './terminal/TerminalVerticalSlider';
import { useSelection } from '../contexts/SelectionContext';
import { useUIStore } from '../stores/uiStore';
import { AudioEngine } from '../audio/AudioEngine';

export const MixerTab: React.FC = () => {
    const { manager } = useSelection();
    const [bodies, setBodies] = useState<OrbitalBody[]>(
        manager.getBodies().filter((b: OrbitalBody) => b.type === 'sun' || b.type === 'planet')
    );
    
    const masterGain = useUIStore(state => state.masterGain);
    const setMasterGain = useUIStore(state => state.setMasterGain);

    const [levels, setLevels] = useState<Record<string, number>>({});
    const requestRef = useRef<number>();
    const audioEngine = AudioEngine.getInstance();

    useEffect(() => {
        const unsub = manager.subscribe(() => {
            setBodies(manager.getBodies().filter((b: OrbitalBody) => b.type === 'sun' || b.type === 'planet'));
        });
        return unsub;
    }, [manager]);

    // Animation loop for meters
    const animate = () => {
        const newLevels: Record<string, number> = {};
        
        // Individual layers
        audioEngine.layers.forEach((layer, id) => {
            newLevels[id] = getLevel(layer.analyser);
        });

        // Sun layer
        if (audioEngine.sunLayer) {
            newLevels['sun-primary'] = getLevel(audioEngine.sunLayer.analyser);
        }

        // Master level
        if (audioEngine.analyser) {
            newLevels['master'] = getLevel(audioEngine.analyser);
        }

        setLevels(newLevels);
        requestRef.current = requestAnimationFrame(animate);
    };

    const getLevel = (analyser: AnalyserNode) => {
        const dataArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(dataArray);
        
        let max = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const val = Math.abs(dataArray[i] - 128);
            if (val > max) max = val;
        }
        
        // Boost scaling for visibility - peak value is 0-128
        return Math.min(1, (max / 128) * 1.5);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Handle Master Gain
    const handleMasterGainChange = (val: number) => {
        setMasterGain(val);
        const engine = AudioEngine.getInstance();
        if (engine.masterGain) {
            engine.masterGain.gain.setTargetAtTime(val, engine.context?.currentTime || 0, 0.05);
        }
    };

    const sortedBodies = [...bodies].sort((a, b) => {
        const order = { sun: 0, planet: 1, moon: 2 };
        return order[a.type as keyof typeof order] - order[b.type as keyof typeof order];
    });

    const getBodyIcon = (body: OrbitalBody) => {
        if (body.type === 'sun') return '☼';
        if (body.type === 'planet') return '○';
        if (body.presetType === 'modulator') return '◈';
        if (body.presetType === 'effect') return '◆';
        return '☾';
    };

    const getBodyLabel = (body: OrbitalBody) => {
        if (body.name) return body.name;
        if (body.type === 'sun') return 'THE SUN';
        if (body.type === 'planet') return 'PLANET';
        if (body.presetType === 'modulator') return 'MOD';
        if (body.presetType === 'effect') return 'FX';
        return 'MOON';
    };

    return (
        <div className="h-full w-full flex bg-[var(--color-bg)] font-mono">
            {/* CHANNELS CONTAINER */}
            <div className="flex-1 flex overflow-x-auto overflow-y-hidden p-4 gap-2 border-r border-[var(--color-border)]/30">
                {sortedBodies.map((body) => (
                    <div 
                        key={body.id} 
                        className={`flex flex-col items-center gap-3 p-3 border rounded-lg transition-all duration-300 min-w-[100px] bg-white/[0.03] ${
                            body.type === 'sun' 
                                ? 'border-[var(--color-accent-primary)]/40 shadow-[0_0_20px_rgba(51,255,51,0.05)]' 
                                : 'border-[var(--color-border)]/20'
                        }`}
                    >
                        {/* Header */}
                        <div className="flex flex-col items-center gap-0.5 w-full">
                            <div className="text-xl mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                                {getBodyIcon(body)}
                            </div>
                            <div className="text-[10px] font-bold text-white/90 truncate w-full text-center">
                                {getBodyLabel(body).toUpperCase()}
                            </div>
                            <div className="text-[8px] text-[var(--color-text-secondary)] tracking-[0.2em] opacity-60">
                                {body.type.toUpperCase()}
                            </div>
                        </div>

                        {/* Vertical Slider with Meter */}
                        <div className="flex-1 py-2">
                            <TerminalVerticalSlider
                                label="VOL"
                                value={body.audioParams.gainLevel ?? -12}
                                defaultValue={-12}
                                min={-60}
                                max={0}
                                meterValue={levels[body.id] || 0}
                                color={body.visualConfig.color}
                                onChange={(v) => manager.updateBodyParams(body.id, { gainLevel: v })}
                                showLabel={false}
                            />
                        </div>

                        {/* Mute Button */}
                        <button 
                            className={`w-full py-1 text-[9px] font-bold border transition-all rounded uppercase tracking-tighter ${
                                body.audioParams.gainLevel === -60
                                    ? 'bg-red-500/20 border-red-500 text-red-500'
                                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-white/5'
                            }`}
                            onClick={() => manager.updateBodyParams(body.id, { 
                                gainLevel: body.audioParams.gainLevel === -60 ? -12 : -60 
                            })}
                        >
                            {body.audioParams.gainLevel === -60 ? 'MUTED' : 'MUTE'}
                        </button>
                    </div>
                ))}

                {bodies.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] font-mono text-xs opacity-50 italic">
                        NO BODIES IN ORBIT...
                    </div>
                )}
            </div>

            {/* MASTER CHANNEL */}
            <div className="w-32 flex flex-col items-center p-4 bg-black/60 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-20 border-l border-[var(--color-border)]">
                <div className="flex flex-col items-center gap-1 mb-6">
                    <div className="text-[11px] font-black tracking-[0.3em] text-[var(--color-accent-primary)] mb-1">MASTER</div>
                    <div className="w-8 h-[2px] bg-[var(--color-accent-primary)] opacity-40 shadow-[0_0_10px_var(--color-accent-primary)]" />
                </div>

                <div className="flex-1 py-2">
                    <TerminalVerticalSlider
                        label="LEVEL"
                        value={masterGain * 100}
                        defaultValue={80}
                        min={0}
                        max={100}
                        meterValue={levels['master'] || 0}
                        color="var(--color-accent-primary)"
                        onChange={(v) => handleMasterGainChange(v / 100)}
                        showLabel={false}
                    />
                </div>

                <div className="mt-4 w-full px-2">
                    <div className="flex justify-between text-[8px] text-[var(--color-text-secondary)] mb-1 font-bold">
                        <span>L</span>
                        <span>R</span>
                    </div>
                    <div className="h-1 w-full bg-black/40 border border-[var(--color-border)]/30 rounded-full p-[1px]">
                        <div className="h-full w-1/2 bg-[var(--color-accent-primary)] opacity-40 mx-auto rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};
