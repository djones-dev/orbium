import { Preset } from '../types/preset';

const now = Date.now();

export const DEFAULT_PRESETS: Preset[] = [
    // Planet Generators
    {
        id: 'planet-sine-pure',
        name: 'Pure Sphere',
        description: 'Clean sine wave generator for smooth, melodic layers.',
        type: 'generator',
        category: 'planet',
        parameters: {
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
        id: 'planet-saw-aggressive',
        name: 'Jagged Core',
        description: 'Aggressive sawtooth wave for rich harmonics and presence.',
        type: 'generator',
        category: 'planet',
        parameters: {
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
        id: 'planet-tri-soft',
        name: 'Soft Prism',
        description: 'Mellow triangle wave with a gentle character.',
        type: 'generator',
        category: 'planet',
        parameters: {
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
    // Moon Modulators
    {
        id: 'moon-slow-pulse',
        name: 'Slow Orbital LFO',
        description: 'Slow LFO modulation synced to orbit.',
        type: 'modulator',
        category: 'moon',
        parameters: {
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
        id: 'moon-fast-shiver',
        name: 'Triggered ADSR',
        description: 'ADSR envelope triggered every orbit.',
        type: 'modulator',
        category: 'moon',
        parameters: {
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
    // Attributes (Effects)
    {
        id: 'attr-solar-flare',
        name: 'Solar Flare',
        description: 'Intense phaser effect for swirling solar energy.',
        type: 'effect',
        category: 'attribute',
        parameters: {
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
        id: 'attr-atmospheric-sweep',
        name: 'Atmospheric Sweep',
        description: 'Deep spatial reverb for immense atmospheric scale.',
        type: 'effect',
        category: 'attribute',
        parameters: {
            effects: ['reverb'],
            reverb: {
                reverbMix: 0.5,
                reverbSize: 3.5
            }
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    }
];
