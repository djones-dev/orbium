import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioEngine } from '../hooks/useAudioEngine';
import vertexShader from './shaders/sun.vert?raw';
import fragmentShader from './shaders/sun.frag?raw';

export const Sun: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { engine } = useAudioEngine();

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uBaseColor: { value: new THREE.Color('#3a0900') }, // Deep Red/Black Void
            uSecondaryColor: { value: new THREE.Color('#ff3300') }, // Fiery Red/Orange
            uGlowColor: { value: new THREE.Color('#ffcc00') }, // Golden Yellow/White
            uNoiseScale: { value: 1.0 }, // Slightly lower base scale for larger flames
            uDisplacementStrength: { value: 0.8 },
            uPulseSpeed: { value: 1.0 },
            uGlowIntensity: { value: 1.0 },
            uOpacity: { value: 1.0 },
            uMousePosition: { value: new THREE.Vector3(0, 0, 0) },
            uMouseInfluence: { value: 0.0 },
        }),
        []
    );

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

            const params = engine.getSunParams();
            if (params) {
                // Map raw audio params to Signal Core visuals

                // 1. Cutoff (Hz) -> Noise Scale (Density)
                const logCutoff = Math.log10(params.filterCutoff);
                const scale = 0.5 + ((logCutoff - 1.3) / 2.7) * 2.5;

                // Distortion adds grit/density to noise
                const distortionFactor = (params.distortion || 0) / 100;
                materialRef.current.uniforms.uNoiseScale.value = scale + (distortionFactor * 1.5);

                // 2. Spread (Cents) -> Displacement (Spike Height)
                const baseDisplace = 0.1 + (params.detuneSpread / 50) * 2.4;
                // Distortion boosts displacement significantly (explosive)
                materialRef.current.uniforms.uDisplacementStrength.value = baseDisplace + (distortionFactor * 2.0);

                // 3. LFO Rate (Hz) -> Pulse Speed
                // Distortion makes it pulse faster (chaos)
                materialRef.current.uniforms.uPulseSpeed.value = (0.2 + (params.lfoRate / 20) * 4.8) + (distortionFactor * 3.0);

                // 4. Gain (dB) -> Glow Intensity
                const linearGain = Math.pow(10, params.gainLevel / 20);
                materialRef.current.uniforms.uGlowIntensity.value = linearGain * 2.0;
            }
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <icosahedronGeometry args={[1.4, 150]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent={true}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};
