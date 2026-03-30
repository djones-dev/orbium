import React from 'react';
import { StatusIndicator, TerminalButton } from './terminal';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { logger } from '@/utils/logger';
import ResizableLayout from './ResizableLayout';

import { PresetTooltipOverlay } from './PresetTooltipOverlay';
import { SavePresetModal } from './SavePresetModal';
import { ToastContainer } from './ToastContainer';
import { AudioStartModal } from './AudioStartModal';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { isAudioActive, isPlaying, initializeAudio, togglePlayback } = useAudioEngine();

    // No auto-init. User must click modal.

    const handlePowerClick = () => {
        togglePlayback();
    };

    return (
        <div className="h-screen w-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col font-sans overflow-hidden relative">
            {/* Top Bar */}
            <div className="h-12 border-b border-[var(--color-border)] flex items-center px-6 bg-[var(--color-bg)] select-none">
                <span className="font-bold tracking-widest text-[var(--color-text-primary)] mr-6">ORBIUM v1.0</span>
                <StatusIndicator label="SYSTEM ONLINE" active={true} />
                <div className="flex-1" />
                {/* Overlay Controls (top‑right) */}
                <div className="flex gap-2">
                    <TerminalButton
                        active={isPlaying}
                        onClick={handlePowerClick}
                        className={`transition-all duration-300 min-w-[124px] ${isPlaying
                            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/5'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            {isPlaying ? (
                                <>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    SYSTEM: ON
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                    SYSTEM: PAUSED
                                </>
                            )}
                        </div>
                    </TerminalButton>
                    <TerminalButton
                        onClick={() => logger.log('General Settings clicked')}
                        className="hover:border-[var(--color-accent-primary)]/50 group"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 transition-transform duration-500 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            SETTINGS
                        </div>
                    </TerminalButton>
                </div>
            </div>
            <ResizableLayout>{children}</ResizableLayout>

            {/* Bottom Status Bar */}
            <div className="h-8 border-t border-[var(--color-border)] bg-[var(--color-bg)] flex items-center px-4 text-[10px] font-mono select-none text-[var(--color-text-secondary)]">
                <span className="mr-6">READY</span>
                <span className="mr-6 flex items-center gap-2">
                    AUDIO
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[var(--color-accent-audio)]' : 'bg-yellow-500'}`}></span>
                </span>
                <div className="flex-1" />
                <span>&copy; 2026 ORBIUM</span>
            </div>

            {/* Global Overlays */}
            {!isAudioActive && <AudioStartModal onStart={initializeAudio} />}
            <PresetTooltipOverlay />
            <SavePresetModal />
            <ToastContainer />
        </div>
    );
};


export default Layout;
