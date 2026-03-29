/**
 * OrbitalBodiesManager Integration Tests
 *
 * Verifies body lifecycle, callback system, backend sync, and subscription
 * notifications. These tests establish the behavioral contract that must be
 * preserved after the ECS migration replaces the internal implementation.
 */

import { OrbitalBodiesManager } from '../OrbitalBodiesManager';
import { OrbitalBody } from '../../types/orbital';
import { SunParameters } from '../../types/audio';

// Mock the bodyService module so tests run without a live backend
jest.mock('../../services/BodyService', () => ({
    bodyService: {
        getBodies: jest.fn().mockResolvedValue([]),
        createBody: jest.fn().mockImplementation((body: any) => Promise.resolve(body)),
        updateBody: jest.fn().mockResolvedValue(undefined),
        deleteBody: jest.fn().mockResolvedValue(undefined),
        addAttribute: jest.fn().mockResolvedValue(undefined),
    }
}));

import { bodyService } from '../../services/BodyService';

const makeBody = (overrides: Partial<OrbitalBody> = {}): OrbitalBody => ({
    id: crypto.randomUUID(),
    type: 'planet',
    position: { radius: 5, angle: 0 },
    velocity: 0.1,
    audioParams: {
        rootFrequency: 110,
        filterCutoff: 1000,
        filterResonance: 1.0,
        detuneSpread: 10,
        lfoRate: 0.5,
        gainLevel: -12,
        waveform: 'sine',
        distortion: 0,
        noiseVol: -40,
        subVol: -12,
        noiseEnabled: true,
        subEnabled: true,
    },
    audioLayerId: 'layer-test',
    visualConfig: { color: '#4169E1', size: 20, shaderUniforms: {} },
    ...overrides,
});

describe('OrbitalBodiesManager', () => {
    let manager: OrbitalBodiesManager;
    let onParamsChange: jest.Mock;
    let onBodyAdded: jest.Mock;
    let onBodyRemoved: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        onParamsChange = jest.fn();
        onBodyAdded = jest.fn();
        onBodyRemoved = jest.fn();
        manager = new OrbitalBodiesManager(onParamsChange, onBodyAdded, onBodyRemoved);
    });

    // ── Construction ──────────────────────────────────────────────────────────

    describe('construction', () => {
        it('starts with an empty bodies list', () => {
            expect(manager.getBodies()).toHaveLength(0);
        });

        it('works without callbacks', () => {
            const bare = new OrbitalBodiesManager();
            expect(bare.getBodies()).toHaveLength(0);
        });
    });

    // ── addBody ───────────────────────────────────────────────────────────────

    describe('addBody', () => {
        it('adds body to internal list', async () => {
            const body = makeBody();
            await manager.addBody(body, false);
            expect(manager.getBodies()).toHaveLength(1);
            expect(manager.getBodyById(body.id)).toEqual(body);
        });

        it('fires onBodyAdded callback', async () => {
            const body = makeBody();
            await manager.addBody(body, false);
            expect(onBodyAdded).toHaveBeenCalledTimes(1);
            expect(onBodyAdded).toHaveBeenCalledWith(body);
        });

        it('notifies subscribers', async () => {
            const listener = jest.fn();
            manager.subscribe(listener);
            await manager.addBody(makeBody(), false);
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('syncs to backend when sync=true', async () => {
            await manager.addBody(makeBody(), true);
            expect(bodyService.createBody).toHaveBeenCalledTimes(1);
        });

        it('skips backend when sync=false', async () => {
            await manager.addBody(makeBody(), false);
            expect(bodyService.createBody).not.toHaveBeenCalled();
        });

        it('reverts local add if backend sync fails', async () => {
            (bodyService.createBody as jest.Mock).mockRejectedValueOnce(new Error('network'));
            const body = makeBody();
            await expect(manager.addBody(body, true)).rejects.toThrow();
            expect(manager.getBodies()).toHaveLength(0);
        });
    });

    // ── removeBody ────────────────────────────────────────────────────────────

    describe('removeBody', () => {
        it('removes body from internal list', async () => {
            const body = makeBody();
            await manager.addBody(body, false);
            await manager.removeBody(body.id, false);
            expect(manager.getBodies()).toHaveLength(0);
        });

        it('fires onBodyRemoved callback', async () => {
            const body = makeBody();
            await manager.addBody(body, false);
            await manager.removeBody(body.id, false);
            expect(onBodyRemoved).toHaveBeenCalledWith(body.id);
        });

        it('notifies subscribers on removal', async () => {
            const body = makeBody();
            await manager.addBody(body, false);

            const listener = jest.fn();
            manager.subscribe(listener);
            await manager.removeBody(body.id, false);
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('syncs deletion to backend when sync=true', async () => {
            const body = makeBody();
            await manager.addBody(body, false);
            await manager.removeBody(body.id, true);
            expect(bodyService.deleteBody).toHaveBeenCalledWith(body.id);
        });

        it('is a no-op for unknown id', async () => {
            await manager.removeBody('non-existent', false);
            expect(manager.getBodies()).toHaveLength(0);
            expect(onBodyRemoved).toHaveBeenCalledWith('non-existent');
        });
    });

    // ── updateBodyParams ──────────────────────────────────────────────────────

    describe('updateBodyParams', () => {
        it('merges params onto existing body', async () => {
            const body = makeBody();
            await manager.addBody(body, false);

            const updates: Partial<SunParameters> = { rootFrequency: 220, gainLevel: -6 };
            await manager.updateBodyParams(body.id, updates, false);

            const updated = manager.getBodyById(body.id);
            expect(updated?.audioParams.rootFrequency).toBe(220);
            expect(updated?.audioParams.gainLevel).toBe(-6);
            // Untouched keys remain
            expect(updated?.audioParams.filterCutoff).toBe(1000);
        });

        it('fires onParamsChange callback', async () => {
            const body = makeBody();
            await manager.addBody(body, false);

            const updates: Partial<SunParameters> = { rootFrequency: 330 };
            await manager.updateBodyParams(body.id, updates, false);

            expect(onParamsChange).toHaveBeenCalledWith(body.id, updates);
        });

        it('syncs to backend when sync=true', async () => {
            const body = makeBody();
            await manager.addBody(body, false);
            await manager.updateBodyParams(body.id, { rootFrequency: 440 }, true);
            expect(bodyService.updateBody).toHaveBeenCalledWith(body.id, { rootFrequency: 440 });
        });

        it('does nothing for unknown body id', async () => {
            await manager.updateBodyParams('ghost-id', { rootFrequency: 440 }, false);
            expect(onParamsChange).not.toHaveBeenCalled();
        });
    });

    // ── subscribe / unsubscribe ───────────────────────────────────────────────

    describe('subscriptions', () => {
        it('returns an unsubscribe function that stops notifications', async () => {
            const listener = jest.fn();
            const unsub = manager.subscribe(listener);

            await manager.addBody(makeBody(), false);
            expect(listener).toHaveBeenCalledTimes(1);

            unsub();
            await manager.addBody(makeBody(), false);
            expect(listener).toHaveBeenCalledTimes(1); // still 1
        });

        it('supports multiple independent subscribers', async () => {
            const a = jest.fn();
            const b = jest.fn();
            manager.subscribe(a);
            manager.subscribe(b);

            await manager.addBody(makeBody(), false);
            expect(a).toHaveBeenCalledTimes(1);
            expect(b).toHaveBeenCalledTimes(1);
        });
    });

    // ── loadFromBackend ───────────────────────────────────────────────────────

    describe('loadFromBackend', () => {
        it('hydrates bodies from backend response', async () => {
            const serverBodies = [makeBody({ id: 'server-1' }), makeBody({ id: 'server-2' })];
            (bodyService.getBodies as jest.Mock).mockResolvedValueOnce(serverBodies);

            await manager.loadFromBackend();

            expect(manager.getBodies()).toHaveLength(2);
            expect(manager.getBodyById('server-1')).toBeDefined();
        });

        it('preserves sun-primary local body across reload', async () => {
            const sun = makeBody({ id: 'sun-primary', type: 'sun' });
            await manager.addBody(sun, false);

            (bodyService.getBodies as jest.Mock).mockResolvedValueOnce([makeBody({ id: 'planet-1' })]);
            await manager.loadFromBackend();

            expect(manager.getBodyById('sun-primary')).toBeDefined();
            expect(manager.getBodyById('planet-1')).toBeDefined();
        });

        it('notifies subscribers after load', async () => {
            (bodyService.getBodies as jest.Mock).mockResolvedValueOnce([makeBody()]);
            const listener = jest.fn();
            manager.subscribe(listener);

            await manager.loadFromBackend();
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('handles backend failure gracefully without throwing', async () => {
            (bodyService.getBodies as jest.Mock).mockRejectedValueOnce(new Error('500'));
            await expect(manager.loadFromBackend()).resolves.not.toThrow();
        });
    });

    // ── getBodyById ───────────────────────────────────────────────────────────

    describe('getBodyById', () => {
        it('returns undefined for missing id', () => {
            expect(manager.getBodyById('nope')).toBeUndefined();
        });

        it('returns correct body for known id', async () => {
            const body = makeBody({ id: 'known' });
            await manager.addBody(body, false);
            expect(manager.getBodyById('known')).toEqual(body);
        });
    });
});

// ── Performance baseline ──────────────────────────────────────────────────────

describe('OrbitalBodiesManager performance baseline', () => {
    it('handles 100 sequential addBody calls in <500ms', async () => {
        const manager = new OrbitalBodiesManager();
        const start = performance.now();

        for (let i = 0; i < 100; i++) {
            await manager.addBody(makeBody(), false);
        }

        const duration = performance.now() - start;
        console.log(`100 bodies added in ${duration.toFixed(2)}ms`);
        expect(duration).toBeLessThan(500);
        expect(manager.getBodies()).toHaveLength(100);
    });

    it('getBodies() on 100 items is effectively instant (<1ms)', async () => {
        const manager = new OrbitalBodiesManager();
        for (let i = 0; i < 100; i++) {
            await manager.addBody(makeBody(), false);
        }

        const start = performance.now();
        const bodies = manager.getBodies();
        const duration = performance.now() - start;

        console.log(`getBodies() (100 items): ${duration.toFixed(3)}ms`);
        expect(duration).toBeLessThan(1);
        expect(bodies).toHaveLength(100);
    });
});
