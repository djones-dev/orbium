import { EventBus } from '../events/EventBus';
import { AudioEventType, BodyAddedEvent, BodyRemovedEvent } from '../events/AudioEvents';
import {
    SimulationEventType,
    BodyTriggerFiredEvent,
} from '../events/SimulationEvents';
import { SimPosition, SimulationBody } from './types';
import { World } from '../ecs/World';
import { ComponentType } from '../ecs/components/Component';
import { PhysicsComponent } from '../ecs/components/PhysicsComponent';
import { PositionComponent } from '../ecs/components/PositionComponent';

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
        const world = World.getInstance();
        const em = world.entities;

        const ENABLE_GRAVITY = true; // Phase 5c
        const G = 0.001;

        const bodyIds = this.getBodyIds();
        // Include the sun in gravity calculations even though it's not in this.bodies
        if (em.hasEntity('sun-primary')) {
            bodyIds.push('sun-primary');
        }

        // 1. Calculate Gravity Forces
        if (ENABLE_GRAVITY) {
            for (let i = 0; i < bodyIds.length; i++) {
                for (let j = i + 1; j < bodyIds.length; j++) {
                    const idA = bodyIds[i];
                    const idB = bodyIds[j];

                    const physA = em.getComponent<PhysicsComponent>(idA, ComponentType.Physics);
                    const physB = em.getComponent<PhysicsComponent>(idB, ComponentType.Physics);
                    const posA = em.getComponent<PositionComponent>(idA, ComponentType.Position);
                    const posB = em.getComponent<PositionComponent>(idB, ComponentType.Position);

                    if (!physA || !physB || !posA || !posB) continue;

                    // Convert polar to Cartesian for distance and direction
                    const x1 = posA.radius * Math.cos(posA.angle);
                    const z1 = posA.radius * Math.sin(posA.angle);
                    const x2 = posB.radius * Math.cos(posB.angle);
                    const z2 = posB.radius * Math.sin(posB.angle);

                    const dx = x2 - x1;
                    const dz = z2 - z1;
                    const distSq = dx * dx + dz * dz;
                    const dist = Math.sqrt(distSq);

                    if (dist < 0.1) continue; // Avoid singularity

                    // F = G * m1 * m2 / r^2
                    const forceMag = (G * physA.mass * physB.mass) / distSq;

                    // Direction vector
                    const nx = dx / dist;
                    const nz = dz / dist;

                    // Accumulate forces
                    physA.forces.push({ x: nx * forceMag, y: nz * forceMag });
                    physB.forces.push({ x: -nx * forceMag, y: -nz * forceMag });
                }
            }
        }

        // 2. Apply Forces and Integrate
        for (const body of this.bodies.values()) {
            if (!body.active) continue;
    ...

            // Apply ECS forces if present
            const physComp = em.getComponent<PhysicsComponent>(body.id, ComponentType.Physics);
            if (physComp) {
                // Sum forces
                let fx = 0;
                let fz = 0;
                for (const f of physComp.forces) {
                    fx += f.x;
                    fz += f.y;
                }

                if (physComp.forces.length > 0) {
                    // Convert Cartesian force to tangential acceleration
                    // Ft = -Fx * sin(a) + Fz * cos(a)
                    const tangentialForce = -fx * Math.sin(body.position.angle) + fz * Math.cos(body.position.angle);
                    
                    // a_tangential = F / m
                    // alpha = a_tangential / r
                    const radius = Math.max(0.1, body.position.radius); // Avoid division by zero
                    const angularAcceleration = tangentialForce / (physComp.mass * radius);
                    
                    body.velocity.angular += angularAcceleration * dt;
                    
                    // Clear forces
                    physComp.forces = [];
                }

                // Apply damping
                body.velocity.angular *= Math.pow(physComp.damping, dt * 60);
            }

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
