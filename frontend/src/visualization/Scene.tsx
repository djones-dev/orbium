import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Sun } from './Sun';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useSelection } from '../contexts/SelectionContext';

/**
 * 3D visualization scene for Orbium
 * Phase 2: Sun Shader and Audio Integration
 * Camera positioned at 30° above the orbital plane as per design spec
 */
const Scene = () => {
    // Calculate camera position: 30° above orbital plane, distance 15
    const cameraDistance = 15;
    const cameraAngle = Math.PI / 6; // 30 degrees in radians
    const cameraY = Math.sin(cameraAngle) * cameraDistance;
    const cameraZ = Math.cos(cameraAngle) * cameraDistance;

    const { engine } = useAudioEngine();
    const { selectedBody } = useSelection();

    const sunBody = engine.bodiesManager.getBodies().find(b => b.type === 'sun');

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

                {/* Shader-driven Sun */}
                <Sun body={sunBody} />

                {/* Selected Body Orbit Path */}
                {selectedBody && selectedBody.position.radius > 0 && (
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[selectedBody.position.radius - 0.05, selectedBody.position.radius + 0.05, 128]} />
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
            </Canvas>
        </div>
    );
};

export default Scene;
