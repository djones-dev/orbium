import { logger } from '@/utils/logger';

/**
 * WorkletManager — centralized AudioWorklet module loading.
 * Tracks which modules have already been registered so each URL is only
 * loaded once per AudioContext.
 */
export class WorkletManager {
    private loaded = new Set<string>();

    async load(context: AudioContext, url: string, name: string): Promise<void> {
        if (this.loaded.has(name)) return;
        try {
            await context.audioWorklet.addModule(url);
            this.loaded.add(name);
        } catch (e) {
            logger.error(`WorkletManager: Failed to load module "${name}" from ${url}`, e);
            throw e;
        }
    }

    isLoaded(name: string): boolean {
        return this.loaded.has(name);
    }

    /** Reset tracking (useful when AudioContext is recreated). */
    reset(): void {
        this.loaded.clear();
    }
}
