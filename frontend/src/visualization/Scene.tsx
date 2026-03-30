import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Sun } from './Sun';
import { logger } from '@/utils/logger';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useSelection } from '../contexts/SelectionContext';
import * as THREE from 'three';
import { useRef, useMemo, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { presetService } from '../services/PresetService';
import { useUIStore } from '../stores/uiStore';
import { OrbitalBody } from '../types/orbital';
import { usePhysicsLoop } from '../hooks/usePhysicsLoop';
import { World } from '../ecs/World';
import { ComponentType } from '../ecs/components/Component';
import { PositionComponent } from '../ecs/components/PositionComponent';
import { PresetComponent } from '../ecs/components/PresetComponent';
import { AudioEventType } from '../events/AudioEvents';
import { EventBus } from '../events/EventBus';

/** Drives the PhysicsSystem forward each frame. Must live inside the Canvas. */
const PhysicsUpdater = () => {
    usePhysicsLoop();
    return null;
};

/**
 * Renders faint orbital rings for all planet-level bodies.
 * Brightens when dragging a modulator/effect to show valid drop targets.
 */
const AllOrbitalRings = ({ isDraggingModulator, highlightedParentId }: {
    isDraggingModulator: boolean;
    highlightedParentId: string | null;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const [rings, setRings] = useState<Array<{ id: string; radius: number }>>([]);

    useEffect(() => {
        const world = World.getInstance();
        const bus = EventBus.getInstance();

        const rebuild = () => {
            const ids = world.entities.query(ComponentType.Position, ComponentType.Preset);
            const next: Array<{ id: string; radius: number }> = [];
            for (const id of ids) {
                if (id === 'sun-primary') continue;
                const preset = world.entities.getComponent<PresetComponent>(id, ComponentType.Preset);
                if (preset?.bodyType !== 'planet') continue;
                const pos = world.entities.getComponent<PositionComponent>(id, ComponentType.Position);
                if (!pos || pos.radius <= 0) continue;
                next.push({ id, radius: pos.radius });
            }
            setRings(next);
        };

        rebuild();
        const unsubAdd = bus.on(AudioEventType.BODY_ADDED, rebuild);
        const unsubRem = bus.on(AudioEventType.BODY_REMOVED, rebuild);
        return () => { unsubAdd(); unsubRem(); };
    }, []);

    return (
        <group ref={groupRef}>
            {rings.map(({ id, radius }) => {
                const isHighlighted = id === highlightedParentId;
                const opacity = isHighlighted ? 0.55
                    : isDraggingModulator ? 0.28
                    : 0.06;
                const color = isHighlighted ? '#33ff33'
                    : isDraggingModulator ? '#9b59b6'
                    : '#33ff33';
                return (
                    <mesh key={id} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[radius - 0.04, radius + 0.04, 128]} />
                        <meshBasicMaterial color={color} opacity={opacity} transparent />
                    </mesh>
                );
            })}
        </group>
    );
};

/**
 * Internal component for handling drag and drop interaction within the 3D scene.
 * For generator presets: place anywhere on the orbital plane.
 * For modulator/effect presets: find nearest planet body (within 8 units).
 */
const DragDropHandler = ({ onDragStateChange, onHighlightChange }: {
    onDragStateChange: (isDragging: boolean) => void;
    onHighlightChange: (id: string | null) => void;
}) => {
    const { camera, gl } = useThree();
    const { engine } = useAudioEngine();
    const showToast = useUIStore(s => s.showToast);

    const previewRef = useRef<THREE.Mesh>(null);
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const pointer = useMemo(() => new THREE.Vector2(), []);
    const target = useMemo(() => new THREE.Vector3(), []);

    useEffect(() => {
        const canvas = gl.domElement;

        const getRaycastIntersection = (clientX: number, clientY: number) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            return raycaster.ray.intersectPlane(plane, target);
        };

        const isDraggingModulatorOrEffect = (e: DragEvent) => {
            return e.dataTransfer!.types.some(
                t => t === 'presettype/modulator' || t === 'presettype/effect'
            );
        };

        /** Find nearest planet within maxDist to the drop point */
        const findNearestParent = (maxDist: number): string | undefined => {
            const world = World.getInstance();
            const ids = world.entities.query(ComponentType.Position, ComponentType.Preset);
            let nearest: string | undefined;
            let nearestDist = maxDist;

            for (const id of ids) {
                if (id === 'sun-primary') continue;
                const preset = world.entities.getComponent<PresetComponent>(id, ComponentType.Preset);
                // Only planets can be parents for modulators/effects
                if (preset?.bodyType !== 'planet') continue;

                const pos = world.entities.getComponent<PositionComponent>(id, ComponentType.Position);
                if (!pos) continue;

                const bx = pos.radius * Math.cos(pos.angle);
                const bz = pos.radius * Math.sin(pos.angle);
                const dist = Math.sqrt((target.x - bx) ** 2 + (target.z - bz) ** 2);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = id;
                }
            }
            return nearest;
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'copy';

            const hit = getRaycastIntersection(e.clientX, e.clientY);
            if (!hit) return;

            if (previewRef.current) {
                previewRef.current.visible = true;
                previewRef.current.position.copy(target);
            }

            const isModOrEffect = isDraggingModulatorOrEffect(e);
            onDragStateChange(isModOrEffect);

            if (isModOrEffect) {
                const nearestId = findNearestParent(8.0);
                onHighlightChange(nearestId ?? null);
            }
        };

        const handleDragLeave = () => {
            if (previewRef.current) previewRef.current.visible = false;
            onDragStateChange(false);
            onHighlightChange(null);
        };

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            if (previewRef.current) previewRef.current.visible = false;
            onDragStateChange(false);
            onHighlightChange(null);

            const presetId = e.dataTransfer!.getData('presetId');
            if (!presetId) return;

            const hit = getRaycastIntersection(e.clientX, e.clientY);
            if (!hit) return;

            const radius = Math.sqrt(target.x ** 2 + target.z ** 2);
            const angle = Math.atan2(target.z, target.x);

            try {
                const preset = await presetService.getPreset(presetId);
                if (!preset) return;

                if (preset.type === 'generator') {
                    await engine.instantiateBodyFromPreset(preset, { radius, angle });
                    showToast('PLANET CREATED', 'success');

                } else if (preset.type === 'modulator' || preset.type === 'effect') {
                    // Find nearest planet within generous range (8 units)
                    const parentId = findNearestParent(8.0);
                    if (!parentId) {
                        showToast('Drop near a planet to attach', 'error');
                        return;
                    }

                    const moonColor = preset.type === 'modulator' ? '#9b59b6' : '#e67e22';
                    const id = crypto.randomUUID();
                    const body: OrbitalBody = {
                        id,
                        type: 'moon',
                        presetType: preset.type,
                        presetId: preset.id,
                        position: { radius: 1.8, angle: 0 },
                        velocity: 0.8,
                        audioParams: preset.parameters,
                        audioLayerId: `layer-${id}`,
                        visualConfig: {
                            color: moonColor,
                            size: 8,
                            shaderUniforms: {}
                        },
                        parentId,
                    };
                    await engine.bodiesManager.addBody(body);
                    const label = preset.type === 'modulator' ? 'MODULATOR' : 'EFFECT';
                    showToast(`${label} ATTACHED`, 'success');
                }
            } catch (err) {
                logger.error(err);
                showToast('Failed to instantiate preset', 'error');
            }
        };

        canvas.addEventListener('dragover', handleDragOver);
        canvas.addEventListener('dragleave', handleDragLeave);
        canvas.addEventListener('drop', handleDrop);

        return () => {
            canvas.removeEventListener('dragover', handleDragOver);
            canvas.removeEventListener('dragleave', handleDragLeave);
            canvas.removeEventListener('drop', handleDrop);
        };
    }, [camera, gl, plane, engine, showToast, pointer, target, raycaster,
        onDragStateChange, onHighlightChange]);

    return (
        <mesh ref={previewRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[0, 1.0, 32]} />
            <meshBasicMaterial color="white" opacity={0.4} transparent side={THREE.DoubleSide} />
        </mesh>
    );
};

/**
 * 3D visualization scene for Orbium
 */
const Scene = () => {
    const cameraDistance = 15;
    const cameraAngle = Math.PI / 6;
    const cameraY = Math.sin(cameraAngle) * cameraDistance;
    const cameraZ = Math.cos(cameraAngle) * cameraDistance;

    const { selectedBodyId } = useSelection();
    const [renderData, setRenderData] = useState<string[]>([]);
    const [isDraggingModulator, setIsDraggingModulator] = useState(false);
    const [highlightedParentId, setHighlightedParentId] = useState<string | null>(null);

    useEffect(() => {
        const world = World.getInstance();
        const bus = EventBus.getInstance();

        const updateRenderData = () => {
            const ids = world.entities.query(ComponentType.Position, ComponentType.Visual);
            setRenderData([...ids]);
        };

        updateRenderData();
        const unsubAdd = bus.on(AudioEventType.BODY_ADDED, updateRenderData);
        const unsubRem = bus.on(AudioEventType.BODY_REMOVED, updateRenderData);
        return () => { unsubAdd(); unsubRem(); };
    }, []);

    // Selected body orbit ring
    const selectedBodyRadius = useMemo(() => {
        if (!selectedBodyId) return null;
        const world = World.getInstance();
        const pos = world.entities.getComponent<PositionComponent>(selectedBodyId, ComponentType.Position);
        return pos && pos.radius > 0 ? pos.radius : null;
    }, [selectedBodyId]);

    return (
        <div className="w-full h-full">
            <Canvas
                camera={{
                    position: [0, cameraY, cameraZ],
                    fov: 60
                }}
            >
                <color attach="background" args={['#050508']} />
                <ambientLight intensity={0.1} />

                <Stars
                    radius={100}
                    depth={50}
                    count={5000}
                    factor={2}
                    saturation={0}
                    fade
                    speed={0.5}
                />

                {/* Subtle background rings for all planet orbits */}
                <AllOrbitalRings
                    isDraggingModulator={isDraggingModulator}
                    highlightedParentId={highlightedParentId}
                />

                {/* Render all bodies */}
                {renderData.map(id => (
                    <Sun key={id} id={id} />
                ))}

                {/* Selected body orbit ring (bright green) */}
                {selectedBodyRadius && (
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[selectedBodyRadius - 0.05, selectedBodyRadius + 0.05, 128]} />
                        <meshBasicMaterial
                            color="#33ff33"
                            opacity={0.25}
                            transparent
                        />
                    </mesh>
                )}

                {/* Reference grid */}
                <gridHelper
                    args={[20, 20, '#33ff33', '#33ff33']}
                    position={[0, -0.01, 0]}
                    material-opacity={0.05}
                    material-transparent
                />

                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={5}
                    maxDistance={50}
                    target={[0, 0, 0]}
                />

                <DragDropHandler
                    onDragStateChange={setIsDraggingModulator}
                    onHighlightChange={setHighlightedParentId}
                />
                <PhysicsUpdater />
            </Canvas>
        </div>
    );
};

export default Scene;
