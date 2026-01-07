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
            uBrightness: { value: 40 },
            uRichness: { value: 60 },
            uPulse: { value: 30 },
            uVolume: { value: 50 },
            uColorCore: { value: new THREE.Color('#fff8e0') },
            uColorEdge: { value: new THREE.Color('#ff4500') },
        }),
        []
    );

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

            const params = engine.getSunParams();
            if (params) {
                // Map raw audio params back to 0-100 range for visualization shaders
                // Cutoff: 20-10000 -> 0-100 (Logarithmic approx would be better but linear for now)
                materialRef.current.uniforms.uBrightness.value = (params.filterCutoff / 10000) * 100;

                // Spread: 0-50 -> 0-100
                materialRef.current.uniforms.uRichness.value = (params.detuneSpread / 50) * 100;

                // LFO: 0.1-20 -> 0-100
                materialRef.current.uniforms.uPulse.value = (params.lfoRate / 20) * 100;

                // Volume: -60-0 -> 0-100
                materialRef.current.uniforms.uVolume.value = ((params.gainLevel + 60) / 60) * 100;
            }
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
            />
        </mesh>
    );
};
