/**
 * Musician — one futuristic agent on stage.
 *
 * Each character is assembled at runtime from Three.js primitives (no asset
 * files, per AGENTS.md). Its *look* — shell colour, build, head silhouette,
 * height — comes from `deriveAppearance(agent)` (see `appearance.ts`, the seam
 * where user-designed assets will later plug in); this file only turns that
 * description into meshes and brings them to life.
 *
 * Two motion layers:
 *  - Ambient: a slow breathing bob, a gentle weight-shift sway, and a hovering
 *    base ring that idles continuously off the render clock. This is what makes
 *    the stage feel alive even between notes.
 *  - Beat-locked: a `NoteEvent` whose `instrument` matches this agent schedules
 *    a "pulse" at `startTime - audioContext.currentTime` (AGENTS.md rule 2),
 *    which flashes the emissive shell, blooms the chest core, pops the scale,
 *    and drives an instrument-specific arm gesture (a drummer strikes down, a
 *    horn player lifts the bell, keys press, the bassist plucks).
 *
 * Left-click toggles mute (`onMute`); right-click opens the info card
 * (`onInfo`). A muted agent is dimmed, still, and silent. Position comes from
 * the parent — only on-stage agents are rendered.
 */
import { Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Group,
  type Mesh,
} from 'three';
import type { BandAgent, PersonaInstrument } from '../band';
import type { NoteCustomEvent } from '../types';
import { audioContext, events } from '../musician';
import { deriveAppearance, type AgentAppearance, type HeadStyle } from './appearance';

interface MusicianProps {
  agent: BandAgent;
  position: readonly [number, number, number];
  muted: boolean;
  onMute: (agentId: string) => void;
  onInfo: (agent: BandAgent) => void;
}

const PULSE_SCALE = 0.14;
const PULSE_DECAY = 5;
const EMISSIVE_IDLE = 0.5;
const EMISSIVE_FLASH = 2.8;
const EMISSIVE_DIM = 0.1;

export function Musician({ agent, position, muted, onMute, onInfo }: MusicianProps) {
  const active = !muted;
  const look = useMemo(() => deriveAppearance(agent), [agent]);

  const groupRef = useRef<Group | null>(null);
  const baseRef = useRef<Group | null>(null);
  const leftArmRef = useRef<Group | null>(null);
  const rightArmRef = useRef<Group | null>(null);
  const coreRef = useRef<Mesh | null>(null);
  const pulse = useRef(0);
  const [hovered, setHovered] = useState(false);

  // One emissive shell material shared by every metal part, so a hit flashes
  // the whole body with a single property write per frame.
  const shell = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(look.shell),
        emissive: new Color(look.accent),
        emissiveIntensity: EMISSIVE_IDLE,
        metalness: look.metalness,
        roughness: look.roughness,
        transparent: true,
        opacity: 1,
      }),
    [look],
  );
  // The chest core + visor: unlit, tone-mapping-exempt so they read as light.
  const coreMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(look.core),
        transparent: true,
        opacity: 0.95,
        toneMapped: false,
      }),
    [look],
  );
  useEffect(
    () => () => {
      shell.dispose();
      coreMat.dispose();
    },
    [shell, coreMat],
  );

  useEffect(() => {
    const timeouts = new Set<number>();
    const handler = (event: Event) => {
      const { detail } = event as NoteCustomEvent;
      if (detail.instrument !== agent.instrument) return;
      const delayMs = (detail.startTime - audioContext.currentTime) * 1000;
      const id = window.setTimeout(() => {
        // A loud note hits harder; a soft one barely nudges.
        pulse.current = Math.min(1, 0.55 + (detail.velocity ?? 0.7) * 0.6);
      }, Math.max(0, delayMs));
      timeouts.add(id);
    };
    events.addEventListener('note', handler);
    return () => {
      events.removeEventListener('note', handler);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [agent.instrument]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const phase = look.seed * Math.PI * 2;

    // Hover ring drifts up/down and spins regardless of mute, so a dimmed
    // character still feels powered-down-but-on rather than frozen.
    if (baseRef.current) {
      baseRef.current.rotation.y += delta * (active ? 0.6 : 0.15);
      baseRef.current.position.y = 0.12 + Math.sin(t * 1.1 + phase) * 0.025;
    }

    if (!active) {
      pulse.current = 0;
      groupRef.current?.scale.setScalar(1);
      groupRef.current?.position.setY(0);
      shell.emissiveIntensity = EMISSIVE_DIM;
      shell.opacity = 0.45;
      coreMat.opacity = 0.12;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.15;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.15;
      return;
    }

    pulse.current = Math.max(0, pulse.current - delta * PULSE_DECAY);
    const p = pulse.current;

    // Ambient life: breathe (vertical bob) + shift weight (lean).
    const bob = Math.sin(t * 1.6 + phase) * 0.035;
    const sway = Math.sin(t * 0.7 + phase) * 0.04;
    if (groupRef.current) {
      groupRef.current.position.y = bob + p * 0.04;
      groupRef.current.rotation.z = sway * 0.4;
      groupRef.current.scale.setScalar(1 + PULSE_SCALE * p);
    }

    shell.opacity = 1;
    shell.emissiveIntensity =
      (hovered ? EMISSIVE_IDLE + 0.4 : EMISSIVE_IDLE) +
      (EMISSIVE_FLASH - EMISSIVE_IDLE) * p;

    if (coreRef.current) {
      const s = 1 + p * 0.6;
      coreRef.current.scale.setScalar(s);
      coreMat.opacity = 0.6 + p * 0.4;
    }

    animateArms(agent.instrument, leftArmRef.current, rightArmRef.current, p, t, look.seed);
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onMute(agent.id);
  };
  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    onInfo(agent);
  };
  const handleOver = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };
  const handleOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={position as [number, number, number]}>
      {/* Hovering base ring sits outside the breathing group so its spin and
          drift are independent of the body's pulse-scale. */}
      <HoverBase ref={baseRef} accent={look.accent} active={active} />

      <group
        ref={groupRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <Body
          look={look}
          shell={shell}
          coreMat={coreMat}
          coreRef={coreRef}
          leftArmRef={leftArmRef}
          rightArmRef={rightArmRef}
        />
        <RoleProp instrument={agent.instrument} shell={shell} coreMat={coreMat} />
      </group>

      <Text
        position={[0, 2.45 * look.heightScale, 0]}
        fontSize={0.3}
        color={active ? '#ffffff' : '#8a93c2'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#05060f"
      >
        {agent.name}
      </Text>
      {(hovered || !active) && (
        <Text
          position={[0, 2.14 * look.heightScale, 0]}
          fontSize={0.15}
          color={agent.accent}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#05060f"
        >
          {active ? agent.role : 'muted — click to un-mute'}
        </Text>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ body --- */

interface BodyProps {
  look: AgentAppearance;
  shell: MeshStandardMaterial;
  coreMat: MeshBasicMaterial;
  coreRef: RefObject<Mesh | null>;
  leftArmRef: RefObject<Group | null>;
  rightArmRef: RefObject<Group | null>;
}

/** The shared humanoid: pelvis → torso → glowing core → shoulders → head + arms. */
function Body({ look, shell, coreMat, coreRef, leftArmRef, rightArmRef }: BodyProps) {
  const H = look.heightScale;
  // Torso girth: slim (0) → bulky (1).
  const waist = 0.26 + look.build * 0.14;
  const chest = 0.3 + look.build * 0.18;
  const shoulderY = 1.4 * H;
  const shoulderX = chest + 0.14;

  return (
    <group>
      {/* hover skirt / lower body */}
      <mesh position={[0, 0.46 * H, 0]} material={shell}>
        <cylinderGeometry args={[waist * 1.05, chest * 1.35, 0.62 * H, 20]} />
      </mesh>
      {/* torso (smooth capsule) */}
      <mesh position={[0, 1.0 * H, 0]} material={shell}>
        <capsuleGeometry args={[chest, 0.6 * H, 8, 20]} />
      </mesh>
      {/* glowing chest core */}
      <mesh ref={coreRef} position={[0, 1.06 * H, chest * 0.82]} material={coreMat}>
        <sphereGeometry args={[0.1, 18, 18]} />
      </mesh>
      {/* shoulder yoke (capsule laid horizontal via the mesh) */}
      <mesh position={[0, shoulderY, 0]} rotation={[0, 0, Math.PI / 2]} material={shell}>
        <capsuleGeometry args={[0.12, shoulderX * 1.7, 6, 12]} />
      </mesh>
      {/* neck */}
      <mesh position={[0, shoulderY + 0.18, 0]} material={shell}>
        <cylinderGeometry args={[0.09, 0.11, 0.16, 12]} />
      </mesh>

      <Head style={look.head} y={shoulderY + 0.42} shell={shell} coreMat={coreMat} />

      <Arm ref={leftArmRef} side={-1} x={shoulderX} y={shoulderY} h={H} shell={shell} coreMat={coreMat} />
      <Arm ref={rightArmRef} side={1} x={shoulderX} y={shoulderY} h={H} shell={shell} coreMat={coreMat} />
    </group>
  );
}

/** One articulated arm, pivoting at the shoulder so gestures swing naturally. */
const Arm = ({
  ref,
  side,
  x,
  y,
  h,
  shell,
  coreMat,
}: {
  ref: RefObject<Group | null>;
  side: -1 | 1;
  x: number;
  y: number;
  h: number;
  shell: MeshStandardMaterial;
  coreMat: MeshBasicMaterial;
}) => {
  const len = 0.78 * h;
  return (
    <group ref={ref} position={[side * x, y, 0]} rotation={[-0.15, 0, side * 0.12]}>
      {/* upper + forearm as one tapered capsule hanging from the shoulder */}
      <mesh position={[0, -len / 2, 0]} material={shell}>
        <capsuleGeometry args={[0.07, len, 6, 10]} />
      </mesh>
      {/* glowing hand/knuckle */}
      <mesh position={[0, -len - 0.04, 0]} material={coreMat}>
        <sphereGeometry args={[0.07, 12, 12]} />
      </mesh>
    </group>
  );
};

/** Head silhouettes — the cheapest way to make a roster feel individual. */
function Head({
  style,
  y,
  shell,
  coreMat,
}: {
  style: HeadStyle;
  y: number;
  shell: MeshStandardMaterial;
  coreMat: MeshBasicMaterial;
}) {
  return (
    <group position={[0, y, 0]}>
      {style === 'orb' && (
        <mesh material={shell}>
          <sphereGeometry args={[0.22, 20, 20]} />
        </mesh>
      )}
      {style === 'dome' && (
        <mesh material={shell}>
          <capsuleGeometry args={[0.2, 0.12, 8, 16]} />
        </mesh>
      )}
      {style === 'crest' && (
        <group>
          <mesh material={shell}>
            <sphereGeometry args={[0.21, 20, 20]} />
          </mesh>
          {/* fin / mohawk crest */}
          <mesh position={[0, 0.18, 0]} material={coreMat}>
            <boxGeometry args={[0.03, 0.18, 0.24]} />
          </mesh>
        </group>
      )}
      {style === 'antenna' && (
        <group>
          <mesh material={shell}>
            <sphereGeometry args={[0.2, 20, 20]} />
          </mesh>
          <mesh position={[0.08, 0.26, 0]} rotation={[0, 0, -0.3]} material={shell}>
            <cylinderGeometry args={[0.012, 0.012, 0.26, 6]} />
          </mesh>
          <mesh position={[0.12, 0.4, 0]} material={coreMat}>
            <sphereGeometry args={[0.035, 10, 10]} />
          </mesh>
        </group>
      )}
      {/* visor — a bright additive bar across the eyes, on every head */}
      <mesh position={[0, 0.02, 0.19]} material={coreMat}>
        <boxGeometry args={[0.28, 0.05, 0.04]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------- animation --- */

/** Per-instrument arm choreography driven by the current pulse `p` and clock. */
function animateArms(
  instrument: PersonaInstrument,
  left: Group | null,
  right: Group | null,
  p: number,
  t: number,
  seed: number,
) {
  if (!left || !right) return;
  const tremor = Math.sin(t * 9 + seed * 6) * 0.04;

  switch (instrument) {
    case 'drums': {
      // both arms reach forward and strike down on the hit, slightly offset
      left.rotation.x = -1.0 - p * 0.6;
      right.rotation.x = -1.0 - p * 0.45;
      left.rotation.z = 0.2;
      right.rotation.z = -0.2;
      break;
    }
    case 'bass': {
      // left hand up on the neck, right hand plucks with the pulse
      left.rotation.x = -0.7;
      left.rotation.z = 0.5;
      right.rotation.x = -0.55 - p * 0.3 + tremor;
      right.rotation.z = -0.25;
      break;
    }
    case 'keys': {
      // both hands hover over the slab and press down on the hit
      left.rotation.x = -0.95 - p * 0.25;
      right.rotation.x = -0.95 - p * 0.25;
      left.rotation.z = 0.18;
      right.rotation.z = -0.18;
      break;
    }
    case 'horns': {
      // arms lifted holding the horn up; the bell trembles as it sounds
      left.rotation.x = -1.15 + tremor * p * 6;
      right.rotation.x = -1.25 + tremor * p * 6;
      left.rotation.z = 0.28;
      right.rotation.z = -0.18;
      break;
    }
  }
}

/* ----------------------------------------------------------------- props --- */

/** Instrument-specific silhouette that makes each agent recognisable. */
function RoleProp({
  instrument,
  shell,
  coreMat,
}: {
  instrument: PersonaInstrument;
  shell: MeshStandardMaterial;
  coreMat: MeshBasicMaterial;
}) {
  switch (instrument) {
    case 'drums':
      return (
        <group>
          {/* two drum shells angled toward the player */}
          <mesh position={[-0.5, 0.62, 0.6]} rotation={[Math.PI / 2.3, 0, 0]} material={shell}>
            <cylinderGeometry args={[0.33, 0.33, 0.42, 22]} />
          </mesh>
          <mesh position={[0.5, 0.6, 0.62]} rotation={[Math.PI / 2.3, 0, 0]} material={shell}>
            <cylinderGeometry args={[0.28, 0.28, 0.38, 22]} />
          </mesh>
          {/* glowing drum heads */}
          <mesh position={[-0.5, 0.83, 0.6]} rotation={[-Math.PI / 2.3, 0, 0]} material={coreMat}>
            <circleGeometry args={[0.31, 22]} />
          </mesh>
          {/* a ride cymbal on a thin stand */}
          <mesh position={[0.78, 1.18, 0.35]} rotation={[0.5, 0, 0.2]} material={shell}>
            <cylinderGeometry args={[0.26, 0.26, 0.02, 24]} />
          </mesh>
          <mesh position={[0.78, 0.7, 0.35]} material={shell}>
            <cylinderGeometry args={[0.02, 0.02, 0.95, 6]} />
          </mesh>
        </group>
      );
    case 'bass':
      return (
        <group>
          {/* slung bass: neck up-left, body down-right */}
          <mesh position={[0.18, 1.05, 0.5]} rotation={[0, 0, -0.6]} material={shell}>
            <boxGeometry args={[0.12, 1.4, 0.08]} />
          </mesh>
          <mesh position={[-0.34, 0.5, 0.52]} rotation={[Math.PI / 2, 0, -0.6]} material={shell}>
            <capsuleGeometry args={[0.26, 0.34, 6, 16]} />
          </mesh>
          {/* glowing string line down the neck */}
          <mesh position={[0.0, 0.78, 0.56]} rotation={[0, 0, -0.6]} material={coreMat}>
            <boxGeometry args={[0.015, 1.5, 0.01]} />
          </mesh>
        </group>
      );
    case 'keys':
      return (
        <group>
          {/* keyboard slab on a stand at waist height */}
          <mesh position={[0, 0.96, 0.62]} rotation={[-0.32, 0, 0]} material={shell}>
            <boxGeometry args={[1.25, 0.1, 0.46]} />
          </mesh>
          {/* glowing key strip */}
          <mesh position={[0, 1.0, 0.64]} rotation={[-0.32, 0, 0]} material={coreMat}>
            <planeGeometry args={[1.16, 0.36]} />
          </mesh>
          {/* twin stand legs */}
          <mesh position={[-0.4, 0.5, 0.56]} material={shell}>
            <cylinderGeometry args={[0.03, 0.03, 0.78, 8]} />
          </mesh>
          <mesh position={[0.4, 0.5, 0.56]} material={shell}>
            <cylinderGeometry args={[0.03, 0.03, 0.78, 8]} />
          </mesh>
        </group>
      );
    case 'horns':
      return (
        <group>
          {/* a raised horn: tube + flared bell pointing up-forward */}
          <mesh position={[0.16, 1.32, 0.5]} rotation={[-0.75, 0, -0.18]} material={shell}>
            <cylinderGeometry args={[0.05, 0.05, 0.75, 12]} />
          </mesh>
          <mesh position={[0.32, 1.74, 0.7]} rotation={[-0.75, 0, -0.18]} material={shell}>
            <coneGeometry args={[0.27, 0.42, 20, 1, true]} />
          </mesh>
          {/* glow inside the bell */}
          <mesh position={[0.34, 1.78, 0.74]} rotation={[-0.75, 0, -0.18]} material={coreMat}>
            <circleGeometry args={[0.22, 20]} />
          </mesh>
        </group>
      );
  }
}

/* ------------------------------------------------------------- hover base -- */

/** A glowing, slowly spinning halo ring + inner disc under each character. */
const HoverBase = ({
  ref,
  accent,
  active,
}: {
  ref: RefObject<Group | null>;
  accent: string;
  active: boolean;
}) => {
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({ color: new Color(accent), transparent: true, toneMapped: false }),
    [accent],
  );
  useEffect(() => () => ringMat.dispose(), [ringMat]);
  ringMat.opacity = active ? 0.9 : 0.18;

  return (
    <group ref={ref} position={[0, 0.12, 0]}>
      {/* thin halo ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[0.6, 0.74, 48]} />
      </mesh>
      {/* a few orbiting tick marks for a techy read */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.84, 0, Math.sin(a) * 0.84]} material={ringMat}>
            <boxGeometry args={[0.05, 0.01, 0.12]} />
          </mesh>
        );
      })}
    </group>
  );
};
