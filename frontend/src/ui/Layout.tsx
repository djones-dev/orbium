import React from 'react';
import { StatusIndicator } from './terminal';
import { useAudioEngine } from '../hooks/useAudioEngine';
import ResizableLayout from './ResizableLayout';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { isAudioActive } = useAudioEngine();

    return (
        <div className="h-screen w-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col font-sans overflow-hidden relative">
            {/* Top Bar */}
            <div className="h-12 border-b border-[var(--color-border)] flex items-center px-6 bg-[var(--color-bg)] select-none">
                <span className="font-bold tracking-widest text-[var(--color-text-primary)] mr-6">ORBIUM v1.0</span>
                <StatusIndicator label="SYSTEM ONLINE" active={true} />
                <div className="flex-1" />
                {/* Overlay Controls (top‑right) */}
                <div className="flex gap-2">
                    <button className="px-3 py-1 bg-[var(--color-accent-primary)] text-[var(--color-bg)] rounded">Power</button>
                    <button className="px-3 py-1 bg-[var(--color-accent-secondary)] text-[var(--color-bg)] rounded">Settings</button>
                </div>
            </div>

            {/* Main Content Area – Resizable Layout */}
            <ResizableLayout>{children}</ResizableLayout>

            {/* Bottom Status Bar */}
            <div className="h-8 border-t border-[var(--color-border)] bg-[var(--color-bg)] flex items-center px-4 text-[10px] font-mono select-none text-[var(--color-text-secondary)]">
                <span className="mr-6">READY</span>
                <span className="mr-6 flex items-center gap-2">
                    AUDIO
                    <span className={`w-1.5 h-1.5 rounded-full ${isAudioActive ? 'bg-[var(--color-accent-audio)]' : 'bg-[var(--color-text-secondary)]'}`}></span>
                </span>
                <div className="flex-1" />
                <span>&copy; 2026 ORBIUM</span>
            </div>
        </div>
    );
};

export default Layout;
