import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import './ResizableLayout.css';
import { SelectedBodyInfo } from './SelectedBodyInfo';
import { useUIStore } from '../stores/uiStore';

const PresetBrowser = lazy(() => import('./PresetBrowser').then(module => ({ default: module.PresetBrowser })));
const ParameterEditor = lazy(() => import('./ParameterEditor').then(module => ({ default: module.ParameterEditor })));
const MixerPane = lazy(() => import('./MixerTab').then(module => ({ default: module.MixerTab })));

const LoadingPane = ({ label }: { label: string }) => (
    <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] font-mono text-xs opacity-50">
        LOADING {label}...
    </div>
);

interface ResizableLayoutProps {
    children: React.ReactNode;
}

const ResizableLayout: React.FC<ResizableLayoutProps> = ({ children }) => {
    const setSaveModalOpen = useUIStore(state => state.setSaveModalOpen);
    const [sidebarWidth, setSidebarWidth] = useState(20); // percentage
    const [inspectorHeight, setInspectorHeight] = useState(250); // pixels
    const [parametersHeight, setParametersHeight] = useState(250); // pixels
    const [mixerHeight, setMixerHeight] = useState(350); // pixels
    const [bottomLeftVisible, setBottomLeftVisible] = useState(true);
    const [mixerVisible, setMixerVisible] = useState(true);
    const [bottomVisible, setBottomVisible] = useState(true);

    const dragInfo = useRef<{ type: 'width' | 'height' | 'mixer' | 'params' | null; startPos: number; startVal: number }>({
        type: null,
        startPos: 0,
        startVal: 0
    });

    const onWidthMouseDown = (e: React.MouseEvent) => {
        dragInfo.current = {
            type: 'width',
            startPos: e.clientX,
            startVal: sidebarWidth
        };
        e.preventDefault();
    };

    const onHeightMouseDown = (e: React.MouseEvent) => {
        dragInfo.current = {
            type: 'height',
            startPos: e.clientY,
            startVal: inspectorHeight
        };
        e.preventDefault();
    };

    const onMixerMouseDown = (e: React.MouseEvent) => {
        dragInfo.current = {
            type: 'mixer',
            startPos: e.clientY,
            startVal: mixerHeight
        };
        e.preventDefault();
    };

    const onParamsMouseDown = (e: React.MouseEvent) => {
        dragInfo.current = {
            type: 'params',
            startPos: e.clientY,
            startVal: parametersHeight
        };
        e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
        const { type, startPos, startVal } = dragInfo.current;
        if (!type) return;

        if (type === 'width') {
            const deltaX = e.clientX - startPos;
            const newWidth = Math.min(80, Math.max(10, startVal + (deltaX / window.innerWidth) * 100));
            setSidebarWidth(newWidth);
        } else if (type === 'height') {
            const deltaY = startPos - e.clientY; // upwards increases height
            const newHeight = Math.min(600, Math.max(100, startVal + deltaY));
            setInspectorHeight(newHeight);
        } else if (type === 'mixer') {
            const deltaY = startPos - e.clientY;
            const newHeight = Math.min(600, Math.max(350, startVal + deltaY));
            setMixerHeight(newHeight);
        } else if (type === 'params') {
            const deltaY = startPos - e.clientY;
            const newHeight = Math.min(600, Math.max(250, startVal + deltaY));
            setParametersHeight(newHeight);
        }
    };

    const onMouseUp = () => {
        dragInfo.current.type = null;
    };

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    return (
        <div className="resizable-layout-container">
            {/* Left Column: Sidebar + Bottom Left */}
            <div className="layout-column left-column" style={{ width: `${sidebarWidth}%` }}>
                <div className="pane left-sidebar">
                    <div className="pane-header-container">
                        <h2 className="pane-header">PRESETS</h2>
                        <div className="pane-header-actions">
                            <button
                                className="mgmt-cog-btn"
                                onClick={() => setSaveModalOpen(true)}
                                title="Save Current as Preset"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="pane-content">
                        <Suspense fallback={<LoadingPane label="PRESETS" />}>
                            <PresetBrowser />
                        </Suspense>
                    </div>
                </div>

                {bottomLeftVisible && (
                    <>
                        <div className="drag-handle-horizontal" onMouseDown={onHeightMouseDown} />
                        <div className="pane bottom-left-panel" style={{ height: `${inspectorHeight}px` }}>
                            <div className="pane-header-container inspector-header">
                                <h2 className="pane-header">Inspector</h2>
                                <button
                                    className="pane-toggle"
                                    onClick={() => setBottomLeftVisible(false)}
                                    title="Hide Bottom-Left"
                                >
                                    －
                                </button>
                            </div>
                            <div className="pane-content">
                                <SelectedBodyInfo />
                            </div>
                        </div>
                    </>
                )}

                {/* Left Column Dock */}
                {!bottomLeftVisible && (
                    <div className="h-8 flex items-center px-2 gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
                        <button
                            className="px-3 py-1 text-[9px] font-bold tracking-tighter uppercase border border-[var(--color-border)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] transition-all rounded bg-white/[0.05]"
                            onClick={() => setBottomLeftVisible(true)}
                        >
                            ＋ INSPECTOR
                        </button>
                    </div>
                )}
            </div>

            {/* Vertical Drag Handle */}
            <div className="drag-handle" onMouseDown={onWidthMouseDown} />

            {/* Right Column: Main View + Bottom Panel */}
            <div className="layout-column right-column">
                <div className="pane main-view">
                    <div className="pane-header-container">
                        <h2 className="pane-header">Main View</h2>
                    </div>
                    <div className="pane-content main-content">
                        {children}
                    </div>
                </div>

                {bottomVisible && (
                    <>
                        <div className="drag-handle-horizontal" onMouseDown={onParamsMouseDown} />
                        <div className="pane bottom-panel" style={{ height: `${parametersHeight}px` }}>
                            <div className="pane-header-container">
                                <h2 className="pane-header">PARAMETERS</h2>
                                <button
                                    className="pane-toggle"
                                    onClick={() => setBottomVisible(false)}
                                    title="Hide Bottom Panel"
                                >
                                    －
                                </button>
                            </div>
                            <div className="pane-content p-0 overflow-hidden">
                                <Suspense fallback={<LoadingPane label="PARAMETERS" />}>
                                    <ParameterEditor />
                                </Suspense>
                            </div>
                        </div>
                    </>
                )}

                {mixerVisible && (
                    <>
                        <div className="drag-handle-horizontal" onMouseDown={onMixerMouseDown} />
                        <div className="pane mixer-panel" style={{ height: `${mixerHeight}px` }}>
                            <div className="pane-header-container">
                                <h2 className="pane-header">MIXER</h2>
                                <button
                                    className="pane-toggle"
                                    onClick={() => setMixerVisible(false)}
                                    title="Hide Mixer"
                                >
                                    －
                                </button>
                            </div>
                            <div className="pane-content p-0 overflow-hidden">
                                <Suspense fallback={<LoadingPane label="MIXER" />}>
                                    <MixerPane />
                                </Suspense>
                            </div>
                        </div>
                    </>
                )}

                {/* Right Column Dock */}
                {(!bottomVisible || !mixerVisible) && (
                    <div className="h-8 flex items-center px-3 gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        {!bottomVisible && (
                            <button
                                className="px-3 py-1 text-[9px] font-bold tracking-widest uppercase border border-[var(--color-border)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/5 transition-all rounded bg-white/[0.05] flex items-center gap-1.5"
                                onClick={() => setBottomVisible(true)}
                            >
                                <span className="text-[10px]">＋</span> PARAMETERS
                            </button>
                        )}
                        {!mixerVisible && (
                            <button
                                className="px-3 py-1 text-[9px] font-bold tracking-widest uppercase border border-[var(--color-border)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/5 transition-all rounded bg-white/[0.05] flex items-center gap-1.5"
                                onClick={() => setMixerVisible(true)}
                            >
                                <span className="text-[10px]">＋</span> MIXER
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResizableLayout;
