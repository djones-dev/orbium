import React, { useState, useEffect } from 'react';
import { OrbitalBody } from '../types/orbital';
import { TerminalKnob } from './terminal/TerminalKnob';
import { useSelection } from '../contexts/SelectionContext';

export const MixerTab: React.FC = () => {
    const { manager } = useSelection();
    const [bodies, setBodies] = useState<OrbitalBody[]>(manager.getBodies());

    useEffect(() => {
        const unsub = manager.subscribe(() => {
            setBodies(manager.getBodies());
        });
        return unsub;
    }, [manager]);

    // Sort bodies by type (sun first, then planets, then moons)
    const sortedBodies = [...bodies].sort((a, b) => {
        const order = { sun: 0, planet: 1, moon: 2 };
        return order[a.type as keyof typeof order] - order[b.type as keyof typeof order];
    });

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-black/20">
            <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-stretch p-4 gap-6">
                {sortedBodies.map((body) => (
                    <div 
                        key={body.id} 
                        className={`flex flex-col items-center gap-3 p-3 border rounded transition-all duration-300 min-w-[100px] ${
                            body.type === 'sun' 
                                ? 'border-[var(--color-accent-primary)]/40 bg-[var(--color-accent-primary)]/5 shadow-[0_0_15px_rgba(51,255,51,0.05)]' 
                                : 'border-[var(--color-border)] bg-black/40'
                        }`}
                    >
                        {/* Body Indicator */}
                        <div className="flex flex-col items-center gap-1">
                            <div 
                                className="w-3 h-3 rounded-full mb-1" 
                                style={{ 
                                    backgroundColor: body.visualConfig.color,
                                    boxShadow: `0 0 10px ${body.visualConfig.color}88`
                                }} 
                            />
                            <div className="text-[10px] font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">
                                {body.type}
                            </div>
                        </div>

                        {/* Fader/Knob Section */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <TerminalKnob
                                label="GAIN"
                                value={body.audioParams.gainLevel ?? -12}
                                min={-60}
                                max={0}
                                onChange={(v) => manager.updateBodyParams(body.id, { gainLevel: v })}
                                formatValue={(v) => `${v.toFixed(0)} dB`}
                                size={56}
                            />
                            
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex gap-1">
                                    <button 
                                        className="text-[9px] px-2 py-0.5 border border-[var(--color-border)] hover:bg-white/10 transition-colors rounded"
                                        onClick={() => manager.updateBodyParams(body.id, { gainLevel: -60 })}
                                    >
                                        MUTE
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Label/Name Input */}
                        <div className="w-full">
                            <input
                                type="text"
                                value={body.name || ''}
                                placeholder={body.type.toUpperCase()}
                                onChange={(e) => manager.updateBodyName(body.id, e.target.value)}
                                className="w-full bg-black/60 border border-[var(--color-border)] text-[10px] p-1.5 outline-none text-center text-[var(--color-accent-primary)] font-mono uppercase rounded focus:border-[var(--color-accent-primary)] transition-colors"
                            />
                        </div>

                        {/* Activity Meter (Decorative for now) */}
                        <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mt-1">
                            <div 
                                className="h-full bg-[var(--color-accent-primary)] opacity-50 transition-all duration-100"
                                style={{ width: `${Math.max(0, (body.audioParams.gainLevel ?? -12) + 60) * 1.66}%` }}
                            />
                        </div>
                    </div>
                ))}

                {bodies.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] font-mono text-xs opacity-50">
                        NO BODIES IN ORBIT
                    </div>
                )}
            </div>
        </div>
    );
};
