import React from 'react';
import { TerminalButton, StatusIndicator, TerminalPanel } from './terminal';
import { SunPanel } from './SunPanel';
import { useAudioEngine } from '../hooks/useAudioEngine';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { initializeAudio, stopAudio, isAudioActive } = useAudioEngine();
    const tempo = 1.0;

    const handleStart = () => {
        initializeAudio();
    };
    const handleStop = () => {
        stopAudio();
    };

    return (
        <div className="h-screen w-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col font-sans overflow-hidden">

            {/* Top Bar */}
            <div className="h-12 border-b border-[var(--color-border)] flex items-center px-6 bg-[var(--color-bg)] select-none">
                <span className="font-bold tracking-widest text-[var(--color-text-primary)] mr-6">ORBIUM v1.0</span>
                <StatusIndicator label="SYSTEM ONLINE" active={true} />
                <div className="flex-1"></div>
                {/* Optional: Simple Clock or Status here */}
            </div>

            {/* Main Content Area - Split View */}
            <div className="flex-1 flex flex-row min-h-0">

                {/* Left Column: Controls (Fixed 340px width to accommodate panels) */}
                <div className="w-[340px] flex-none flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] overflow-y-auto overflow-x-hidden custom-scrollbar">

                    <div className="p-4 space-y-4">
                        {/* Transport Panel */}
                        <TerminalPanel title="TRANSPORT">
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <TerminalButton onClick={handleStart} active={isAudioActive} className="flex-1">
                                        START
                                    </TerminalButton>
                                    <TerminalButton onClick={handleStop} active={!isAudioActive} className="flex-1">
                                        STOP
                                    </TerminalButton>
                                </div>
                                <div className="flex justify-between items-center text-xs font-mono px-1">
                                    <span className="text-[var(--color-text-secondary)]">TEMPO</span>
                                    <span className="text-[var(--color-accent-primary)]">{tempo.toFixed(2)}X</span>
                                </div>
                            </div>
                        </TerminalPanel>

                        {/* Sun Parameters */}
                        <SunPanel />

                        {/* Creation Panel */}
                        <TerminalPanel title="CREATION">
                            <div className="flex flex-col gap-2">
                                <TerminalButton className="w-full text-left">PLANET</TerminalButton>
                                <TerminalButton className="w-full text-left">COMET</TerminalButton>
                                <TerminalButton className="w-full text-left">BELT</TerminalButton>
                                <div className="mt-2 text-[10px] flex justify-between font-mono text-[var(--color-text-secondary)]">
                                    <span>MODE: BLEND</span>
                                    <span className="cursor-pointer hover:text-[var(--color-text-highlight)]">HELP?</span>
                                </div>
                            </div>
                        </TerminalPanel>

                        {/* Inspector Placeholder */}
                        <TerminalPanel title="INSPECTOR">
                            <div className="h-24 flex items-center justify-center text-xs font-mono text-[var(--color-text-secondary)] opacity-50 border border-dashed border-[var(--color-border)]">
                                NO SELECTION
                            </div>
                        </TerminalPanel>
                    </div>

                </div>

                {/* Right Column: Visualization (Fills exact remaining width) */}
                <div className="flex-1 relative bg-black h-full">
                    {children}

                    {/* Overlay Label */}
                    <div className="absolute top-6 right-6 pointer-events-none opacity-50 text-[10px] tracking-[0.2em] text-[var(--color-text-highlight)] font-mono">
                        [ VISUALIZATION ONLINE ]
                    </div>
                </div>

            </div>

            {/* Bottom Status Bar (Optional, can be removed to maximise vertical space) */}
            <div className="h-8 border-t border-[var(--color-border)] bg-[var(--color-bg)] flex items-center px-4 text-[10px] font-mono select-none text-[var(--color-text-secondary)]">
                <span className="mr-6">READY</span>
                <span className="mr-6 flex items-center gap-2">
                    AUDIO
                    <span className={`w-1.5 h-1.5 rounded-full ${isAudioActive ? 'bg-[var(--color-accent-audio)]' : 'bg-[var(--color-text-secondary)]'}`}></span>
                </span>
                <div className="flex-1"></div>
                <span>&copy; 2026 ORBIUM</span>
            </div>

        </div>
    );
};

export default Layout;
