import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioEngine } from '../hooks/useAudioEngine';
import vertexShader from './shaders/sun.vert?raw';
import fragmentShader from './shaders/sun.frag?raw';
import { OrbitalBody } from '../types/orbital';
import { SunParameters } from '../types/audio';
import { useSelection } from '../contexts/SelectionContext';
import { PhysicsSystem } from '../simulation/PhysicsSystem';

export const Sun: React.FC<{ body?: OrbitalBody; id?: string }> = ({ body, id = 'sun-primary' }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { engine } = useAudioEngine();
    const { selectedBodyId, select } = useSelection();

    const bodyId = body?.id ?? id;
    const isSelected = selectedBodyId === bodyId;
    const isOrbiting = body != null && body.type !== 'sun';

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uBaseColor: { value: new THREE.Color('#3a0900') },
            uSecondaryColor: { value: new THREE.Color('#ff3300') },
            uGlowColor: { value: new THREE.Color('#ffcc00') },
            uNoiseScale: { value: 1.0 },
            uDisplacementStrength: { value: 0.8 },
            uPulseSpeed: { value: 1.0 },
            uGlowIntensity: { value: 1.0 },
            uOpacity: { value: 1.0 },
            uMousePosition: { value: new THREE.Vector3(0, 0, 0) },
            uMouseInfluence: { value: 0.0 },
            uSelected: { value: 0.0 },
        }),
        [],
    );

    useFrame((state) => {
        if (!meshRef.current) return;

        // --- Shader time & selection uniforms ---
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            materialRef.current.uniforms.uSelected.value = THREE.MathUtils.lerp(
                materialRef.current.uniforms.uSelected.value,
                isSelected ? 1.0 : 0.0,
                0.1,
            );
        }

        // --- Orbital position (read from PhysicsSystem, no mutation here) ---
        if (isOrbiting) {
            const position = PhysicsSystem.getInstance().getPosition(bodyId);
            if (position) {
                const x = position.radius * Math.cos(position.angle);
                const z = position.radius * Math.sin(position.angle);
                meshRef.current.position.set(x, 0, z);
            }
        }

        // --- Audio-reactive shader uniforms ---
        const rawParams = body?.audioParams ?? engine.getSunParams();
        const params: SunParameters = {
            rootFrequency: 60,
            filterCutoff: 5000,
            filterResonance: 1.0,
            detuneSpread: 10,
            lfoRate: 0.5,
            distortion: 0,
            gainLevel: -6,
            waveform: 'sine',
            noiseEnabled: false,
            noiseVol: -20,
            subEnabled: true,
            subVol: -10,
            ...rawParams,
        };

        if (materialRef.current) {
            const cutoff = Math.max(20, params.filterCutoff);
            const logCutoff = Math.log10(cutoff);
            const scale = 0.5 + ((logCutoff - 1.3) / 2.7) * 2.5;

            const distortionFactor = (params.distortion ?? 0) / 100;
            materialRef.current.uniforms.uNoiseScale.value = scale + distortionFactor * 1.5;

            const baseDisplace = 0.1 + (params.detuneSpread / 50) * 2.4;
            materialRef.current.uniforms.uDisplacementStrength.value =
                baseDisplace + distortionFactor * 2.0;

            materialRef.current.uniforms.uPulseSpeed.value =
                0.2 + (params.lfoRate / 20) * 4.8 + distortionFactor * 3.0;

            const linearGain = Math.pow(10, params.gainLevel / 20);
            materialRef.current.uniforms.uGlowIntensity.value = linearGain * 2.0;
        }
    });

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(bodyId);
    };

    const initialPos = useMemo((): [number, number, number] => {
        if (body && body.type !== 'sun') {
            const x = body.position.radius * Math.cos(body.position.angle);
            const z = body.position.radius * Math.sin(body.position.angle);
            return [x, 0, z];
        }
        return [0, 0, 0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                transparent
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};
