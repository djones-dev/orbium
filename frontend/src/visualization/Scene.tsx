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

                if (preset.role === 'oscillator') {
                    await engine.instantiateBodyFromPreset(preset, { radius, angle });
                    showToast('PLANET CREATED', 'success');

                } else if (preset.role === 'phenomenon') {
                    // Phenomena are standalone bodies placed on the orbital plane
                    const id = crypto.randomUUID();
                    const body: OrbitalBody = {
                        id,
                        type: 'phenomenon',
                        presetType: preset.role,
                        presetId: preset.id,
                        position: { radius, angle },
                        velocity: 0,
                        audioParams: preset.defaults,
                        audioLayerId: `layer-${id}`,
                        visualConfig: {
                            color: '#ff9900',
                            size: 1,
                            shaderUniforms: {}
                        },
                    };
                    await engine.bodiesManager.addBody(body);
                    showToast('PHENOMENON CREATED', 'success');

                } else if (preset.role === 'modulator' || preset.role === 'effect') {
                    const parentId = findNearestParent(8.0);
                    if (!parentId) {
                        showToast('Drop near a planet to attach', 'error');
                        return;
                    }

                    if (preset.role === 'effect') {
                        // Effects are attributes on the parent, not new bodies
                        await engine.bodiesManager.addAttribute(parentId, preset.id);
                        showToast('EFFECT APPLIED', 'success');
                    } else {
                        // Modulators are moons
                        const moonColor = '#9b59b6';
                        const id = crypto.randomUUID();
                        const body: OrbitalBody = {
                            id,
                            type: 'moon',
                            presetType: preset.role,
                            presetId: preset.id,
                            position: { radius: MOON_LOCAL_ORBIT_RADIUS, angle: 0 },
                            velocity: 0.8,
                            audioParams: preset.defaults,
                            audioLayerId: `layer-${id}`,
                            visualConfig: {
                                color: moonColor,
                                size: 8,
                                shaderUniforms: {}
                            },
                            parentId,
                        };
                        await engine.bodiesManager.addBody(body);
                        showToast('MODULATOR ATTACHED', 'success');
                    }
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
 * All data is read fresh every frame via useFrame — no stale useMemo.
 *
 * Implementation: a unit circle (radius=1) THREE.Line scaled to the actual
 * orbit radius each frame. This avoids ringGeometry's fixed-args limitation
 * and guarantees the ring is always correct regardless of mount timing.
 *
 * - Planets/sun: centered at world origin, scaled to orbital radius.
 * - Moons: centered on parent's current world position, scaled to local radius.
 */
const SelectedBodyOrbitRing = ({ bodyId }: { bodyId: string }) => {
    // Build a unit circle (radius=1) once; scale it to the orbit radius each frame
    const lineObj = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: '#33ff33', opacity: 0.25, transparent: true });
        const line = new THREE.Line(geo, mat);
        line.visible = false;
        return line;
    }, []);

    useFrame(() => {
        const world = World.getInstance();

        const hierarchy = world.entities.getComponent<HierarchyComponent>(bodyId, ComponentType.Hierarchy);
        const parentId = hierarchy?.parentId ?? null;

        let cx = 0, cz = 0, orbitRadius = 0;

        if (parentId) {
            // Moon: center on parent's live world position; local radius from PhysicsSystem
            const parentPos = world.entities.getComponent<PositionComponent>(parentId, ComponentType.Position);
            if (parentPos) {
                cx = parentPos.radius * Math.cos(parentPos.angle);
                cz = parentPos.radius * Math.sin(parentPos.angle);
            }
            orbitRadius = PhysicsSystem.getInstance().getPosition(bodyId)?.radius ?? 0;
        } else {
            // Planet/sun: centered at origin; world radius equals local radius
            const pos = world.entities.getComponent<PositionComponent>(bodyId, ComponentType.Position);
            orbitRadius = pos?.radius ?? 0;
        }

        if (orbitRadius <= 0) {
            lineObj.visible = false;
            return;
        }

        lineObj.visible = true;
        lineObj.position.set(cx, 0, cz);
        lineObj.scale.setScalar(orbitRadius);
    });

    return <primitive object={lineObj} />;
};

/**
 * Trigger position markers — shows a small indicator at the triggerAngle position on each body's orbit.
 * Selected body's marker is bright; all others are dim.
 */
const TriggerMarker = ({ bodyId, isSelected }: { bodyId: string; isSelected: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        const world = World.getInstance();
        const pos = world.entities.getComponent<PositionComponent>(bodyId, ComponentType.Position);
        const hierarchy = world.entities.getComponent<HierarchyComponent>(bodyId, ComponentType.Hierarchy);

        if (!pos || !meshRef.current) return;

        // Get trigger angle from PhysicsSystem
        const triggerAngle = PhysicsSystem.getInstance().getTriggerAngle(bodyId);

        // Compute marker position
        let cx = 0, cz = 0;

        // For moons, offset by parent's live world position
        if (hierarchy?.parentId) {
            const parentPos = world.entities.getComponent<PositionComponent>(hierarchy.parentId, ComponentType.Position);
            if (parentPos) {
                cx = parentPos.radius * Math.cos(parentPos.angle);
                cz = parentPos.radius * Math.sin(parentPos.angle);
            }
        }

        // Marker on orbit ring at triggerAngle
        const radius = pos.radius;
        const x = cx + radius * Math.cos(triggerAngle);
        const z = cz + radius * Math.sin(triggerAngle);

        meshRef.current.position.set(x, 0, z);
    });

    return (
        <mesh ref={meshRef} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
            <coneGeometry args={[0.1, 0.2, 4]} />
            <meshBasicMaterial
                color="#33ff33"
                opacity={isSelected ? 0.9 : 0.1}
                transparent
            />
        </mesh>
    );
};

const TriggerMarkers = () => {
    const [bodyIds, setBodyIds] = useState<string[]>([]);
    const { selectedBodyId } = useSelection();

    useEffect(() => {
        const world = World.getInstance();
        const bus = EventBus.getInstance();

        const rebuild = () => {
            const ids = world.entities.query(ComponentType.Position, ComponentType.Preset);
            setBodyIds([...ids]);
        };

        rebuild();
        const unsubAdd = bus.on(AudioEventType.BODY_ADDED, rebuild);
        const unsubRem = bus.on(AudioEventType.BODY_REMOVED, rebuild);
        return () => { unsubAdd(); unsubRem(); };
    }, []);

    return (
        <group>
            {bodyIds.map(id => (
                <TriggerMarker key={id} bodyId={id} isSelected={id === selectedBodyId} />
            ))}
        </group>
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

                <TriggerMarkers />

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
