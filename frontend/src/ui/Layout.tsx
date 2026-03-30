import React, { useState, useRef, useEffect } from 'react';
import { StatusIndicator, TerminalButton } from './terminal';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useUIStore } from '../stores/uiStore';
import ResizableLayout from './ResizableLayout';

import { PresetTooltipOverlay } from './PresetTooltipOverlay';
import { SavePresetModal } from './SavePresetModal';
import { ToastContainer } from './ToastContainer';
import { AudioStartModal } from './AudioStartModal';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { isAudioActive, isPlaying, initializeAudio, togglePlayback, resetScene } = useAudioEngine();
    const showToast = useUIStore(s => s.showToast);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleResetScene = async () => {
        setSettingsOpen(false);
        if (!window.confirm('Clear all bodies from the scene? This cannot be undone.')) return;
        await resetScene();
        showToast('SCENE CLEARED', 'success');
    };

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
                    <div className="relative" ref={settingsRef}>
                        <TerminalButton
                            onClick={() => setSettingsOpen(o => !o)}
                            className={`hover:border-[var(--color-accent-primary)]/50 group ${settingsOpen ? 'border-[var(--color-accent-primary)]/50' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                <svg className={`w-3 h-3 transition-transform duration-500 ${settingsOpen ? 'rotate-90' : 'group-hover:rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                SETTINGS
                            </div>
                        </TerminalButton>

                        {settingsOpen && (
                            <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] border border-[var(--color-border)] bg-[var(--color-bg)] font-mono text-xs shadow-lg">
                                <div className="px-3 py-1.5 text-[var(--color-text-secondary)] border-b border-[var(--color-border)] tracking-widest">
                                    SYSTEM
                                </div>
                                <button
                                    onClick={handleResetScene}
                                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors tracking-wider flex items-center gap-2"
                                >
                                    <span className="text-red-500">⚠</span> RESET SCENE
                                </button>
                            </div>
                        )}
                    </div>
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
