/**
 * Environment — the Resonance Chamber.
 *
 * Not a room: a stage suspended in a virtual void, where futuristic AI agents
 * conjure electro-jazz. Built entirely from Three.js primitives + drei helpers
 * (no asset files, per AGENTS.md); "glow" is faked with emissive materials and
 * additive geometry rather than a bloom pass, to stay cheap on Quest/Wolvic.
 *
 * Every element is chosen to *mean* something, so the abstraction still reads:
 *
 *   - Composer Core  — a faceted light hovering above the band: the generative
 *                      muse the music descends from (literally the composer
 *                      agent). Its beams reach down to each player.
 *   - Orbit Rings    — tilted, slowly gyrating halos around the stage: the
 *                      groove and harmony, the rigid electro pulse holding time.
 *   - Aurora Ribbons — flowing arcs overhead: melody and jazz improvisation,
 *                      warm and unpredictable curves over the cool machinery.
 *   - Reed Ring      — a circle of luminous frequency reeds breathing like a
 *                      spectrum analyser: the sound itself, made visible.
 *   - Dais + grid    — the virtual stage and its dance-floor, the one solid
 *                      footing in an otherwise infinite, star-dusted void.
 */
import { Grid, Sparkles, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';

const BG = '#04050d';

/** The chamber's recurring hues — warm jazz ambers over cool electro blues. */
const NEON = {
  pink: '#ff2d6f',
  cyan: '#2dd4ff',
  violet: '#9b6bff',
  green: '#39ff8b',
  amber: '#ffb454',
} as const;

/** Gradient round the reed ring: cool → warm → cool, so it never reads flat. */
const REED_COLORS = [NEON.cyan, NEON.violet, NEON.pink, NEON.amber, NEON.green];

/**
 * Composer Core — the generative muse hovering over the band. A faceted crystal
 * of light that slowly turns and breathes, wrapped in a wire halo, casting a
 * warm key light down onto the stage. The narrative source of the music.
 */
function ComposerCore() {
  const ref = useRef<Group | null>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.15;
    ref.current.rotation.x = Math.sin(t * 0.3) * 0.15;
    ref.current.position.y = 7.6 + Math.sin(t * 0.6) * 0.18;
  });
  return (
    <group ref={ref} position={[0, 7.6, -0.4]}>
      {/* solid faceted heart */}
      <mesh>
        <icosahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color="#1a1030"
          emissive={NEON.violet}
          emissiveIntensity={1.6}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
      {/* wire halo a touch larger, additive so it reads as pure light */}
      <mesh scale={1.35}>
        <icosahedronGeometry args={[0.7, 1]} />
        <meshBasicMaterial
          color={NEON.cyan}
          wireframe
          transparent
          opacity={0.5}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight intensity={22} distance={26} color={NEON.amber} />
      <pointLight intensity={10} distance={20} color={NEON.violet} />
    </group>
  );
}

/**
 * A volumetric-looking beam from the core down to the stage — a translucent
 * additive cone that sways like a moving head on a lighting rig.
 */
function Beam({ x, color, phase }: { x: number; color: string; phase: number }) {
  const ref = useRef<Mesh | null>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4 + phase) * 0.14;
  });
  return (
    <group position={[x, 7.0, -0.4]}>
      <mesh ref={ref} position={[0, -3.4, 0]}>
        <coneGeometry args={[2.1, 7.0, 28, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05}
          blending={AdditiveBlending}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Orbit Rings — tilted halos gyrating around the stage at different speeds and
 * axes, like a gyroscope or an atom's shells: the groove keeping time, the
 * electro precision the jazz floats over.
 */
function OrbitRings() {
  const refs = [useRef<Group>(null), useRef<Group>(null), useRef<Group>(null)];
  const rings = [
    { r: 6.2, tube: 0.05, color: NEON.cyan, tilt: [Math.PI / 2.3, 0, 0], speed: 0.18 },
    { r: 7.4, tube: 0.04, color: NEON.violet, tilt: [Math.PI / 2.6, 0, 0.5], speed: -0.12 },
    { r: 8.6, tube: 0.03, color: NEON.amber, tilt: [Math.PI / 2.1, 0.4, 0], speed: 0.08 },
  ] as const;
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.forEach((ref, i) => {
      if (ref.current) ref.current.rotation.z = t * rings[i].speed;
    });
  });
  return (
    <>
      {rings.map((ring, i) => (
        <group key={i} rotation={ring.tilt as [number, number, number]} position={[0, 1.4, -0.4]}>
          <group ref={refs[i]}>
            <mesh>
              <torusGeometry args={[ring.r, ring.tube, 12, 96]} />
              <meshBasicMaterial
                color={ring.color}
                transparent
                opacity={0.6}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
            {/* a bright travelling node bead on each ring */}
            <mesh position={[ring.r, 0, 0]}>
              <sphereGeometry args={[ring.tube * 3, 12, 12]} />
              <meshBasicMaterial color={ring.color} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

/**
 * Aurora Ribbons — wide flat arcs sweeping over the stage (vertical ring
 * segments). They drift in brightness and rotate gently, the way a saxophone
 * line wanders: melody and improvisation draped over the rigid rings.
 */
function AuroraRibbons() {
  const mats = [useRef<MeshBasicMaterial>(null), useRef<MeshBasicMaterial>(null), useRef<MeshBasicMaterial>(null)];
  const ribbons = [
    { inner: 9.5, outer: 10.4, color: NEON.violet, tilt: [0, 0, 0.2], y: 0.5 },
    { inner: 8.2, outer: 8.8, color: NEON.pink, tilt: [0, 0.6, -0.15], y: 0.8 },
    { inner: 11.0, outer: 11.7, color: NEON.cyan, tilt: [0, -0.5, 0.1], y: 0.2 },
  ] as const;
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    mats.forEach((m, i) => {
      if (m.current) m.current.opacity = 0.18 + (Math.sin(t * 0.5 + i * 2) * 0.5 + 0.5) * 0.32;
    });
  });
  return (
    <>
      {ribbons.map((rb, i) => (
        <mesh key={i} rotation={rb.tilt as [number, number, number]} position={[0, rb.y, -0.4]}>
          {/* a vertical half-annulus = a flat ribbon arching overhead */}
          <ringGeometry args={[rb.inner, rb.outer, 96, 1, Math.PI * 0.12, Math.PI * 0.76]} />
          <meshBasicMaterial
            ref={mats[i]}
            color={rb.color}
            transparent
            opacity={0.3}
            blending={AdditiveBlending}
            side={DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/**
 * Reed Ring — a circle of slender light reeds enclosing the stage, each
 * breathing on its own phase like a spectrum analyser at rest: the sound of the
 * room made visible, and a soft horizon that hugs the band without walling it
 * in.
 */
function ReedRing() {
  const COUNT = 40;
  const RADIUS = 11;
  const refs = useRef<(Mesh | null)[]>([]);
  const reeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const a = (i / COUNT) * Math.PI * 2;
        return {
          x: Math.cos(a) * RADIUS,
          z: Math.sin(a) * RADIUS - 0.4,
          color: REED_COLORS[i % REED_COLORS.length],
          phase: (i / COUNT) * Math.PI * 4,
        };
      }),
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      // layered sines → a gentle, never-repeating equaliser shimmer
      const h = 0.6 + (Math.sin(t * 1.3 + reeds[i].phase) + Math.sin(t * 0.7 + i)) * 0.25 + 0.5;
      m.scale.y = h;
      m.position.y = (h * 3) / 2;
    });
  });
  return (
    <>
      {reeds.map((reed, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[reed.x, 1.5, reed.z]}
        >
          <boxGeometry args={[0.12, 3, 0.12]} />
          <meshBasicMaterial color={reed.color} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

export function Environment() {
  return (
    <>
      {/* Infinite virtual void: black space, atmospheric fade, drifting stars. */}
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 11, 40]} />
      <Stars radius={70} depth={50} count={1800} factor={3.4} saturation={0} fade speed={0.4} />

      {/* Lighting: dim base + coloured mood lights washing the stage. */}
      <ambientLight intensity={0.24} />
      <hemisphereLight args={['#2a3a8a', '#0a0010', 0.4]} />
      <directionalLight position={[3, 8, 4]} intensity={0.4} color="#9fc7ff" />
      <pointLight position={[-5, 3, 2]} intensity={22} distance={22} color={NEON.pink} />
      <pointLight position={[5, 3, 2]} intensity={22} distance={22} color={NEON.cyan} />
      <pointLight position={[0, 2, 6]} intensity={9} distance={18} color={NEON.green} />

      {/* The generative muse above, and its beams reaching each player. */}
      <ComposerCore />
      <Beam x={-3.2} color={NEON.pink} phase={0} />
      <Beam x={0} color={NEON.amber} phase={2.1} />
      <Beam x={3.2} color={NEON.cyan} phase={4.2} />

      {/* Symbolic architecture of the sound. */}
      <OrbitRings />
      <AuroraRibbons />
      <ReedRing />

      {/* Floating dust catching the light — two layers for depth. */}
      <Sparkles count={70} scale={[16, 7, 12]} position={[0, 3, -0.4]} size={2} speed={0.22} color={NEON.cyan} opacity={0.5} />
      <Sparkles count={36} scale={[10, 3, 8]} position={[0, 1.4, 0]} size={3} speed={0.14} color={NEON.amber} opacity={0.45} />

      {/* Virtual dance-floor grid fading into the void. */}
      <Grid
        args={[40, 40]}
        position={[0, 0.001, 0]}
        cellSize={0.7}
        cellThickness={0.7}
        cellColor="#15306b"
        sectionSize={3.5}
        sectionThickness={1.3}
        sectionColor={NEON.cyan}
        fadeDistance={28}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid
      />
      {/* Dark reflective-looking slab under the grid. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#04050d" metalness={0.9} roughness={0.28} />
      </mesh>

      {/* The performance dais the band stands on, floating in the grid. */}
      <group position={[0, 0, -0.4]}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[5.4, 5.7, 0.12, 72]} />
          <meshStandardMaterial color="#070a16" metalness={0.85} roughness={0.22} />
        </mesh>
        {/* twin neon rims just proud of the dais edge */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
          <ringGeometry args={[5.18, 5.42, 96]} />
          <meshBasicMaterial color={NEON.violet} transparent opacity={0.85} side={DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
          <ringGeometry args={[3.0, 3.12, 96]} />
          <meshBasicMaterial color={NEON.cyan} transparent opacity={0.4} side={DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}
