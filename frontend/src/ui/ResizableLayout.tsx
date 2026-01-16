import React, { useState, useRef, useEffect } from 'react';
import './ResizableLayout.css';
import { SelectedBodyInfo } from './SelectedBodyInfo';

import { PresetBrowser } from './PresetBrowser';

interface ResizableLayoutProps {
    children: React.ReactNode;
}

const ResizableLayout: React.FC<ResizableLayoutProps> = ({ children }) => {
    const [sidebarWidth, setSidebarWidth] = useState(20); // percentage
    const [inspectorHeight, setInspectorHeight] = useState(250); // pixels
    const [bottomLeftVisible, setBottomLeftVisible] = useState(true);
    const [bottomVisible, setBottomVisible] = useState(true);

    const dragInfo = useRef<{ type: 'width' | 'height' | null; startPos: number; startVal: number }>({
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
                        {!bottomLeftVisible && (
                            <button
                                className="pane-toggle"
                                onClick={() => setBottomLeftVisible(true)}
                                title="Show Bottom-Left"
                            >
                                ＋
                            </button>
                        )}
                    </div>
                    <div className="pane-content">
                        <PresetBrowser />
                    </div>
                </div>

                {bottomLeftVisible && (
                    <>
                        {/* Horizontal Drag Handle for Inspector Height */}
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
            </div>


            {/* Vertical Drag Handle */}
            <div className="drag-handle" onMouseDown={onWidthMouseDown} />

            {/* Right Column: Main View + Bottom Panel */}
            <div className="layout-column right-column">
                <div className="pane main-view">
                    <div className="pane-header-container">
                        <h2 className="pane-header">Main View</h2>
                        {!bottomVisible && (
                            <button
                                className="pane-toggle"
                                onClick={() => setBottomVisible(true)}
                                title="Show Bottom Panel"
                            >
                                ＋
                            </button>
                        )}
                    </div>
                    <div className="pane-content main-content">
                        {children}
                    </div>
                </div>
                {bottomVisible && (
                    <div className="pane bottom-panel">
                        <div className="pane-header-container">
                            <h2 className="pane-header">Bottom Panel</h2>
                            <button
                                className="pane-toggle"
                                onClick={() => setBottomVisible(false)}
                                title="Hide Bottom Panel"
                            >
                                －
                            </button>
                        </div>
                        <div className="pane-content">
                            {/* Panel content here */}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResizableLayout;
