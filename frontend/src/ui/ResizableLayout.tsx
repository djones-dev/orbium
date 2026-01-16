import React, { useState, useRef, useEffect } from 'react';
import './ResizableLayout.css';

interface ResizableLayoutProps {
    children: React.ReactNode;
}

const ResizableLayout: React.FC<ResizableLayoutProps> = ({ children }) => {
    const [sidebarWidth, setSidebarWidth] = useState(20); // percentage
    const [bottomLeftVisible, setBottomLeftVisible] = useState(true);
    const [bottomVisible, setBottomVisible] = useState(true);
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
        isResizing.current = true;
        startX.current = e.clientX;
        startWidth.current = sidebarWidth;
        e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const deltaX = e.clientX - startX.current;
        const newWidth = Math.min(80, Math.max(10, startWidth.current + (deltaX / window.innerWidth) * 100));
        setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
        isResizing.current = false;
    };

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [sidebarWidth]);

    return (
        <div className="resizable-layout-container">
            {/* Left Column: Sidebar + Bottom Left */}
            <div className="layout-column left-column" style={{ width: `${sidebarWidth}%` }}>
                <div className="pane left-sidebar">
                    <div className="pane-header-container">
                        <h2 className="pane-header">Left Sidebar</h2>
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
                        {/* Sidebar content here */}
                    </div>
                </div>
                {bottomLeftVisible && (
                    <div className="pane bottom-left-panel">
                        <div className="pane-header-container">
                            <h2 className="pane-header">Bottom‑Left Panel</h2>
                            <button
                                className="pane-toggle"
                                onClick={() => setBottomLeftVisible(false)}
                                title="Hide Bottom-Left"
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

            {/* Vertical Drag Handle */}
            <div className="drag-handle" onMouseDown={onMouseDown} />

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
