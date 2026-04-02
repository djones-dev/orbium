import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import sunVertexShader from './shaders/sun.vert?raw';
import sunFragmentShader from './shaders/sun.frag?raw';
import planetVertexShader from './shaders/planet.vert?raw';
import planetFragmentShader from './shaders/planet.frag?raw';
import moonVertexShader from './shaders/moon.vert?raw';
import moonFragmentShader from './shaders/moon.frag?raw';
import { AudioParams } from '../types/audio';
import { useSelection } from '../contexts/SelectionContext';
import { World } from '../ecs/World';
import { ComponentType } from '../ecs/components/Component';
import { AudioComponent } from '../ecs/components/AudioComponent';
import { VisualComponent } from '../ecs/components/VisualComponent';
import { PresetComponent } from '../ecs/components/PresetComponent';
import { PositionComponent } from '../ecs/components/PositionComponent';
import { EffectComponent } from '../ecs/components/EffectComponent';
import { PhenomenaComponent } from '../ecs/components/PhenomenaComponent';
import { SimulationEventType, BodyTriggerFiredEvent } from '../events/SimulationEvents';
import { EventBus } from '../events/EventBus';

type BodyVariant = 'sun' | 'planet' | 'moon' | 'phenomenon';

/** Parse a CSS hex color string to a THREE.Color */
function hexToThreeColor(hex: string): THREE.Color {
    try {
        return new THREE.Color(hex);
    } catch {
        return new THREE.Color('#ffffff');
    }
}

/**
 * CometVisual — nucleus cone + trailing plane strip
 */
const CometVisual = React.memo(({ color }: { color: string }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.z = state.clock.elapsedTime * 0.3;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Nucleus: cone pointing forward */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.15, 0.4, 8]} />
                <meshBasicMaterial color={color} />
            </mesh>
            {/* Tail: trailing plane strip */}
            <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.06, 0.7]} />
                <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
});

/**
 * PulsarVisual — faceted core + rotating beam planes
 */
const PulsarVisual = React.memo(({ id, color }: { id: string; color: string }) => {
    const beamGroupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const world = World.getInstance();
        const phenom = world.entities.getComponent<PhenomenaComponent>(id, ComponentType.Phenomena);
        if (beamGroupRef.current && phenom) {
            beamGroupRef.current.rotation.y = phenom.properties.beamAngle ?? 0;
            // Pulse opacity
            const beamMesh = beamGroupRef.current.children[0] as THREE.Mesh;
            if (beamMesh && beamMesh.material) {
                const mat = beamMesh.material as THREE.MeshBasicMaterial;
                mat.opacity = 0.3 + 0.3 * Math.sin(state.clock.elapsedTime * 6);
            }
        }
    });

    return (
        <group>
            {/* Core: faceted sphere */}
            <mesh>
                <icosahedronGeometry args={[0.18, 0]} />
                <meshBasicMaterial color={color} />
            </mesh>
            {/* Beam group — rotates with beamAngle */}
            <group ref={beamGroupRef}>
                <mesh>
                    <planeGeometry args={[5.0, 0.07]} />
                    <meshBasicMaterial color="#ccffff" transparent opacity={0.4} side={THREE.DoubleSide} />
                </mesh>
            </group>
        </group>
    );
});

/**
 * LagrangeVisual — wireframe tetrahedron, slowly spinning
 */
const LagrangeVisual = React.memo(({ color }: { color: string }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.4;
            groupRef.current.rotation.x = state.clock.elapsedTime * 0.2;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Solid face */}
            <mesh>
                <tetrahedronGeometry args={[0.3, 0]} />
                <meshBasicMaterial color={color} transparent opacity={0.5} />
            </mesh>
            {/* Wireframe */}
            <mesh>
                <tetrahedronGeometry args={[0.32, 0]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.8} />
            </mesh>
        </group>
    );
});

export const Sun = React.memo(({ id }: { id: string }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const atmosphereRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const lastTriggerRef = useRef(0);
    const { selectedBodyId, select } = useSelection();

    const isSelected = selectedBodyId === id;
    const isOrbiting = id !== 'sun-primary';

    // Read body type and color from ECS at render time — stable since type never changes
    const world = World.getInstance();
    const presetComp = world.entities.getComponent<PresetComponent>(id, ComponentType.Preset);
    const visualComp = world.entities.getComponent<VisualComponent>(id, ComponentType.Visual);

    const bodyVariant: BodyVariant = id === 'sun-primary' ? 'sun'
        : presetComp?.bodyType === 'moon' ? 'moon'
        : presetComp?.bodyType === 'phenomenon' ? 'phenomenon'
        : presetComp?.bodyType === 'planet' ? 'planet'
        : 'planet';

    const presetType = presetComp?.presetType;
    const isModulatorMoon = bodyVariant === 'moon' && presetType === 'modulator';
    const bodyColor = visualComp?.color ?? (bodyVariant === 'sun' ? '#ffcc00' : bodyVariant === 'planet' ? '#4169E1' : bodyVariant === 'phenomenon' ? '#ff9900' : '#32CD32');

    // Read phenomenon component if this is a phenomenon body
    const phenomenaComp = bodyVariant === 'phenomenon'
        ? world.entities.getComponent<PhenomenaComponent>(id, ComponentType.Phenomena)
        : null;

    // Subscribe to trigger events for flash effect
    useEffect(() => {
        const bus = EventBus.getInstance();
        const unsub = bus.on<BodyTriggerFiredEvent>(SimulationEventType.BODY_TRIGGER_FIRED, (e) => {
            if (e.id === id) {
                lastTriggerRef.current = performance.now();
            }
        });
        return unsub;
    }, [id]);

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
        if (bodyVariant === 'moon') {
            // Modulator moons: sharper, faceted gem (detail=1 = 20 faces)
            // Effect/oscillator moons: rounder (detail=3 = 320 faces)
            const detail = isModulatorMoon ? 1 : 3;
            return { geoRadius: 0.4, geoDetail: detail };
        }
        // Phenomenon bodies (shouldn't reach here due to early return, but fallback)
        return { geoRadius: 0.5, geoDetail: 2 };
    }, [bodyVariant, isModulatorMoon]);

    const ringColor = isModulatorMoon ? '#9b59b6' : '#e67e22';

    useFrame((state) => {
        if (!groupRef.current) return;
        const world = World.getInstance();

        // Check for atmosphere effect
        const effectComp = world.entities.getComponent<EffectComponent>(id, ComponentType.Effect);
        const hasAtmosphere = effectComp?.effects.some(e => e.type === 'atmosphere');
        if (atmosphereRef.current) {
            atmosphereRef.current.visible = !!hasAtmosphere;
            if (hasAtmosphere) {
                const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
                atmosphereRef.current.scale.setScalar(pulse);
            }
        }

        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            materialRef.current.uniforms.uSelected.value = THREE.MathUtils.lerp(
                materialRef.current.uniforms.uSelected.value,
                isSelected ? 1.0 : 0.0,
                0.1,
            );
        }

        // Move the group to the orbital position.
        // Read world-space coordinates from ECS PositionComponent:
        //   - Planets: synced by MovementSystem from PhysicsSystem each frame
        //   - Moons:   synced by HierarchySystem (priority 150, after MovementSystem)
        //             which computes parent world pos + child local pos → world pos
        if (isOrbiting) {
            const pos = world.entities.getComponent<PositionComponent>(id, ComponentType.Position);
            if (pos) {
                const x = pos.radius * Math.cos(pos.angle);
                const z = pos.radius * Math.sin(pos.angle);
                groupRef.current.position.set(x, 0, z);
            }
        }

        // Audio-reactive shader uniforms
        const audio = world.entities.getComponent<AudioComponent>(id, ComponentType.Audio);
        if (!audio || !materialRef.current) return;

        // Extract flat values from nested AudioParams for shader uniforms
        const audioParams = audio.parameters as Partial<AudioParams>;
        const oscConfig = (audioParams.oscillator as any) ?? { type: 'basic', params: {} };
        const oscParams = oscConfig.params ?? {};
        const filterParams = audioParams.filter ?? {};
        const distortionParams = audioParams.distortion ?? {};

        const params = {
            rootFrequency: oscParams.rootFrequency ?? 60,
            filterCutoff: filterParams.filterCutoff ?? 5000,
            filterResonance: filterParams.filterResonance ?? 1.0,
            detuneSpread: oscParams.detuneSpread ?? 10,
            lfoRate: filterParams.lfoRate ?? 0.5,
            distortion: distortionParams.distortion ?? 0,
            gainLevel: audioParams.gainLevel ?? -6,
            waveform: oscParams.waveform ?? 'sine',
            noiseEnabled: oscParams.noiseEnabled ?? false,
            noiseVol: oscParams.noiseVol ?? -20,
            subEnabled: oscParams.subEnabled ?? true,
            subVol: oscParams.subVol ?? -10,
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

        // Trigger flash effect — boost glow intensity when body fires
        const elapsed = (performance.now() - lastTriggerRef.current) / 1000;
        if (elapsed < 0.4 && materialRef.current) {
            const flashBoost = (1 - elapsed / 0.4) * 2.0;
            materialRef.current.uniforms.uGlowIntensity.value += flashBoost;
        }
    });

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(id);
    };

    // Early return for phenomena bodies — use dedicated visuals instead of shader-based mesh
    if (bodyVariant === 'phenomenon') {
        return (
            <group ref={groupRef} onClick={handleClick}>
                {phenomenaComp?.phenomenonType === 'comet' && <CometVisual color={bodyColor} />}
                {phenomenaComp?.phenomenonType === 'pulsar' && <PulsarVisual id={id} color={bodyColor} />}
                {phenomenaComp?.phenomenonType === 'lagrange_point' && <LagrangeVisual color={bodyColor} />}
            </group>
        );
    }

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

            {/* Visual Atmosphere Effect */}
            {bodyVariant === 'planet' && (
                <mesh ref={atmosphereRef} visible={false}>
                    <sphereGeometry args={[geoRadius * 1.4, 32, 32]} />
                    <meshBasicMaterial 
                        color={bodyColor} 
                        transparent 
                        opacity={0.15} 
                        side={THREE.BackSide}
                    />
                </mesh>
            )}

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
