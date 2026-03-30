import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Sun } from './Sun';
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
import { AudioEventType } from '../events/AudioEvents';
import { EventBus } from '../events/EventBus';

/** Drives the PhysicsSystem forward each frame. Must live inside the Canvas. */
const PhysicsUpdater = () => {
    usePhysicsLoop();
    return null;
};

/**
 * Internal component for handling drag and drop interaction within the 3D scene
 */
const DragDropHandler = () => {
    const { camera, gl } = useThree();
    const { engine } = useAudioEngine();
    const showToast = useUIStore(s => s.showToast);

    // Visual preview of the drop
    const previewRef = useRef<THREE.Mesh>(null);
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    // Re-use vector to avoid GC
    const pointer = useMemo(() => new THREE.Vector2(), []);
    const target = useMemo(() => new THREE.Vector3(), []);

    useEffect(() => {
        const canvas = gl.domElement;

        const getRaycastIntersection = (clientX: number, clientY: number) => {
            const rect = canvas.getBoundingClientRect();
            // Convert to Normalized Device Coordinates (-1 to +1)
            pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            return raycaster.ray.intersectPlane(plane, target);
        }

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'copy';

            const hit = getRaycastIntersection(e.clientX, e.clientY);

            if (hit && previewRef.current) {
                previewRef.current.visible = true;

                // Logic: Check if over existing planet for Modulators
                // For now, just show at cursor position
                previewRef.current.position.copy(target);
            }
        };

        const handleDragLeave = () => {
            if (previewRef.current) previewRef.current.visible = false;
        };

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            if (previewRef.current) previewRef.current.visible = false;

            const presetId = e.dataTransfer!.getData('presetId');
            if (!presetId) return;

            const hit = getRaycastIntersection(e.clientX, e.clientY);

            if (hit) {
                const radius = Math.sqrt(target.x ** 2 + target.z ** 2);
                const angle = Math.atan2(target.z, target.x);

                // Check Overlaps via ECS
                const world = World.getInstance();
                const entityIds = world.entities.query(ComponentType.Position);
                let parentId: string | undefined;

                // Simple overlap check (radius < 2 units)
                for (const id of entityIds) {
                    if (id !== 'sun-primary') {
                        const pos = world.entities.getComponent<PositionComponent>(id, ComponentType.Position);
                        if (!pos) continue;

                        const bx = pos.radius * Math.cos(pos.angle);
                        const bz = pos.radius * Math.sin(pos.angle);
                        const dist = Math.sqrt((target.x - bx) ** 2 + (target.z - bz) ** 2);
                        if (dist < 2.0) {
                            parentId = id;
                            break;
                        }
                    }
                }

                try {
                    const preset = await presetService.getPreset(presetId);
                    if (!preset) return;

                    // Decision: Generator vs Modulator
                    if (preset.type === 'modulator' || (preset.type === 'effect' && parentId)) {
                        // Must drop on parent
                        if (!parentId) {
                            showToast('Modulators must be dropped on a planet', 'error');
                            return;
                        }
                        // Create Moon/Modulator
                        const id = crypto.randomUUID();
                        const body: OrbitalBody = {
                            id,
                            type: 'moon',
                            presetId: preset.id,
                            position: { radius: 1.5, angle: 0 }, // Relative to parent
                            velocity: 0.5,
                            audioParams: preset.parameters,
                            audioLayerId: `layer-${id}`,
                            visualConfig: {
                                color: '#32CD32',
                                size: 8,
                                shaderUniforms: {}
                            },
                            parentId: parentId
                        };
                        await engine.bodiesManager.addBody(body);
                        showToast('MOON CREATED', 'success');

                    } else if (preset.type === 'generator') {
                        await engine.instantiateBodyFromPreset(preset, { radius, angle });
                        showToast('PLANET CREATED', 'success');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Failed to instantiate preset', 'error');
                }
            }
        };

        canvas.addEventListener('dragover', handleDragOver);
        canvas.addEventListener('dragleave', handleDragLeave);
        canvas.addEventListener('drop', handleDrop);

        return () => {
            canvas.removeEventListener('dragover', handleDragOver);
            canvas.removeEventListener('dragleave', handleDragLeave);
            canvas.removeEventListener('drop', handleDrop);
        }
    }, [camera, gl, plane, engine, showToast, pointer, target, raycaster]);

    return (
        <mesh ref={previewRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[0, 1.0, 32]} />
            <meshBasicMaterial color="white" opacity={0.4} transparent side={THREE.DoubleSide} />
        </mesh>
    );
}

/**
 * 3D visualization scene for Orbium
 */
const Scene = () => {
    // Calculate camera position: 30° above orbital plane, distance 15
    const cameraDistance = 15;
    const cameraAngle = Math.PI / 6; // 30 degrees in radians
    const cameraY = Math.sin(cameraAngle) * cameraDistance;
    const cameraZ = Math.cos(cameraAngle) * cameraDistance;

    const { selectedBodyId } = useSelection();
    const [renderData, setRenderData] = useState<string[]>([]);

    useEffect(() => {
        const world = World.getInstance();
        const bus = EventBus.getInstance();

        const updateRenderData = () => {
            // We only need the IDs for mapping to <Sun /> components
            // RenderSystem handles the x/z projection inside Sun's useFrame (via PhysicsSystem)
            const ids = world.entities.query(ComponentType.Position, ComponentType.Visual);
            setRenderData([...ids]);
        };

        // Initial load
        updateRenderData();

        // Subscribe to body lifecycle events
        const unsubAdd = bus.on(AudioEventType.BODY_ADDED, updateRenderData);
        const unsubRem = bus.on(AudioEventType.BODY_REMOVED, updateRenderData);

        return () => { 
            unsubAdd();
            unsubRem();
        };
    }, []);

    // Helper to get selected body position for the orbit ring
    const selectedBodyPos = useMemo(() => {
        if (!selectedBodyId) return null;
        const world = World.getInstance();
        return world.entities.getComponent<PositionComponent>(selectedBodyId, ComponentType.Position);
    }, [selectedBodyId]);

    return (
        <div className="w-full h-full">
            <Canvas
                camera={{
                    position: [0, cameraY, cameraZ],
                    fov: 60
                }}
            >
                {/* Deep space black background */}
                <color attach="background" args={['#050508']} />

                {/* Subtle ambient lighting */}
                <ambientLight intensity={0.1} />

                {/* Star field - very dim, distant */}
                <Stars
                    radius={100}
                    depth={50}
                    count={5000}
                    factor={2}
                    saturation={0}
                    fade
                    speed={0.5}
                />

                {/* Render All Bodies */}
                {renderData.map(id => (
                    <Sun key={id} id={id} />
                ))}

                {/* Selected Body Orbit Path */}
                {selectedBodyPos && selectedBodyPos.radius > 0 && (
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[selectedBodyPos.radius - 0.05, selectedBodyPos.radius + 0.05, 128]} />
                        <meshBasicMaterial
                            color="#33ff33"
                            opacity={0.25}
                            transparent
                        />
                    </mesh>
                )}

                {/* Reference grid at orbital plane (subtle, for development) */}
                <gridHelper
                    args={[20, 20, '#33ff33', '#33ff33']}
                    position={[0, -0.01, 0]}
                    material-opacity={0.05}
                    material-transparent
                />

                {/* Camera controls with smooth damping */}
                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={5}
                    maxDistance={50}
                    target={[0, 0, 0]}
                />

                <DragDropHandler />
                <PhysicsUpdater />
            </Canvas>
        </div>
    );
};

export default Scene;
