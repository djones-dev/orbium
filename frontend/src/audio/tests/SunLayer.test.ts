import { runTest, expect, renderOffline, analyzeBuffer } from './audio-testing';
import { SunLayer } from '../SunLayer';

export async function runSunLayerTests() {
    console.log('--- Starting DSP Verification ---');

    await runTest('Silence Check (Master Gain -100dB)', async () => {
        const buffer = await renderOffline((context) => {
            const layer = new SunLayer(context as unknown as AudioContext);
            layer.setVolume(-100);
            layer.connect(context.destination);
        }, 0.5);

        const stats = analyzeBuffer(buffer);
        expect(stats.peak).toBeLessThan(0.001);
        expect(stats.isSilent).toBe(true);
    });

    await runTest('Signal Check (Default Gain)', async () => {
        const buffer = await renderOffline((context) => {
            const layer = new SunLayer(context as unknown as AudioContext);
            layer.setVolume(0);
            layer.connect(context.destination);
        }, 0.2);

        const stats = analyzeBuffer(buffer);
        expect(stats.isSilent).toBe(false);
        expect(stats.rms).toBeGreaterThan(0.01);
        expect(stats.peak).toBeLessThan(1.0);
    });

    await runTest('Filter Response (Low Cutoff vs High)', async () => {
        const dur = 0.1;

        // Low Cutoff
        const bufferSawLow = await renderOffline((context) => {
            const layer = new SunLayer(context as unknown as AudioContext);
            layer.updateParams({ filterCutoff: 100, waveform: 'sawtooth' });
            layer.connect(context.destination);
        }, dur);

        // High Cutoff
        const bufferSawHigh = await renderOffline((context) => {
            const layer = new SunLayer(context as unknown as AudioContext);
            layer.updateParams({ filterCutoff: 5000, waveform: 'sawtooth' });
            layer.connect(context.destination);
        }, dur);

        const statsLow = analyzeBuffer(bufferSawLow);
        const statsHigh = analyzeBuffer(bufferSawHigh);

        // Expect high cutoff to have significantly more energy
        // We compare the RMS
        if (statsHigh.rms <= statsLow.rms) {
            throw new Error(`High cutoff RMS (${statsHigh.rms}) should be > Low cutoff RMS (${statsLow.rms})`);
        }
    });

    console.log('--- DSP Verification Complete ---');
}
