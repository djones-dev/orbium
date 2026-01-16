import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioEngine } from '../hooks/useAudioEngine';
import vertexShader from './shaders/sun.vert?raw';
import fragmentShader from './shaders/sun.frag?raw';
import { OrbitalBody } from '../types/orbital';
import { SunParameters } from '../types/audio';
import { useSelection } from '../contexts/SelectionContext';

export const Sun: React.FC<{ body?: OrbitalBody, id?: string }> = ({ body, id = 'sun-primary' }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { engine } = useAudioEngine();
    const { selectedBodyId, select } = useSelection();

    const bodyId = body?.id || id;
    const isSelected = selectedBodyId === bodyId;

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
            uSelected: { value: 0.0 },
        }),
        []
    );

    useFrame((state) => {
        if (meshRef.current) {
            if (materialRef.current) {
                materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
                materialRef.current.uniforms.uSelected.value = THREE.MathUtils.lerp(
                    materialRef.current.uniforms.uSelected.value,
                    isSelected ? 1.0 : 0.0,
                    0.1
                );
            }

            // Orbital Movement for non-sun bodies
            // Only update if playing
            if (body && body.type !== 'sun' && engine?.context?.state === 'running') {
                // Update angle based on velocity (rad/s)
                // Note limits: mutating state directly for visual smoothness
                // In a full physics engine this would be separate
                const dt = state.clock.getDelta();
                body.position.angle += (body.velocity || 0.1) * dt;

                const x = body.position.radius * Math.cos(body.position.angle);
                const z = body.position.radius * Math.sin(body.position.angle);
                meshRef.current.position.set(x, 0, z);
            }

            // Use passed body params or fallback to engine if body not available yet
            const rawParams = body?.audioParams || engine.getSunParams();

            // Apply defaults to ensure we don't pass undefined to math functions
            const params: SunParameters = {
                rootFrequency: 60,
                filterCutoff: 5000,
                detuneSpread: 10,
                lfoRate: 0.5,
                distortion: 0,
                gainLevel: -6,
                waveform: 'sine',
                noiseEnabled: false,
                noiseVol: -20,
                subEnabled: true,
                subVol: -10,
                // Override with rawParams, but we need to ensure rawParams doesn't introduce undefineds for required fields?
                // The spread ...rawParams will overwrite with undefined if the field exists but is undefined.
                // Actually, Partial<SunParameters> can have undefineds.
                // We should careful-merge or simple spread is usually fine if the source properties are missing, but if they are explicitly undefined, it might be an issue.
                // However, Preset params usually just lack keys.
                ...rawParams
            } as SunParameters; // assertions sometimes needed if rawParams has optional fields that we want to treat as required after default.

            if (params && materialRef.current) {
                // Map raw audio params to Signal Core visuals

                // 1. Cutoff (Hz) -> Noise Scale (Density)
                // Safe guard against 0 or negative cutoff for log
                const cutoff = Math.max(20, params.filterCutoff);
                const logCutoff = Math.log10(cutoff);
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

    const handleClick = (e: any) => {
        e.stopPropagation();
        select(bodyId);
    };

    // Initial position
    const initialPos = useMemo(() => {
        if (body && body.type !== 'sun') {
            const x = body.position.radius * Math.cos(body.position.angle);
            const z = body.position.radius * Math.sin(body.position.angle);
            return [x, 0, z] as [number, number, number];
        }
        return [0, 0, 0] as [number, number, number];
    }, []);

    return (
        <mesh
            ref={meshRef}
            position={initialPos}
            onClick={handleClick}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
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
