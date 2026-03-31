import { EntityManager } from '../EntityManager';
import { System } from './System';
import { ComponentType } from '../components/Component';
import { EventBus } from '@/events/EventBus';
import { BodyTriggerFiredEvent, SimulationEventType } from '@/events/SimulationEvents';
import { NoteEvent, NoteEventType } from '@/events/NoteEvents';
import { World } from '../World';
import { PositionComponent } from '../components/PositionComponent';
import { AudioComponent } from '../components/AudioComponent';
import { PhenomenaComponent } from '../components/PhenomenaComponent';
import { v4 as uuidv4 } from 'uuid';

const polarToCartesian = (r: number, a: number) => ({
    x: r * Math.cos(a),
    y: r * Math.sin(a),
});

const distance = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
};

export class PhenomenaSystem extends System {
    readonly priority = 150;
    readonly requiredComponents: ComponentType[] = [ComponentType.Phenomena];
    private bus = EventBus.getInstance();
    private world: World | null = null;

    constructor() {
        super();
        this.bus.on<BodyTriggerFiredEvent>(SimulationEventType.BODY_TRIGGER_FIRED, this.handleBodyTrigger.bind(this));
    }

    private handleBodyTrigger({ id, timestamp, angle }: BodyTriggerFiredEvent): void {
        this.world = World.getInstance();
        const position = this.world.entities.getComponent<PositionComponent>(id, ComponentType.Position);
        const audio = this.world.entities.getComponent<AudioComponent>(id, ComponentType.Audio);

        if (!position || !audio) {
            return;
        }

        let noteEvent: NoteEvent | null = {
            id: uuidv4(),
            planetId: id,
            pitch: audio.parameters.rootFrequency ?? 440,
            velocity: 1.0, // placeholder
            timestamp,
            position: { radius: position.radius, angle },
            modifiers: [],
        };

        const phenomenaIds = this.world.entities.query(ComponentType.Phenomena);
        for (const pId of phenomenaIds) {
            const phenomenon = this.world.entities.getComponent<PhenomenaComponent>(pId, ComponentType.Phenomena);
            const phenomenonPosition = this.world.entities.getComponent<PositionComponent>(pId, ComponentType.Position);

            if (phenomenon && phenomenonPosition && noteEvent) {
                let isActive = false;
                switch (phenomenon.phenomenonType) {
                    case 'comet':
                    case 'lagrange_point': {
                        const influenceRadius = phenomenon.zone.proximity ?? 2;
                        const planetCartesian = polarToCartesian(noteEvent.position.radius, noteEvent.position.angle);
                        const phenomenonCartesian = polarToCartesian(phenomenonPosition.radius, phenomenonPosition.angle);
                        const dist = distance(planetCartesian, phenomenonCartesian);
                        if (dist <= influenceRadius) {
                            isActive = true;
                        }
                        break;
                    }
                    case 'pulsar':
                        // For pulsar, the modifier itself handles the gating logic (is the planet in the beam?)
                        // So we consider it always "in range" to be processed.
                        isActive = true;
                        break;
                }

                if (isActive) {
                    noteEvent = phenomenon.modifier(noteEvent);
                    if (!noteEvent) {
                        // Note was suppressed by a phenomenon
                        return;
                    }
                }
            }
        }

        if (noteEvent) {
            this.bus.emit<NoteEvent>(NoteEventType.MODIFIED_NOTE_EVENT, noteEvent);
        }
    }

    update(entityManager: EntityManager, dt: number): void {
        const phenomenaIds = entityManager.query(...this.requiredComponents);

        for (const id of phenomenaIds) {
            const phenomenon = entityManager.getComponent<PhenomenaComponent>(id, ComponentType.Phenomena);
            if (phenomenon?.phenomenonType === 'pulsar') {
                const rotationSpeed = phenomenon.properties.rotationSpeed ?? 0;
                const currentAngle = phenomenon.properties.beamAngle ?? 0;
                phenomenon.properties.beamAngle = (currentAngle + rotationSpeed * dt) % (2 * Math.PI);
            }
        }
    }
}
