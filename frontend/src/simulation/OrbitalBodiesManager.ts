import { OrbitalBody } from '../types/orbital';
import { SunParameters } from '../types/audio';

export class OrbitalBodiesManager {
    private bodies: OrbitalBody[] = [];
    private onParamsChange?: (id: string, params: Partial<SunParameters>) => void;

    constructor(onParamsChange?: (id: string, params: Partial<SunParameters>) => void) {
        this.onParamsChange = onParamsChange;
    }

    addBody(body: OrbitalBody): void {
        this.bodies.push(body);
    }

    removeBody(id: string): void {
        this.bodies = this.bodies.filter(b => b.id !== id);
    }

    getBodyById(id: string): OrbitalBody | undefined {
        return this.bodies.find(b => b.id === id);
    }

    getBodies(): OrbitalBody[] {
        return this.bodies;
    }

    updateBodyParams(id: string, params: Partial<SunParameters>): void {
        const body = this.getBodyById(id);
        if (body) {
            body.audioParams = { ...body.audioParams, ...params };
            if (this.onParamsChange) {
                this.onParamsChange(id, params);
            }
        }
    }
}
