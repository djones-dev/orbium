import { useUIStore } from '../stores/uiStore';

/**
 * logger — utility for gated logging based on the UIStore's debug flag.
 */
export const logger = {
    log: (...args: any[]) => {
        if (useUIStore.getState().debug) {
            console.log(...args);
        }
    },
    error: (...args: any[]) => {
        // We keep errors visible in production unless they are purely for debugging,
        // but per Phase 7d instructions, we gate them.
        if (useUIStore.getState().debug) {
            console.error(...args);
        }
    },
    warn: (...args: any[]) => {
        if (useUIStore.getState().debug) {
            console.warn(...args);
        }
    }
};
