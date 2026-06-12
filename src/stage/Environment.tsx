/**
 * Environment — the cyberpunk electro-jazz bar the band plays in.
 *
 * Built entirely from Three.js primitives + drei helpers (no asset files, per
 * AGENTS.md). "Glow" is faked with emissive materials and additive-blended
 * planes rather than a postprocessing bloom pass, which keeps the dependency
 * footprint at zero and stays cheap enough for Quest/Wolvic.
 *
 * Replaces the old flat white Floor.
 */
import { Grid, Stars } from '@react-three/drei';
import { AdditiveBlending, DoubleSide } from 'three';

const BG = '#05060f';

/** A flat, additive, emissive panel — reads as a glowing neon sign/strip. */
function NeonStrip({
  position,
  rotation = [0, 0, 0],
  size,
  color,
}: {
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  size: readonly [number, number];
  color: string;
}) {
  return (
    <mesh position={position as [number, number, number]} rotation={rotation as [number, number, number]}>
      <planeGeometry args={size as [number, number]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.85}
        blending={AdditiveBlending}
        side={DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Environment() {
  return (
    <>
      {/* Deep-space backdrop + atmospheric fog so the floor fades to black. */}
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 9, 34]} />
      <Stars radius={60} depth={40} count={1800} factor={3.2} saturation={0} fade speed={0.6} />

      {/* Lighting: dim base + coloured mood lights bouncing off the stage. */}
      <ambientLight intensity={0.28} />
      <hemisphereLight args={['#2a3a8a', '#0a0010', 0.4]} />
      <directionalLight position={[3, 8, 4]} intensity={0.5} color="#9fc7ff" />
      <pointLight position={[-5, 3.5, 1]} intensity={28} distance={22} color="#ff2d6f" />
      <pointLight position={[5, 3.5, 1]} intensity={28} distance={22} color="#2dd4ff" />
      <pointLight position={[0, 5, -4]} intensity={20} distance={24} color="#9b6bff" />
      <pointLight position={[0, 2, 6]} intensity={10} distance={18} color="#39ff8b" />

      {/* Neon grid floor — the dance-floor look. */}
      <Grid
        args={[40, 40]}
        position={[0, 0.001, 0]}
        cellSize={0.7}
        cellThickness={0.7}
        cellColor="#15306b"
        sectionSize={3.5}
        sectionThickness={1.3}
        sectionColor="#2dd4ff"
        fadeDistance={30}
        fadeStrength={1.4}
        followCamera={false}
        infiniteGrid
      />
      {/* Dark reflective-looking slab under the grid. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#04050d" metalness={0.85} roughness={0.35} />
      </mesh>

      {/* Back wall of the bar with a big neon sign band. */}
      <mesh position={[0, 4, -9]}>
        <planeGeometry args={[60, 14]} />
        <meshStandardMaterial color="#070912" metalness={0.4} roughness={0.7} />
      </mesh>
      <NeonStrip position={[0, 5.6, -8.9]} size={[26, 0.12]} color="#9b6bff" />
      <NeonStrip position={[0, 2.4, -8.9]} size={[26, 0.08]} color="#2dd4ff" />

      {/* Side accent strips converging toward the stage (perspective lines). */}
      <NeonStrip position={[-9, 2.2, -3]} rotation={[0, Math.PI / 2, 0]} size={[12, 0.06]} color="#ff2d6f" />
      <NeonStrip position={[9, 2.2, -3]} rotation={[0, -Math.PI / 2, 0]} size={[12, 0.06]} color="#39ff8b" />

      {/* The bar counter in front of the audience, edge-lit. */}
      <group position={[0, 0, 5.2]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[9, 1.1, 0.9]} />
          <meshStandardMaterial color="#0b0e1f" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* counter top */}
        <mesh position={[0, 1.13, 0]}>
          <boxGeometry args={[9.2, 0.08, 1.05]} />
          <meshStandardMaterial color="#0d1224" metalness={0.9} roughness={0.2} emissive="#08263a" emissiveIntensity={0.6} />
        </mesh>
        <NeonStrip position={[0, 1.18, 0.53]} rotation={[-Math.PI / 2, 0, 0]} size={[9.2, 0.05]} color="#2dd4ff" />
      </group>

      {/* Distant skyline silhouette behind the wall for depth. */}
      <group position={[0, 0, -11]}>
        {SKYLINE.map(([x, h], i) => (
          <mesh key={i} position={[x, h / 2, 0]}>
            <boxGeometry args={[1.4, h, 1]} />
            <meshStandardMaterial color="#080a16" emissive={i % 2 ? '#142a5a' : '#2a1240'} emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/** [x, height] silhouettes for the background city. */
const SKYLINE: ReadonlyArray<readonly [number, number]> = [
  [-12, 7],
  [-9.5, 11],
  [-7, 6],
  [-4.5, 9],
  [4.5, 8],
  [7, 12],
  [9.5, 6.5],
  [12, 9.5],
];
