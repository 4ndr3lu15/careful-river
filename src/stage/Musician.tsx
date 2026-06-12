/**
 * Musician — one futuristic persona on stage.
 *
 * Each persona is built from Three.js primitives (a shared humanoid base + a
 * role-specific instrument prop). The visual reaction to audio is unchanged in
 * spirit from the original box: a `NoteEvent` whose `instrument` matches this
 * persona schedules a "pulse" at `startTime - audioContext.currentTime`
 * (AGENTS.md rule 2), which drives both a scale pop and an emissive flash.
 *
 * Personas are toggleable: clicking the character calls `onToggle`. An inactive
 * persona is dimmed, does not pulse, and (via the composer) is left out of the
 * generated music.
 */
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Color, MeshStandardMaterial, type Group } from 'three';
import type { Persona } from '../band';
import type { NoteCustomEvent } from '../types';
import { audioContext, events } from '../musician';

interface MusicianProps {
  persona: Persona;
  active: boolean;
  onToggle: (instrument: Persona['instrument']) => void;
}

const PULSE_SCALE = 0.16;
const PULSE_DECAY = 5;
const EMISSIVE_IDLE = 0.55;
const EMISSIVE_FLASH = 2.6;
const EMISSIVE_DIM = 0.12;

export function Musician({ persona, active, onToggle }: MusicianProps) {
  const groupRef = useRef<Group | null>(null);
  const pulse = useRef(0);
  const [hovered, setHovered] = useState(false);

  // One emissive material shared by every glowing part of this persona, so a
  // hit flashes the whole character with a single property write per frame.
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#0a0d1c'),
        emissive: new Color(persona.accent),
        emissiveIntensity: EMISSIVE_IDLE,
        metalness: 0.6,
        roughness: 0.35,
        transparent: true,
        opacity: 1,
      }),
    [persona.accent],
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const timeouts = new Set<number>();
    const handler = (event: Event) => {
      const { detail } = event as NoteCustomEvent;
      if (detail.instrument !== persona.instrument) return;
      const delayMs = (detail.startTime - audioContext.currentTime) * 1000;
      const timeoutId = window.setTimeout(() => {
        pulse.current = 1;
      }, Math.max(0, delayMs));
      timeouts.add(timeoutId);
    };

    events.addEventListener('note', handler);
    return () => {
      events.removeEventListener('note', handler);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [persona.instrument]);

  useFrame((_, delta) => {
    if (!active) {
      pulse.current = 0;
      groupRef.current?.scale.setScalar(1);
      material.emissiveIntensity = EMISSIVE_DIM;
      material.opacity = 0.4;
      return;
    }

    pulse.current = Math.max(0, pulse.current - delta * PULSE_DECAY);
    const p = pulse.current;
    groupRef.current?.scale.setScalar(1 + PULSE_SCALE * p);
    material.opacity = 1;
    material.emissiveIntensity =
      (hovered ? EMISSIVE_IDLE + 0.4 : EMISSIVE_IDLE) +
      (EMISSIVE_FLASH - EMISSIVE_IDLE) * p;
  });

  const handleClick = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onToggle(persona.instrument);
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
    <group
      ref={groupRef}
      position={persona.position as [number, number, number]}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      <Humanoid material={material} />
      <RoleProp instrument={persona.instrument} material={material} />
      <StagePad accent={persona.accent} active={active} />

      <Text
        position={[0, 2.35, 0]}
        fontSize={0.3}
        color={active ? '#ffffff' : '#8a93c2'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#05060f"
      >
        {persona.name}
      </Text>
      {(hovered || !active) && (
        <Text
          position={[0, 2.02, 0]}
          fontSize={0.15}
          color={persona.accent}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#05060f"
        >
          {active ? persona.role : 'muted — click to enable'}
        </Text>
      )}
    </group>
  );
}

/** Shared robot body: tapered base, torso, head, optic visor. */
function Humanoid({ material }: { material: MeshStandardMaterial }) {
  return (
    <group>
      {/* base / hover skirt */}
      <mesh position={[0, 0.22, 0]} material={material}>
        <cylinderGeometry args={[0.5, 0.62, 0.44, 16]} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 0.95, 0]} material={material}>
        <cylinderGeometry args={[0.3, 0.38, 0.95, 14]} />
      </mesh>
      {/* shoulders */}
      <mesh position={[0, 1.42, 0]} material={material}>
        <boxGeometry args={[0.86, 0.18, 0.32]} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.72, 0]} material={material}>
        <sphereGeometry args={[0.22, 18, 18]} />
      </mesh>
      {/* visor — a bright additive bar across the eyes */}
      <mesh position={[0, 1.74, 0.19]}>
        <boxGeometry args={[0.26, 0.05, 0.04]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Instrument-specific silhouette that makes each persona recognisable. */
function RoleProp({
  instrument,
  material,
}: {
  instrument: Persona['instrument'];
  material: MeshStandardMaterial;
}) {
  switch (instrument) {
    case 'drums':
      return (
        <group>
          {/* two drum shells in front */}
          <mesh position={[-0.45, 0.6, 0.55]} rotation={[Math.PI / 2, 0, 0]} material={material}>
            <cylinderGeometry args={[0.32, 0.32, 0.4, 18]} />
          </mesh>
          <mesh position={[0.45, 0.6, 0.55]} rotation={[Math.PI / 2, 0, 0]} material={material}>
            <cylinderGeometry args={[0.28, 0.28, 0.36, 18]} />
          </mesh>
          {/* raised drumstick arms */}
          <mesh position={[-0.3, 1.3, 0.5]} rotation={[0.6, 0, 0.3]} material={material}>
            <boxGeometry args={[0.06, 0.6, 0.06]} />
          </mesh>
          <mesh position={[0.3, 1.3, 0.5]} rotation={[0.6, 0, -0.3]} material={material}>
            <boxGeometry args={[0.06, 0.6, 0.06]} />
          </mesh>
        </group>
      );
    case 'bass':
      return (
        <group>
          {/* arms wrapping a slung bass */}
          <mesh position={[0.1, 0.95, 0.55]} rotation={[0, 0, -0.5]} material={material}>
            <boxGeometry args={[0.18, 1.5, 0.12]} />
          </mesh>
          <mesh position={[-0.35, 0.55, 0.55]} material={material}>
            <boxGeometry args={[0.55, 0.7, 0.12]} />
          </mesh>
        </group>
      );
    case 'keys':
      return (
        <group>
          {/* a holographic keyboard slab at waist height */}
          <mesh position={[0, 0.92, 0.6]} rotation={[-0.35, 0, 0]} material={material}>
            <boxGeometry args={[1.2, 0.08, 0.45]} />
          </mesh>
          <mesh position={[0, 0.94, 0.61]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[1.12, 0.36]} />
            <meshBasicMaterial color="#39ff8b" transparent opacity={0.4} toneMapped={false} />
          </mesh>
          {/* stand */}
          <mesh position={[0, 0.5, 0.55]} material={material}>
            <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
          </mesh>
        </group>
      );
    case 'horns':
      return (
        <group>
          {/* a raised horn: tube + flared bell pointing up-forward */}
          <mesh position={[0.18, 1.35, 0.45]} rotation={[-0.7, 0, -0.2]} material={material}>
            <cylinderGeometry args={[0.05, 0.05, 0.7, 10]} />
          </mesh>
          <mesh position={[0.32, 1.7, 0.62]} rotation={[-0.7, 0, -0.2]} material={material}>
            <coneGeometry args={[0.26, 0.4, 18, 1, true]} />
          </mesh>
        </group>
      );
  }
}

/** A glowing ring on the floor under each persona. */
function StagePad({ accent, active }: { accent: string; active: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[0.62, 0.78, 40]} />
      <meshBasicMaterial
        color={accent}
        transparent
        opacity={active ? 0.85 : 0.18}
        toneMapped={false}
      />
    </mesh>
  );
}
