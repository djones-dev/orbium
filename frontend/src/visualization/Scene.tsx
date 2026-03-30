import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Sun } from './Sun';
import { logger } from '@/utils/logger';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useSelection } from '../contexts/SelectionContext';
import * as THREE from 'three';
import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { presetService } from '../services/PresetService';
import { useUIStore } from '../stores/uiStore';
import { OrbitalBody } from '../types/orbital';
import { usePhysicsLoop } from '../hooks/usePhysicsLoop';
import { World } from '../ecs/World';
import { ComponentType } from '../ecs/components/Component';
import { PositionComponent } from '../ecs/components/PositionComponent';
import { PresetComponent } from '../ecs/components/PresetComponent';
import { HierarchyComponent } from '../ecs/components/HierarchyComponent';
import { PhysicsSystem } from '../simulation/PhysicsSystem';
import { AudioEventType } from '../events/AudioEvents';
import { EventBus } from '../events/EventBus';

/** Drives the PhysicsSystem forward each frame. Must live inside the Canvas. */
const PhysicsUpdater = () => {
    usePhysicsLoop();
    return null;
};

// Orbit radius a newly created moon will have around its parent
const MOON_LOCAL_ORBIT_RADIUS = 1.8;

/**
 * Returns current world-space Cartesian coords for an entity's PositionComponent.
 * Returns null if entity doesn't exist or has no position.
 */
function getWorldXZ(entityId: string): { x: number; z: number } | null {
    const pos = World.getInstance().entities.getComponent<PositionComponent>(entityId, ComponentType.Position);
    if (!pos) return null;
    return {
        x: pos.radius * Math.cos(pos.angle),
        z: pos.radius * Math.sin(pos.angle),
    };
}

/**
 * Faint orbital rings for all planets.
 * Brightens during a modulator/effect drag to show valid targets.
 * When a parent is highlighted, shows a preview orbit ring around that planet
 * (at the local orbit radius the new moon will use) and a connection line.
 */
const AllOrbitalRings = ({
    isDraggingModulator,
    highlightedParentId,
    cursorPos,
}: {
    isDraggingModulator: boolean;
    highlightedParentId: string | null;
    cursorPos: THREE.Vector3 | null;
}) => {
    const [rings, setRings] = useState<Array<{ id: string; radius: number }>>([]);

    // Orbit-preview ring — centered at the highlighted parent planet
    const previewRingRef = useRef<THREE.Mesh>(null);

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

    // Build a THREE.Line object once, add it imperatively
    const lineObj = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        const mat = new THREE.LineBasicMaterial({ color: '#9b59b6', opacity: 0.45, transparent: true });
        const l = new THREE.Line(geo, mat);
        l.visible = false;
        return l;
    }, []);

    // Every frame: reposition the orbit-preview ring and connection line
    useFrame(() => {
        if (!highlightedParentId || !isDraggingModulator) {
            if (previewRingRef.current) previewRingRef.current.visible = false;
            lineObj.visible = false;
            return;
        }

        const parentXZ = getWorldXZ(highlightedParentId);
        if (!parentXZ) return;

        // Orbit-preview ring follows the highlighted planet
        if (previewRingRef.current) {
            previewRingRef.current.visible = true;
            previewRingRef.current.position.set(parentXZ.x, 0, parentXZ.z);
        }

        // Connection line: planet center → cursor
        if (cursorPos) {
            lineObj.visible = true;
            const positions = new Float32Array([
                parentXZ.x, 0, parentXZ.z,
                cursorPos.x, 0, cursorPos.z,
            ]);
            (lineObj.geometry as THREE.BufferGeometry).setAttribute(
                'position', new THREE.BufferAttribute(positions, 3)
            );
            (lineObj.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Faint planet orbit rings (world-origin-centered) */}
            {rings.map(({ id, radius }) => {
                const isHighlighted = id === highlightedParentId;
                const opacity = isHighlighted ? 0.6
                    : isDraggingModulator ? 0.25
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

            {/* Orbit-preview ring around the target planet */}
            <mesh
                ref={previewRingRef}
                rotation={[-Math.PI / 2, 0, 0]}
                visible={false}
            >
                <ringGeometry args={[
                    MOON_LOCAL_ORBIT_RADIUS - 0.06,
                    MOON_LOCAL_ORBIT_RADIUS + 0.06,
                    64,
                ]} />
                <meshBasicMaterial color="#9b59b6" opacity={0.7} transparent />
            </mesh>

            {/* Connection line: imperative THREE.Line to avoid JSX/SVG conflict */}
            <primitive object={lineObj} />
        </group>
    );
};

/**
 * Internal drag-and-drop handler.
 * Generators: place anywhere on orbital plane.
 * Modulators/Effects: snap to nearest planet within 8 units.
 */
const DragDropHandler = ({
    onDragStateChange,
    onHighlightChange,
    onCursorMove,
}: {
    onDragStateChange: (isDragging: boolean) => void;
    onHighlightChange: (id: string | null) => void;
    onCursorMove: (pos: THREE.Vector3 | null) => void;
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

        const isModOrEffect = (e: DragEvent) =>
            e.dataTransfer!.types.some(
                t => t === 'presettype/modulator' || t === 'presettype/effect'
            );

        const findNearestParent = (maxDist: number): string | undefined => {
            const world = World.getInstance();
            const ids = world.entities.query(ComponentType.Position, ComponentType.Preset);
            let nearest: string | undefined;
            let nearestDist = maxDist;

            for (const id of ids) {
                if (id === 'sun-primary') continue;
                const preset = world.entities.getComponent<PresetComponent>(id, ComponentType.Preset);
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

            const draggingModOrEffect = isModOrEffect(e);
            onDragStateChange(draggingModOrEffect);

            if (draggingModOrEffect) {
                // For modulators/effects: don't show cursor preview, show orbit ring around parent instead
                if (previewRef.current) previewRef.current.visible = false;
                const nearestId = findNearestParent(8.0);
                onHighlightChange(nearestId ?? null);
                onCursorMove(target.clone());
            } else {
                // Generator: show cursor preview at drop position
                if (previewRef.current) {
                    previewRef.current.visible = true;
                    previewRef.current.position.copy(target);
                }
                onHighlightChange(null);
                onCursorMove(null);
            }
        };

        const handleDragLeave = () => {
            if (previewRef.current) previewRef.current.visible = false;
            onDragStateChange(false);
            onHighlightChange(null);
            onCursorMove(null);
        };

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            if (previewRef.current) previewRef.current.visible = false;
            onDragStateChange(false);
            onHighlightChange(null);
            onCursorMove(null);

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
                        position: { radius: MOON_LOCAL_ORBIT_RADIUS, angle: 0 },
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
        onDragStateChange, onHighlightChange, onCursorMove]);

    // Generator drop preview (cursor-following ring)
    return (
        <mesh ref={previewRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[0, 1.0, 32]} />
            <meshBasicMaterial color="#4169E1" opacity={0.4} transparent side={THREE.DoubleSide} />
        </mesh>
    );
};

/**
 * Orbit ring for the currently selected body.
 * - Planets/sun: centered at world origin, radius = body's world radius.
 * - Moons: centered on the parent planet's current world position (updated
 *   each frame via useFrame), radius = local orbit radius from PhysicsSystem.
 */
const SelectedBodyOrbitRing = ({ bodyId }: { bodyId: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const world = World.getInstance();

    // Check once at mount — body type doesn't change after creation
    const hierarchy = world.entities.getComponent<HierarchyComponent>(bodyId, ComponentType.Hierarchy);
    const parentId = hierarchy?.parentId ?? null;

    // Local orbit radius: for moons, PhysicsSystem has the parent-relative radius;
    // for planets, read directly from PositionComponent (world ≡ local for root bodies)
    const orbitRadius = useMemo(() => {
        if (parentId) {
            return PhysicsSystem.getInstance().getPosition(bodyId)?.radius ?? 0;
        }
        return world.entities.getComponent<PositionComponent>(bodyId, ComponentType.Position)?.radius ?? 0;
    }, [bodyId, parentId]);

    useFrame(() => {
        if (!meshRef.current || !parentId) return;
        // Follow parent planet each frame so the ring tracks the moving planet
        const parentPos = world.entities.getComponent<PositionComponent>(parentId, ComponentType.Position);
        if (!parentPos) return;
        const px = parentPos.radius * Math.cos(parentPos.angle);
        const pz = parentPos.radius * Math.sin(parentPos.angle);
        meshRef.current.position.set(px, 0, pz);
    });

    if (orbitRadius <= 0) return null;

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[orbitRadius - 0.05, orbitRadius + 0.05, 128]} />
            <meshBasicMaterial color="#33ff33" opacity={0.25} transparent />
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
    const [cursorPos, setCursorPos] = useState<THREE.Vector3 | null>(null);

    const handleDragStateChange = useCallback((v: boolean) => setIsDraggingModulator(v), []);
    const handleHighlightChange = useCallback((id: string | null) => setHighlightedParentId(id), []);
    const handleCursorMove = useCallback((pos: THREE.Vector3 | null) => setCursorPos(pos), []);

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

                <AllOrbitalRings
                    isDraggingModulator={isDraggingModulator}
                    highlightedParentId={highlightedParentId}
                    cursorPos={cursorPos}
                />

                {renderData.map(id => (
                    <Sun key={id} id={id} />
                ))}

                {/* Selected body orbit ring — tracks parent position for moons */}
                {selectedBodyId && <SelectedBodyOrbitRing bodyId={selectedBodyId} />}

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
                    onDragStateChange={handleDragStateChange}
                    onHighlightChange={handleHighlightChange}
                    onCursorMove={handleCursorMove}
                />
                <PhysicsUpdater />
            </Canvas>
        </div>
    );
};

export default Scene;
