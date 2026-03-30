/**
 * An entity is simply a unique string identifier — the same IDs already used
 * throughout the application (e.g. 'sun-primary', crypto.randomUUID()).
 * Keeping them as strings avoids any ID translation layer.
 */
export type EntityId = string;
