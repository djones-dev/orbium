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
            waveform: 'sine',
            filterCutoff: 20000,
            distortion: 0,
            gainLevel: -6
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
            waveform: 'sawtooth',
            filterCutoff: 5000,
            distortion: 10,
            gainLevel: -12
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
            waveform: 'triangle',
            filterCutoff: 8000,
            distortion: 0,
            gainLevel: -9
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
            lfoRate: 0.5,
            modType: 'lfo',
            modDepth: 30,
            modTarget: 'filterCutoff'
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
            attack: 0.05,
            decay: 0.2,
            sustain: 0.1,
            release: 0.8
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    // Attributes
    {
        id: 'attr-phaser-sweep',
        name: 'Cosmic Phaser',
        description: 'Classic phaser effect for swirling textures.',
        type: 'effect',
        category: 'attribute',
        parameters: {
            effects: ['phaser']
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'attr-heavy-reverb',
        name: 'Galactic Reverb',
        description: 'Deep spatial reverb for immense scale.',
        type: 'effect',
        category: 'attribute',
        parameters: {
            effects: ['reverb']
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    }
];
