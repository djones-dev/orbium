import { AudioLayer, SunParameters } from '../types/audio';

export class SunLayer implements AudioLayer {
    private context: AudioContext;
    private outputGain: GainNode;
    private filter: BiquadFilterNode;

    // Oscillators
    private osc1: OscillatorNode; // Root
    private osc2: OscillatorNode; // Root + 3 cents
    private osc3: OscillatorNode; // Root - 3 cents
    private subOsc: OscillatorNode; // Root / 2

    // Noise
    private noiseNode: AudioBufferSourceNode;
    private noiseFilter: BiquadFilterNode;
    private noiseGain: GainNode;

    // LFO
    private lfo: OscillatorNode;
    private lfoGain: GainNode;

    private params: SunParameters = {
        rootFrequency: 110,
        filterCutoff: 1000,
        detuneSpread: 10,
        lfoRate: 0.5,
        gainLevel: -12
    };

    constructor(context: AudioContext) {
        this.context = context;

        // Create Audio Nodes
        this.outputGain = context.createGain();
        this.filter = context.createBiquadFilter();
        this.filter.type = 'lowpass';

        // Initialize Oscillators
        this.osc1 = context.createOscillator();
        this.osc2 = context.createOscillator();
        this.osc3 = context.createOscillator();
        this.subOsc = context.createOscillator();

        this.osc1.type = 'sine';
        this.osc2.type = 'sine';
        this.osc3.type = 'sine';
        this.subOsc.type = 'sine';

        // Initialize LFO
        this.lfo = context.createOscillator();
        this.lfo.type = 'sine';
        this.lfoGain = context.createGain(); // Modulation depth

        // Initialize Noise
        // Create 5 seconds of pink noise buffer
        const bufferSize = context.sampleRate * 5;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        // Simple pink noise approximation or white noise for now
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Compensate for gain loss
        }

        this.noiseNode = context.createBufferSource();
        this.noiseNode.buffer = buffer;
        this.noiseNode.loop = true;

        this.noiseFilter = context.createBiquadFilter();
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.value = 400;

        this.noiseGain = context.createGain();
        this.noiseGain.gain.value = 0.05; // -26dB approx (very quiet base)

        // Connections
        // Oscillators -> Filter
        this.osc1.connect(this.filter);
        this.osc2.connect(this.filter);
        this.osc3.connect(this.filter);

        // Sub Osc -> Filter (lower gain)
        const subGain = context.createGain();
        subGain.gain.value = 0.25; // -12dB
        this.subOsc.connect(subGain);
        subGain.connect(this.filter);

        // Noise -> Noise Filter -> Noise Gain -> Filter
        this.noiseNode.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.filter);

        // Filter -> Output
        this.filter.connect(this.outputGain);

        // LFO -> Filter Freq & Detune
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.filter.frequency);
        // Also modulate detune of osc2/3 slightly for movement? 
        // For now just filter cutoff modulation as per spec

        // Apply initial params
        this.updateParams(this.params);

        // Start everyone
        const now = context.currentTime;
        this.osc1.start(now);
        this.osc2.start(now);
        this.osc3.start(now);
        this.subOsc.start(now);
        this.noiseNode.start(now);
        this.lfo.start(now);
    }

    updateParams(newParams: Partial<SunParameters>) {
        this.params = { ...this.params, ...newParams };
        const { rootFrequency, filterCutoff, detuneSpread, lfoRate, gainLevel } = this.params;

        const now = this.context.currentTime;
        const rampTime = 0.1;

        // 1. Root Frequency
        this.osc1.frequency.setTargetAtTime(rootFrequency, now, rampTime);
        this.osc2.frequency.setTargetAtTime(rootFrequency, now, rampTime);
        this.osc3.frequency.setTargetAtTime(rootFrequency, now, rampTime);
        this.subOsc.frequency.setTargetAtTime(rootFrequency / 2, now, rampTime);

        // 2. Richness -> Detune Spread (direct Cents)
        this.osc2.detune.setTargetAtTime(detuneSpread, now, rampTime);
        this.osc3.detune.setTargetAtTime(-detuneSpread, now, rampTime);

        // 3. Brightness -> Filter Cutoff (Hz)
        this.filter.frequency.setTargetAtTime(filterCutoff, now, rampTime);

        // 4. Pulse Rate -> LFO Frequency (Hz)
        this.lfo.frequency.setTargetAtTime(lfoRate, now, rampTime);

        // LFO Depth scales with cutoff
        this.lfoGain.gain.setTargetAtTime(filterCutoff * 0.2, now, rampTime);

        // 5. Volume -> Gain (dB to linear)
        // db = 20 * log10(gain) => gain = 10 ^ (db/20)
        const linearGain = Math.pow(10, gainLevel / 20);
        this.outputGain.gain.setTargetAtTime(linearGain, now, rampTime);
    }

    connect(destination: AudioNode) {
        this.outputGain.connect(destination);
    }

    disconnect() {
        this.outputGain.disconnect();
    }

    setVolume(value: number) {
        // Assume input is dB now, or need conversion? 
        // For interface compatibility, let's assume this might be called with old logic, but better to update calls.
        // Actually, this method is from AudioLayer interface.
        this.updateParams({ gainLevel: value });
    }

    getParams() {
        return this.params;
    }

    dispose() {
        this.osc1.stop();
        this.osc2.stop();
        this.osc3.stop();
        this.subOsc.stop();
        this.noiseNode.stop();
        this.lfo.stop();
        this.disconnect();
    }
}
