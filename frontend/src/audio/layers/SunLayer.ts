import { AudioLayer, SunParameters } from '../../types/audio';
import { logger } from '@/utils/logger';

/**
 * SunLayer — Professional Audio Implementation
 *
 * Signal Flow:
 * [Osc1/Osc2/Osc3/SubOsc/Noise] → masterMixGain → distortionNode → filter → outputGain → output
 *
 * LFO modulates filter.frequency at 30% depth.
 */
export class SunLayer implements AudioLayer {
    readonly id: string;
    readonly type = 'sun';

    private context: AudioContext;
    private outputGain: GainNode;
    private filter: BiquadFilterNode;
    private distortionNode: WaveShaperNode;
    private masterMixGain: GainNode;
    private osc1: OscillatorNode;
    private osc2: OscillatorNode;
    private osc3: OscillatorNode;
    private subOsc: OscillatorNode;
    private osc1Gain: GainNode;
    private osc2Gain: GainNode;
    private osc3Gain: GainNode;
    private subGain: GainNode;
    private noiseNode: AudioNode;
    private noiseFilter: BiquadFilterNode;
    private noiseGain: GainNode;
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
        noiseVol: -40,
        subVol: -12,
        noiseEnabled: true,
        subEnabled: true,
        filterResonance: 1.0,
    };

    constructor(context: AudioContext, id: string = crypto.randomUUID()) {
        this.context = context;
        this.id = id;

        this.outputGain = context.createGain();

        this.filter = context.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.Q.value = 1.0;
        this.filter.connect(this.outputGain);

        this.distortionNode = context.createWaveShaper();
        this.distortionNode.oversample = '4x';
        this.distortionNode.curve = this.makeTanhCurve(0);
        this.distortionNode.connect(this.filter);

        this.masterMixGain = context.createGain();
        this.masterMixGain.gain.value = 1.0;
        this.masterMixGain.connect(this.distortionNode);

        this.osc1 = context.createOscillator();
        this.osc2 = context.createOscillator();
        this.osc3 = context.createOscillator();
        this.subOsc = context.createOscillator();

        this.osc1Gain = context.createGain();
        this.osc1Gain.gain.value = 0.25;

        this.osc2Gain = context.createGain();
        this.osc2Gain.gain.value = 0.1;

        this.osc3Gain = context.createGain();
        this.osc3Gain.gain.value = 0.1;

        this.subGain = context.createGain();
        this.subGain.gain.value = 0.15;

        this.osc1.connect(this.osc1Gain);
        this.osc2.connect(this.osc2Gain);
        this.osc3.connect(this.osc3Gain);
        this.subOsc.connect(this.subGain);

        this.osc1Gain.connect(this.masterMixGain);
        this.osc2Gain.connect(this.masterMixGain);
        this.osc3Gain.connect(this.masterMixGain);
        this.subGain.connect(this.masterMixGain);

        try {
            const worklet = new AudioWorkletNode(context, 'noise-processor', {
                parameterData: { color: 2.0 },
            });
            worklet.onprocessorerror = (err: Event) => {
                logger.error('NoiseProcessor Error:', err);
            };
            this.noiseNode = worklet;
        } catch (e) {
            logger.warn('SunLayer: Noise processor unavailable, using silent fallback.', e);
            const silence = context.createGain();
            silence.gain.value = 0;
            this.noiseNode = silence;
        }

        this.noiseFilter = context.createBiquadFilter();
        this.noiseFilter.type = 'highpass';
        this.noiseFilter.frequency.value = 300;

        this.noiseGain = context.createGain();
        this.noiseGain.gain.value = 0.03;

        this.noiseNode.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterMixGain);

        this.lfo = context.createOscillator();
        this.lfoGain = context.createGain();
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.filter.frequency);

        this.updateParams(this.params);

        const now = context.currentTime;
        this.osc1.start(now);
        this.osc2.start(now);
        this.osc3.start(now);
        this.subOsc.start(now);
        this.lfo.start(now);
    }

    private makeTanhCurve(inputDrive: number): Float32Array<ArrayBuffer> {
        const drive = 1.0 + inputDrive * 0.2;
        const n = 8192;
        const buf = new ArrayBuffer(n * 4);
        const curve = new Float32Array(buf) as Float32Array<ArrayBuffer>;
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = inputDrive === 0 ? x : Math.tanh(x * drive);
        }
        return curve;
    }

    updateParams(newParams: Partial<SunParameters>): void {
        const prev = this.params;
        this.params = { ...this.params, ...newParams };
        const {
            rootFrequency, filterCutoff, detuneSpread, lfoRate,
            gainLevel, waveform, distortion, noiseVol, subVol,
            noiseEnabled, subEnabled, filterResonance,
        } = this.params;

        const now = this.context.currentTime;
        const ramp = 0.05;

        if (waveform && waveform !== prev.waveform) {
            this.osc1.type = waveform;
            this.osc2.type = waveform;
            this.osc3.type = waveform;
            this.subOsc.type = (waveform === 'sawtooth' || waveform === 'square') ? 'square' : 'sine';
        }

        this.osc1.frequency.setTargetAtTime(rootFrequency, now, ramp);
        this.osc2.frequency.setTargetAtTime(rootFrequency, now, ramp);
        this.osc3.frequency.setTargetAtTime(rootFrequency, now, ramp);
        this.subOsc.frequency.setTargetAtTime(rootFrequency / 2, now, ramp);

        this.osc2.detune.setTargetAtTime(detuneSpread, now, ramp);
        this.osc3.detune.setTargetAtTime(-detuneSpread, now, ramp);

        this.filter.frequency.setTargetAtTime(filterCutoff, now, ramp);
        this.filter.Q.setTargetAtTime(filterResonance ?? 0, now, ramp);

        this.lfo.frequency.setTargetAtTime(lfoRate, now, ramp);
        this.lfoGain.gain.setTargetAtTime(filterCutoff * 0.3, now, ramp);

        if (distortion !== undefined && distortion !== prev.distortion) {
            this.distortionNode.curve = this.makeTanhCurve(distortion);
        }

        const subTarget = subEnabled !== false ? Math.pow(10, (subVol ?? -12) / 20) : 0;
        this.subGain.gain.setTargetAtTime(subTarget, now, ramp);

        const noiseTarget = noiseEnabled !== false ? Math.pow(10, (noiseVol ?? -40) / 20) : 0;
        this.noiseGain.gain.setTargetAtTime(noiseTarget, now, ramp);

        const linearGain = Math.pow(10, gainLevel / 20);
        this.outputGain.gain.setTargetAtTime(linearGain, now, ramp);
    }

    getParams(): SunParameters {
        return { ...this.params };
    }

    connect(destination: AudioNode): void {
        this.outputGain.connect(destination);
    }

    disconnect(): void {
        this.outputGain.disconnect();
    }

    setVolume(value: number): void {
        this.updateParams({ gainLevel: value });
    }

    dispose(): void {
        this.osc1.stop();
        this.osc2.stop();
        this.osc3.stop();
        this.subOsc.stop();
        this.lfo.stop();
        this.noiseNode.disconnect();
        this.disconnect();
    }
}
