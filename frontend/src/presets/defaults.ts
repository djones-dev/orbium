import { SynthModule } from '../types/module';

const now = Date.now();

export const DEFAULT_PRESETS: SynthModule[] = [
    // Oscillators
    {
        id: 'osc-sine-pure',
        name: 'Pure Sine',
        description: 'Clean sine oscillator. Full-range, transparent, no harmonics.',
        role: 'oscillator',
        category: 'planet',
        oscillatorType: 'basic',
        defaults: {
            oscillator: {
                type: 'basic',
                params: { waveform: 'sine' }
            },
            gainLevel: -6,
            filter: { filterCutoff: 20000 },
            distortion: { distortion: 0 }
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'osc-saw-bright',
        name: 'Bright Sawtooth',
        description: 'Rich sawtooth with mild drive. Bright, harmonically dense.',
        role: 'oscillator',
        category: 'planet',
        oscillatorType: 'basic',
        defaults: {
            oscillator: {
                type: 'basic',
                params: { waveform: 'sawtooth' }
            },
            gainLevel: -12,
            filter: { filterCutoff: 5000 },
            distortion: { distortion: 10 }
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'osc-tri-soft',
        name: 'Soft Triangle',
        description: 'Warm triangle wave. Gentle on the high end, body without edge.',
        role: 'oscillator',
        category: 'planet',
        oscillatorType: 'basic',
        defaults: {
            oscillator: {
                type: 'basic',
                params: { waveform: 'triangle' }
            },
            gainLevel: -9,
            filter: { filterCutoff: 8000 },
            distortion: { distortion: 0 }
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    // Modulators
    {
        id: 'mod-lfo-slow',
        name: 'Slow LFO',
        description: 'Slow cyclic modulator for drift and subtle motion.',
        role: 'modulator',
        category: 'moon',
        defaults: {
            filter: { lfoRate: 0.5 },
            modType: 'lfo',
            modDepth: 30,
            modTarget: 'filter.lfoRate'
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'mod-adsr-trigger',
        name: 'Orbit Trigger',
        description: 'ADSR envelope fired on each orbital pass.',
        role: 'modulator',
        category: 'moon',
        defaults: {
            modType: 'adsr',
            modDepth: 80,
            modTarget: 'gainLevel',
            envelope: {
                attack: 0.05,
                decay: 0.2,
                sustain: 0.1,
                release: 0.8
            }
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    // Effects
    {
        id: 'fx-phaser-solar',
        name: 'Solar Phaser',
        description: 'Sweeping phase modulation. Adds shimmer and movement.',
        role: 'effect',
        category: 'attribute',
        effectType: 'phaser',
        defaults: {
            effects: ['phaser'],
            phaser: {
                phaserRate: 0.8,
                phaserDepth: 0.6,
                phaserFeedback: 0.5
            }
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'fx-reverb-deep',
        name: 'Deep Space Reverb',
        description: 'Long, diffuse reverb. Dissolves the signal into space.',
        role: 'effect',
        category: 'attribute',
        effectType: 'reverb',
        defaults: {
            effects: ['reverb'],
            reverb: {
                reverbMix: 0.5,
                reverbSize: 3.5
            }
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    // Phenomena
    {
        id: 'phen-comet',
        name: 'Comet',
        description: 'A fast-moving celestial object that orbits unpredictably.',
        role: 'phenomenon',
        category: 'phenomenon',
        defaults: {
            phenomenonType: 'comet',
            zone: { proximity: 2 },
            modType: 'lfo',
            modDepth: 0,
            modTarget: 'filter.filterCutoff'
        } as any,
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'phen-pulsar',
        name: 'Pulsar',
        description: 'A rotating beacon. Notes fire only when the beam sweeps across orbiting bodies.',
        role: 'phenomenon',
        category: 'phenomenon',
        defaults: {
            phenomenonType: 'pulsar',
            zone: { proximity: 2 },
            properties: {
                beamAngle: 0,
                beamWidth: 0.8,
                rotationSpeed: 1.2
            },
            modType: 'lfo',
            modDepth: 0,
            modTarget: 'filter.filterCutoff'
        } as any,
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'phen-lagrange',
        name: 'Lagrange Point',
        description: 'A gravitational equilibrium zone. Modulates notes passing through its field.',
        role: 'phenomenon',
        category: 'phenomenon',
        defaults: {
            phenomenonType: 'lagrange_point',
            zone: { proximity: 3 },
            properties: {
                scale: 'major',
                root: 60
            },
            modType: 'lfo',
            modDepth: 0,
            modTarget: 'filter.filterCutoff'
        } as any,
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    }
];
