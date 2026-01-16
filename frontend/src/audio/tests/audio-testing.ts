export interface AudioAnalysis {
    peak: number;
    rms: number;
    isSilent: boolean;
    hasClipping: boolean;
    duration: number;
}

export async function renderOffline(
    renderCallback: (context: OfflineAudioContext) => void | Promise<void>,
    durationSeconds: number = 1.0,
    sampleRate: number = 44100
): Promise<AudioBuffer> {
    const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);
    // Mock Worklet loading for offline context if needed, or specific setup
    // OfflineContext doesn't fetch network resources easily.
    // For this harness, we rely on the logic being testable without the Worklet 
    // OR we accept that Worklet calls might be silent in offline verification unless we fake the processor.

    await renderCallback(offlineCtx);
    return await offlineCtx.startRendering();
}

export function analyzeBuffer(buffer: AudioBuffer): AudioAnalysis {
    const dataL = buffer.getChannelData(0);
    const dataR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : dataL;

    let peak = 0;
    let sumSquares = 0;
    let clippedSamples = 0;
    const length = buffer.length;

    for (let i = 0; i < length; i++) {
        const absL = Math.abs(dataL[i]);
        const absR = Math.abs(dataR[i]);
        const currentPeak = Math.max(absL, absR);
        if (currentPeak > peak) peak = currentPeak;
        sumSquares += (dataL[i] * dataL[i] + dataR[i] * dataR[i]) / (buffer.numberOfChannels);
        if (currentPeak >= 1.0) clippedSamples++;
    }

    const rms = Math.sqrt(sumSquares / length);
    return {
        peak, rms,
        isSilent: peak < 0.0001,
        hasClipping: clippedSamples > 0,
        duration: buffer.duration
    };
}

// Simple Test Runner
export async function runTest(name: string, fn: () => Promise<void>) {
    console.log(`%cRunning: ${name}`, 'color: yellow');
    try {
        await fn();
        console.log(`%cPASS: ${name}`, 'color: green; font-weight: bold');
        return true;
    } catch (e) {
        console.error(`%cFAIL: ${name}`, 'color: red; font-weight: bold', e);
        return false;
    }
}

export function expect(value: any) {
    return {
        toBe: (expected: any) => {
            if (value !== expected) throw new Error(`Expected ${value} to be ${expected}`);
        },
        toBeLessThan: (limit: number) => {
            if (value >= limit) throw new Error(`Expected ${value} to be less than ${limit}`);
        },
        toBeGreaterThan: (limit: number) => {
            if (value <= limit) throw new Error(`Expected ${value} to be greater than ${limit}`);
        },
    };
}
