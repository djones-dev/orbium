import { EventBus } from '../events/EventBus';
import { AudioEventType, BodyAddedEvent, BodyRemovedEvent } from '../events/AudioEvents';
import {
    SimulationEventType,
    BodyTriggerFiredEvent,
} from '../events/SimulationEvents';
import { SimPosition, SimulationBody } from './types';

const TWO_PI = Math.PI * 2;

/**
 * PhysicsSystem — owns all simulation state; completely independent of React.
 */
export class PhysicsSystem {
    private static instance: PhysicsSystem;

    private bodies = new Map<string, SimulationBody>();
    private bus = EventBus.getInstance();

    private accumulator = 0;
    readonly fixedDt = 1 / 60; // 60 Hz physics

    private constructor() {
        this.bus.on<BodyAddedEvent>(AudioEventType.BODY_ADDED, ({ body }) => {
            if (body.type !== 'sun') {
                this.addBody(body.id, body.position, body.velocity ?? 0.1);
            }
        });

        this.bus.on<BodyRemovedEvent>(AudioEventType.BODY_REMOVED, ({ id }) => {
            this.removeBody(id);
        });
    }

    static getInstance(): PhysicsSystem {
        if (!PhysicsSystem.instance) {
            PhysicsSystem.instance = new PhysicsSystem();
        }
        return PhysicsSystem.instance;
    }

    addBody(
        id: string,
        position: { radius: number; angle: number },
        angularVelocity: number,
        triggerAngle = 0,
    ): void {
        this.bodies.set(id, {
            id,
            position: { radius: position.radius, angle: position.angle },
            velocity: { angular: angularVelocity },
            triggerAngle,
            active: true,
        });
    }

    removeBody(id: string): void {
        this.bodies.delete(id);
    }

    getPosition(id: string): SimPosition | undefined {
        const body = this.bodies.get(id);
        return body ? { ...body.position } : undefined;
    }

    getBodyIds(): string[] {
        return Array.from(this.bodies.keys());
    }

    setActive(id: string, active: boolean): void {
        const body = this.bodies.get(id);
        if (body) body.active = active;
    }

    /**
     * Advance the simulation by `delta` seconds using a fixed timestep.
     * Call this once per render frame from `usePhysicsLoop`.
     */
    step(delta: number): void {
        this.accumulator += delta;
        while (this.accumulator >= this.fixedDt) {
            this.integrate(this.fixedDt);
            this.accumulator -= this.fixedDt;
        }
    }

    private integrate(dt: number): void {
        // Pure kinematic integration: angle += angular_velocity * dt.
        // Gravity and damping are intentionally disabled — orbital period is
        // musical timing in this synthesizer, so velocity must stay constant.

        // Integrate
        for (const body of this.bodies.values()) {
            if (!body.active) continue;

            const prevAngle = body.position.angle;
            body.position.angle += body.velocity.angular * dt;

            // Normalise to [0, 2π)
            body.position.angle = ((body.position.angle % TWO_PI) + TWO_PI) % TWO_PI;

            // Trigger detection: did we cross triggerAngle this step?
            if (this.crossedAngle(prevAngle, body.position.angle, body.triggerAngle)) {
                this.bus.emit<BodyTriggerFiredEvent>(SimulationEventType.BODY_TRIGGER_FIRED, {
                    id: body.id,
                    angle: body.position.angle,
                    timestamp: performance.now(),
                });
            }
        }
    }

    /**
     * Returns true if the orbit swept through `target` while advancing from
     * `prev` to `curr` in the positive (increasing angle) direction.
     * Handles the 0 / 2π wrap-around.
     */
    private crossedAngle(prev: number, curr: number, target: number): boolean {
        const p = ((prev % TWO_PI) + TWO_PI) % TWO_PI;
        const c = ((curr % TWO_PI) + TWO_PI) % TWO_PI;
        const t = ((target % TWO_PI) + TWO_PI) % TWO_PI;

        if (c >= p) {
            // No wrap: simple range check
            return t >= p && t < c;
        } else {
            // Wrapped around 2π: two segments
            return t >= p || t < c;
        }
    }
}
