import React from 'react';
import { useSelection } from '../contexts/SelectionContext';
import { useAudioEngine } from '../hooks/useAudioEngine';

export const SelectedBodyInfo: React.FC = () => {
    const { selectedBody, selectedBodyId, manager } = useSelection();
    const { isAudioActive } = useAudioEngine();

    if (!selectedBody) {
        const allBodies = manager.getBodies();
        return (
            <div className="p-4 space-y-2">
                <div className="text-[var(--color-text-muted)] font-mono text-[10px] uppercase italic">
                    {selectedBodyId ? `SEARCHING FOR [${selectedBodyId.toUpperCase()}]...` : "No orbital body selected"}
                </div>
                {selectedBodyId && (
                    <div className="text-[var(--color-text-secondary)] font-mono text-[9px] uppercase">
                        {isAudioActive ? `SIGNAL NOT FOUND. AVAILABLE: ${allBodies.map((b: any) => b.id).join(', ') || 'NONE'}` : "WAITING FOR ENGINE BOOT"}
                    </div>
                )}
            </div>
        );
    }

    const { id, type, position, velocity, audioParams } = selectedBody;

    return (
        <div className="p-3 font-mono text-[10px] space-y-3">
            {/* Header Information */}
            <div>
                <div className="text-[var(--color-text-secondary)] uppercase mb-1 border-b border-[var(--color-border)] pb-1">Identification</div>
                <div className="grid grid-cols-2 gap-x-2">
                    <span className="text-[var(--color-text-muted)]">NAME:</span>
                    <span className="text-[var(--color-accent-primary)] truncate">{id.toUpperCase()}</span>
                    <span className="text-[var(--color-text-muted)]">CLASS:</span>
                    <span className="text-white uppercase">{type}</span>
                </div>
            </div>

            {/* Orbital Parameters */}
            <div>
                <div className="text-[var(--color-text-secondary)] uppercase mb-1 border-b border-[var(--color-border)] pb-1">Orbital States</div>
                <div className="grid grid-cols-2 gap-x-2">
                    <span className="text-[var(--color-text-muted)]">RADIUS:</span>
                    <span className="text-white">{position.radius.toFixed(2)} AU</span>
                    <span className="text-[var(--color-text-muted)]">ANGLE:</span>
                    <span className="text-white">{((position.angle * 180) / Math.PI).toFixed(1)}°</span>
                    <span className="text-[var(--color-text-muted)]">VELOCITY:</span>
                    <span className="text-white">{velocity.toFixed(4)} RAD/S</span>
                </div>
            </div>

            {/* Audio Status */}
            <div>
                <div className="text-[var(--color-text-secondary)] uppercase mb-1 border-b border-[var(--color-border)] pb-1">Signal Parameters</div>
                <div className="grid grid-cols-2 gap-x-2">
                    <span className="text-[var(--color-text-muted)]">GLOBAL POWER:</span>
                    <span className={isAudioActive ? "text-[var(--color-accent-primary)]" : "text-red-500"}>
                        {isAudioActive ? "ENGAGED" : "OFFLINE"}
                    </span>
                    <span className="text-[var(--color-text-muted)]">GAIN:</span>
                    <span className="text-white">{audioParams.gainLevel?.toFixed(1) || '0.0'} dB</span>
                    <span className="text-[var(--color-text-muted)]">BODY STATUS:</span>
                    <span className={audioParams.gainLevel && audioParams.gainLevel > -60 ? "text-[var(--color-accent-primary)]" : "text-red-500"}>
                        {audioParams.gainLevel && audioParams.gainLevel > -60 ? "TRANSMITTING" : "SILENT"}
                    </span>
                    <span className="text-[var(--color-text-muted)]">WAVEFORM:</span>
                    <span className="text-white uppercase">{audioParams.waveform || 'N/A'}</span>
                </div>
            </div>
        </div>
    );
};
