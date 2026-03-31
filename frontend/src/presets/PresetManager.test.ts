import { PresetManager } from './PresetManager';
import { Preset } from '../types/preset';

/**
 * Manual verification script for PresetManager.
 * This can be imported and run in a dev environment.
 */
export async function verifyPresetManager() {
    console.log('--- Starting PresetManager Verification ---');

    // Mock localStorage for non-browser environments if necessary
    if (typeof window === 'undefined') {
        (global as any).localStorage = {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
            clear: () => { }
        };
    }

    const manager = new PresetManager();

    // 1. Load defaults
    const presets = await manager.loadPresets();
    console.log(`Loaded ${presets.length} presets (Expected: 7)`);
    if (presets.length !== 7) console.error('Verification Failed: Expected 7 default presets');

    // 2. Filter by category
    const planets = manager.filterByCategory('planet');
    console.log(`Found ${planets.length} planets (Expected: 3)`);
    if (planets.length !== 3) console.error('Verification Failed: Expected 3 planet presets');

    // 3. Sort by name
    const sorted = manager.sortBy('name', 'asc');
    console.log('Sorted by name (ASC):', sorted.map(p => p.name));
    if (sorted[0].name > sorted[sorted.length - 1].name) console.error('Verification Failed: Sorting issue');

    // 4. Persistence Test (Mocked or real)
    const newPreset: Preset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'Testing persistence',
        type: 'generator',
        category: 'sun',
        parameters: { oscillator: { type: 'basic', params: { rootFrequency: 440 } } },
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await manager.savePreset(newPreset);
    const retrieved = manager.getPresetById('test-preset');
    if (retrieved && retrieved.name === 'Test Preset') {
        console.log('Save/Retrieval: SUCCESS');
    } else {
        console.error('Save/Retrieval: FAILED');
    }

    await manager.deletePreset('test-preset');
    if (!manager.getPresetById('test-preset')) {
        console.log('Delete: SUCCESS');
    } else {
        console.error('Delete: FAILED');
    }

    console.log('--- PresetManager Verification Complete ---');
}
