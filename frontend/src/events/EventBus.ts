type Listener<T> = (data: T) => void;

/**
 * Typed pub/sub event bus (singleton).
 * Subscribers receive strongly-typed payloads; unsubscribe via the returned fn.
 */
export class EventBus {
    private static instance: EventBus;
    private listeners = new Map<string, Set<Listener<unknown>>>();

    private constructor() {}

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    on<T>(event: string, listener: Listener<T>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(listener as Listener<unknown>);
        return () => this.off(event, listener);
    }

    off<T>(event: string, listener: Listener<T>): void {
        this.listeners.get(event)?.delete(listener as Listener<unknown>);
    }

    emit<T>(event: string, data: T): void {
        this.listeners.get(event)?.forEach(l => l(data));
    }

    /** Remove all listeners for a given event. Useful in tests. */
    clear(event?: string): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}
