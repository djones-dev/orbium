import React, { useRef, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import sunVertexShader from './shaders/sun.vert?raw';
import sunFragmentShader from './shaders/sun.frag?raw';
import planetVertexShader from './shaders/planet.vert?raw';
import planetFragmentShader from './shaders/planet.frag?raw';
import moonVertexShader from './shaders/moon.vert?raw';
import moonFragmentShader from './shaders/moon.frag?raw';
import { SunParameters } from '../types/audio';
import { useSelection } from '../contexts/SelectionContext';
import { PhysicsSystem } from '../simulation/PhysicsSystem';
import { World } from '../ecs/World';
import { ComponentType } from '../ecs/components/Component';
import { AudioComponent } from '../ecs/components/AudioComponent';
import { VisualComponent } from '../ecs/components/VisualComponent';
import { PresetComponent } from '../ecs/components/PresetComponent';

type BodyVariant = 'sun' | 'planet' | 'moon';

/** Parse a CSS hex color string to a THREE.Color */
function hexToThreeColor(hex: string): THREE.Color {
    try {
        return new THREE.Color(hex);
    } catch {
        return new THREE.Color('#ffffff');
    }
}

export const Sun = React.memo(({ id }: { id: string }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { selectedBodyId, select } = useSelection();

    const isSelected = selectedBodyId === id;
    const isOrbiting = id !== 'sun-primary';

    // Read body type and color from ECS at render time — stable since type never changes
    const world = World.getInstance();
    const presetComp = world.entities.getComponent<PresetComponent>(id, ComponentType.Preset);
    const visualComp = world.entities.getComponent<VisualComponent>(id, ComponentType.Visual);

    const bodyVariant: BodyVariant = presetComp?.bodyType === 'planet' ? 'planet'
        : presetComp?.bodyType === 'moon' ? 'moon'
        : id === 'sun-primary' ? 'sun'
        : 'planet';

    const presetType = presetComp?.presetType;
    const isModulatorMoon = bodyVariant === 'moon' && presetType === 'modulator';
    const bodyColor = visualComp?.color ?? (bodyVariant === 'sun' ? '#ffcc00' : bodyVariant === 'planet' ? '#4169E1' : '#32CD32');

    const { vertShader, fragShader } = useMemo(() => {
        if (bodyVariant === 'planet') return { vertShader: planetVertexShader, fragShader: planetFragmentShader };
        if (bodyVariant === 'moon')   return { vertShader: moonVertexShader,   fragShader: moonFragmentShader };
        return { vertShader: sunVertexShader, fragShader: sunFragmentShader };
    }, [bodyVariant]);

    const uniforms = useMemo((): Record<string, THREE.IUniform> => {
        const color = hexToThreeColor(bodyColor);
        if (bodyVariant === 'sun') {
            return {
                uTime:                { value: 0 },
                uBaseColor:           { value: new THREE.Color('#3a0900') },
                uSecondaryColor:      { value: new THREE.Color('#ff3300') },
                uGlowColor:           { value: new THREE.Color('#ffcc00') },
                uNoiseScale:          { value: 1.0 },
                uDisplacementStrength:{ value: 0.8 },
                uPulseSpeed:          { value: 1.0 },
                uGlowIntensity:       { value: 1.0 },
                uOpacity:             { value: 1.0 },
                uMousePosition:       { value: new THREE.Vector3(0, 0, 0) },
                uMouseInfluence:      { value: 0.0 },
                uSelected:            { value: 0.0 },
            };
        }
        if (bodyVariant === 'planet') {
            return {
                uTime:                { value: 0 },
                uBodyColor:           { value: color },
                uNoiseScale:          { value: 1.2 },
                uDisplacementStrength:{ value: 0.18 },
                uPulseSpeed:          { value: 1.0 },
                uGlowIntensity:       { value: 1.0 },
                uOpacity:             { value: 1.0 },
                uSelected:            { value: 0.0 },
            };
        }
        // moon
        return {
            uTime:                { value: 0 },
            uBodyColor:           { value: color },
            uNoiseScale:          { value: 1.5 },
            uDisplacementStrength:{ value: 0.06 },
            uPulseSpeed:          { value: 1.0 },
            uGlowIntensity:       { value: 1.0 },
            uOpacity:             { value: 1.0 },
            uSelected:            { value: 0.0 },
        };
    }, [bodyVariant, bodyColor]);

    // Geometry config per variant
    const { geoRadius, geoDetail } = useMemo(() => {
        if (bodyVariant === 'sun')    return { geoRadius: 1.4, geoDetail: 150 };
        if (bodyVariant === 'planet') return { geoRadius: 0.9, geoDetail: 50 };
        return { geoRadius: 0.4, geoDetail: 3 };
    }, [bodyVariant]);

    const ringColor = isModulatorMoon ? '#9b59b6' : '#e67e22';

    useFrame((state) => {
        if (!groupRef.current) return;
        const world = World.getInstance();

        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            materialRef.current.uniforms.uSelected.value = THREE.MathUtils.lerp(
                materialRef.current.uniforms.uSelected.value,
                isSelected ? 1.0 : 0.0,
                0.1,
            );
        }

        // Move the group to the orbital position
        if (isOrbiting) {
            const position = PhysicsSystem.getInstance().getPosition(id);
            if (position) {
                const x = position.radius * Math.cos(position.angle);
                const z = position.radius * Math.sin(position.angle);
                groupRef.current.position.set(x, 0, z);
            }
        }

        // Audio-reactive shader uniforms
        const audio = world.entities.getComponent<AudioComponent>(id, ComponentType.Audio);
        if (!audio || !materialRef.current) return;

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
            ...audio.parameters,
        };

        const distortionFactor = (params.distortion ?? 0) / 100;
        const linearGain = Math.pow(10, params.gainLevel / 20);

        if (bodyVariant === 'sun') {
            const cutoff = Math.max(20, params.filterCutoff);
            const logCutoff = Math.log10(cutoff);
            const scale = 0.5 + ((logCutoff - 1.3) / 2.7) * 2.5;

            materialRef.current.uniforms.uNoiseScale.value = scale + distortionFactor * 1.5;
            materialRef.current.uniforms.uDisplacementStrength.value =
                0.1 + (params.detuneSpread / 50) * 2.4 + distortionFactor * 2.0;
            materialRef.current.uniforms.uPulseSpeed.value =
                0.2 + (params.lfoRate / 20) * 4.8 + distortionFactor * 3.0;
            materialRef.current.uniforms.uGlowIntensity.value = linearGain * 2.0;
        } else if (bodyVariant === 'planet') {
            // Subtle reactivity for planets
            const cutoff = Math.max(20, params.filterCutoff);
            const logCutoff = Math.log10(cutoff);
            materialRef.current.uniforms.uNoiseScale.value =
                0.8 + ((logCutoff - 1.3) / 2.7) * 0.8 + distortionFactor * 0.4;
            materialRef.current.uniforms.uDisplacementStrength.value =
                0.12 + (params.detuneSpread / 50) * 0.3 + distortionFactor * 0.2;
            materialRef.current.uniforms.uPulseSpeed.value =
                0.5 + (params.lfoRate / 20) * 2.0;
            materialRef.current.uniforms.uGlowIntensity.value = linearGain * 1.5;
        } else {
            // Moon: minimal audio reactivity — pulse speed driven by lfoRate
            materialRef.current.uniforms.uPulseSpeed.value =
                0.3 + (params.lfoRate / 20) * 4.0;
            materialRef.current.uniforms.uGlowIntensity.value = linearGain * 1.2;

            // Animate modulator ring opacity
            if (isModulatorMoon && ringRef.current) {
                const mat = ringRef.current.material as THREE.MeshBasicMaterial;
                mat.opacity = 0.35 + Math.sin(state.clock.elapsedTime * (params.lfoRate ?? 0.5) * 2) * 0.2;
            }
        }
    });

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(id);
    };

    return (
        <group ref={groupRef}>
            <mesh
                ref={meshRef}
                onClick={handleClick}
                onPointerOver={() => (document.body.style.cursor = 'pointer')}
                onPointerOut={() => (document.body.style.cursor = 'auto')}
            >
                <icosahedronGeometry args={[geoRadius, geoDetail]} />
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={vertShader}
                    fragmentShader={fragShader}
                    uniforms={uniforms}
                    transparent
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Pulsing orbit ring for modulator moons */}
            {isModulatorMoon && (
                <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.55, 0.65, 32]} />
                    <meshBasicMaterial
                        color={ringColor}
                        opacity={0.4}
                        transparent
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </group>
    );
});
