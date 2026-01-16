import { AudioLayer, SunParameters } from '../types/audio';

/**
 * SunLayer - Professional Audio Implementation
 * 
 * Signal Flow:
 * [Osc 1 (Root)] ----\
 * [Osc 2 (Detune+)] --\
 * [Osc 3 (Detune-)] ---> [Mixer] -> [Distortion (Drive)] -> [Filter (Lowpass)] -> [VCA (Gain)] -> Output
 * [Sub Osc] ---------/
 * [Noise] ----------/
 */
export class SunLayer implements AudioLayer {
    private context: AudioContext;
    private outputGain: GainNode;
    private filter: BiquadFilterNode;

    // Effects
    private distortionNode: WaveShaperNode; // Tape/Tube Saturation

    // Mixer (Gain Staging)
    // We want the sum of all sources to sit around -12dB to -6dB peak (approx 0.25 - 0.5 amplitude)
    // to leave headroom for resonant filter peaks and polyphony.
    private masterMixGain: GainNode; // Bus for all sources before FX

    // Oscillators
    private osc1: OscillatorNode; // Root (Center)
    private osc2: OscillatorNode; // Detune L
    private osc3: OscillatorNode; // Detune R
    private subOsc: OscillatorNode; // Sub Octave

    // Oscillator Gains (for balancing)
    private osc1Gain: GainNode;
    private osc2Gain: GainNode;
    private osc3Gain: GainNode;
    private subGain: GainNode;

    // Noise
    private noiseNode: AudioNode;
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
        gainLevel: -12,
        waveform: 'sine',
        distortion: 0,
        noiseVol: -40, // Default quiet
        subVol: -12,
        noiseEnabled: true,
        subEnabled: true
    };

    constructor(context: AudioContext) {
        this.context = context;

        // --- 1. Master Output Chain (Reverse Order) ---
        // Output Gain (VCA)
        this.outputGain = context.createGain();

        // Filter
        this.filter = context.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.Q.value = 1.0; // Mild resonance for color
        this.filter.connect(this.outputGain);

        // Distortion (Drive)
        this.distortionNode = context.createWaveShaper();
        this.distortionNode.oversample = '4x';
        this.distortionNode.curve = this.makeTanhCurve(0); // Init linear
        this.distortionNode.connect(this.filter);

        // Master Mixer Bus
        this.masterMixGain = context.createGain();
        this.masterMixGain.gain.value = 1.0; // Pass-through, levels handled by individual channel gains
        this.masterMixGain.connect(this.distortionNode);

        // --- 2. Sources ---

        // A. Oscillators
        this.osc1 = context.createOscillator();
        this.osc2 = context.createOscillator();
        this.osc3 = context.createOscillator();
        this.subOsc = context.createOscillator();

        // Channel Gains (Mixing Desk)
        // Aiming for total sum ~0.5 (headroom)
        // Osc 1 (Center): 0.25
        // Osc 2/3 (Stereo Width): 0.1 each -> 0.2 total
        // Sub: 0.15
        // Total ~0.6 peak, safe for soft clipping
        this.osc1Gain = context.createGain();
        this.osc1Gain.gain.value = 0.25;

        this.osc2Gain = context.createGain();
        this.osc2Gain.gain.value = 0.1;

        this.osc3Gain = context.createGain();
        this.osc3Gain.gain.value = 0.1;

        this.subGain = context.createGain();
        this.subGain.gain.value = 0.15; // Initial value, will be overridden by updateParams

        this.osc1.connect(this.osc1Gain);
        this.osc2.connect(this.osc2Gain);
        this.osc3.connect(this.osc3Gain);
        this.subOsc.connect(this.subGain);

        // Route all to Master Mix
        this.osc1Gain.connect(this.masterMixGain);
        this.osc2Gain.connect(this.masterMixGain);
        this.osc3Gain.connect(this.masterMixGain);
        this.subGain.connect(this.masterMixGain);

        // B. Noise Generator (AudioWorklet)
        try {
            // Default to Brown noise (color = 2)
            // Default to Brown noise (color = 2)
            const worklet = new AudioWorkletNode(context, 'noise-processor', {
                parameterData: { color: 2.0 }
            });

            // Handle Worklet errors
            worklet.onprocessorerror = (err: Event) => {
                console.error('NoiseProcessor Error:', err);
            };
            this.noiseNode = worklet;
        } catch (e) {
            console.warn('SunLayer: Noise processor unavailable, noise disabled.', e);
            // Fallback: Silent node
            this.noiseNode = context.createGain();
            (this.noiseNode as GainNode).gain.value = 0;
        }

        this.noiseFilter = context.createBiquadFilter();
        this.noiseFilter.type = 'highpass'; // Remove mud
        this.noiseFilter.frequency.value = 300;

        this.noiseGain = context.createGain();
        this.noiseGain.gain.value = 0.03; // Initial value, will be overridden by updateParams

        this.noiseNode.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterMixGain); // Noise also gets distorted for glue

        // --- 3. Modulation (LFO) ---
        this.lfo = context.createOscillator();
        this.lfoGain = context.createGain();

        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.filter.frequency); // Wah effect

        // --- 4. Initialization --- 
        this.updateParams(this.params);

        const now = context.currentTime;
        this.osc1.start(now);
        this.osc2.start(now);
        this.osc3.start(now);
        this.subOsc.start(now);
        // Noise runs automatically if worklet
        this.lfo.start(now);
    }

    /**
     * Tanh Distortion Curve (Musical Soft Clipping)
     * tanh(x) gracefully saturates towards -1 and 1
     * @param inputDrive 0 to 100 amount
     */
    private makeTanhCurve(inputDrive: number) {
        // Map 0-100 to suitable drive multiplier.
        // 0 -> 1.0 (Linear/Unity)
        // 100 -> 10.0 (Hard Drive)
        const drive = 1.0 + (inputDrive * 0.2); // 0=1x, 50=11x, 100=21x

        const n_samples = 8192;
        const curve = new Float32Array(n_samples);

        for (let i = 0; i < n_samples; ++i) {
            // x ranges from -1 to 1
            const x = (i * 2) / n_samples - 1;

            if (inputDrive === 0) {
                // Pure bypass at 0 to strictly preserve clean wave
                curve[i] = x;
            } else {
                // Tanh soft clip
                // High drive makes it resemble a square wave
                curve[i] = Math.tanh(x * drive);
            }
        }
        return curve;
    }

    updateParams(newParams: Partial<SunParameters>) {
        const prevParams = this.params;
        this.params = { ...this.params, ...newParams };
        const { rootFrequency, filterCutoff, detuneSpread, lfoRate, gainLevel, waveform, distortion, noiseVol, subVol, noiseEnabled, subEnabled } = this.params;

        const now = this.context.currentTime;
        const rampTime = 0.05; // Fast response

        // 1. Waveforms
        if (waveform && waveform !== prevParams.waveform) {
            this.osc1.type = waveform;
            this.osc2.type = waveform;
            this.osc3.type = waveform;
            // Sub is always sine or square for clean low end
            this.subOsc.type = (waveform === 'sawtooth' || waveform === 'square') ? 'square' : 'sine';
        }

        // 2. Frequencies
        this.osc1.frequency.setTargetAtTime(rootFrequency, now, rampTime);
        this.osc2.frequency.setTargetAtTime(rootFrequency, now, rampTime);
        this.osc3.frequency.setTargetAtTime(rootFrequency, now, rampTime);
        this.subOsc.frequency.setTargetAtTime(rootFrequency / 2, now, rampTime);

        // 3. Detune (Spread)
        this.osc2.detune.setTargetAtTime(detuneSpread, now, rampTime);
        this.osc3.detune.setTargetAtTime(-detuneSpread, now, rampTime);

        // 4. Filter
        this.filter.frequency.setTargetAtTime(filterCutoff, now, rampTime);

        // 5. LFO
        this.lfo.frequency.setTargetAtTime(lfoRate, now, rampTime);
        this.lfoGain.gain.setTargetAtTime(filterCutoff * 0.3, now, rampTime); // 30% mod depth

        // 6. Distortion (Recalculate curve if changed)
        if (distortion !== undefined && distortion !== prevParams.distortion) {
            this.distortionNode.curve = this.makeTanhCurve(distortion);
        }

        // 7. Channel Gains (Mixer)
        // Sub Vol dB -> Linear
        // If disabled, silence (0)
        let subTarget = 0;
        if (subEnabled !== false) {
            subTarget = Math.pow(10, (subVol || -12) / 20);
        }
        this.subGain.gain.setTargetAtTime(subTarget, now, rampTime);

        // Noise Vol dB -> Linear
        // If disabled, silence (0)
        let noiseTarget = 0;
        if (noiseEnabled !== false) {
            noiseTarget = Math.pow(10, (noiseVol || -40) / 20);
        }
        this.noiseGain.gain.setTargetAtTime(noiseTarget, now, rampTime);

        // 8. Master Gain (dB -> Linear)
        // dB = 20 * log10(gain) 
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
        this.noiseNode.disconnect();
        this.lfo.stop();
        this.disconnect();
    }
}
