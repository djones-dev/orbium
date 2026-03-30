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
        name: 'Slow Orbital Pulse',
        description: 'Slow LFO modulation for evolving textures.',
        type: 'modulator',
        category: 'moon',
        parameters: {
            lfoRate: 0.5,
            detuneSpread: 10,
            modDepth: 30,
            modTarget: 'filterCutoff'
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'moon-fast-shiver',
        name: 'Rapid Shiver',
        description: 'Fast LFO rate for vibrating, energetic effects.',
        type: 'modulator',
        category: 'moon',
        parameters: {
            lfoRate: 8.0,
            detuneSpread: 25,
            modDepth: 15,
            modTarget: 'rootFrequency'
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    // Attributes
    {
        id: 'attr-filter-sweep',
        name: 'Atmospheric Sweep',
        description: 'Pushed filter resonant sweep for cinematic reveals.',
        type: 'effect',
        category: 'attribute',
        parameters: {
            filterCutoff: 400,
            gainLevel: -3
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    },
    {
        id: 'attr-heavy-dist',
        name: 'Solar Flare',
        description: 'High distortion and noise for chaotic, gritty sounds.',
        type: 'effect',
        category: 'attribute',
        parameters: {
            distortion: 80,
            noiseEnabled: true,
            noiseVol: -20
        },
        is_default: true,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    }
];
