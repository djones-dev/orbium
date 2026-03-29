/** Polar-coordinate position on the orbital plane. */
export interface SimPosition {
    radius: number; // world units from origin
    angle: number;  // radians, 0 = positive-X axis, increases clockwise when viewed from above
}

/** Velocity components for a simulated body. */
export interface SimVelocity {
    angular: number; // radians/second (positive = clockwise from above)
}

/**
 * Internal state owned exclusively by PhysicsSystem.
 * Intentionally separate from OrbitalBody so the simulation layer has no
 * dependency on audio/preset fields.
 */
export interface SimulationBody {
    id: string;
    position: SimPosition;
    velocity: SimVelocity;
    /** Angle at which a trigger event fires (default 0 rad). */
    triggerAngle: number;
    active: boolean;
}
