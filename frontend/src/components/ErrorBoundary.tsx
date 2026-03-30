import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary — catches runtime errors in its child subtree and displays a
 * retro-styled error screen instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="h-full w-full flex items-center justify-center bg-black text-red-500 font-mono p-10 border-2 border-red-900 m-4 overflow-auto">
                    <div className="max-w-2xl">
                        <h1 className="text-2xl mb-4 font-bold tracking-tighter">
                            [ FATAL_SYSTEM_ERROR ]
                        </h1>
                        <p className="mb-6 opacity-80 leading-relaxed">
                            A critical kernel panic occurred in the visualization matrix. 
                            The simulation has been suspended to prevent cascade failure.
                        </p>
                        <div className="bg-red-900/20 p-4 border border-red-900/50 mb-6 text-xs whitespace-pre-wrap">
                            {this.state.error?.message || 'Unknown exception'}
                            {this.state.error?.stack && (
                                <div className="mt-2 opacity-50 text-[8px]">
                                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-900 hover:bg-red-800 text-white px-4 py-2 text-xs transition-colors border border-red-700"
                        >
                            REBOOT_SYSTEM
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
