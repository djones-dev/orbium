class NoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // State for noise generation
        this.pinkState = [0, 0, 0, 0, 0, 0, 0];
        this.brownState = 0;
    }

    static get parameterDescriptors() {
        return [
            {
                name: 'color', // 0 = White, 1 = Pink, 2 = Brown
                defaultValue: 1,
                minValue: 0,
                maxValue: 2,
                automationRate: 'k-rate'
            }
        ];
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const color = parameters.color[0]; // k-rate, take first value

        // Iterate through all channels (usually stereo)
        for (let channel = 0; channel < output.length; ++channel) {
            const outputChannel = output[channel];

            for (let i = 0; i < outputChannel.length; ++i) {
                const white = Math.random() * 2 - 1;

                let sample = 0;

                if (color < 0.5) {
                    // White Noise
                    sample = white;
                } else if (color < 1.5) {
                    // Pink Noise (Paul Kellett's refined method)
                    // Approximation using multiple poles
                    const b0 = 0.99886 * this.pinkState[0] + white * 0.0555179;
                    const b1 = 0.99332 * this.pinkState[1] + white * 0.0750759;
                    const b2 = 0.96900 * this.pinkState[2] + white * 0.1538520;
                    const b3 = 0.86650 * this.pinkState[3] + white * 0.3104856;
                    const b4 = 0.55000 * this.pinkState[4] + white * 0.5329522;
                    const b5 = -0.7616 * this.pinkState[5] - white * 0.0168980;

                    sample = b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362;
                    this.pinkState = [b0, b1, b2, b3, b4, b5, this.pinkState[6]]; // Update state

                    sample *= 0.11; // Compensate for gain
                } else {
                    // Brown Noise (Integrate White)
                    const brown = (this.brownState + (0.02 * white)) / 1.02;
                    this.brownState = brown;
                    sample = brown * 3.5;
                }

                outputChannel[i] = sample;
            }
        }

        return true; // Keep processor alive
    }
}

registerProcessor('noise-processor', NoiseProcessor);
