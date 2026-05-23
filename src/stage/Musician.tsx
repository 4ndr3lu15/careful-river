import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import type { NoteCustomEvent, NoteEvent } from '../types';
import { audioContext, events } from '../musician';

interface MusicianProps {
  label: string;
  color: string;
  position: readonly [number, number, number];
  instrument: NoteEvent['instrument'];
}

const PULSE_SCALE = 0.2;
const PULSE_DECAY = 6;

export function Musician({ label, color, position, instrument }: MusicianProps) {
  const groupRef = useRef<Group | null>(null);
  const pulse = useRef(0);

  useEffect(() => {
    const timeouts = new Set<number>();
    const handler = (event: Event) => {
      const { detail } = event as NoteCustomEvent;
      if (detail.instrument !== instrument) return;
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
  }, [instrument]);

  useFrame((_, delta) => {
    const next = Math.max(0, pulse.current - delta * PULSE_DECAY);
    if (next !== pulse.current) {
      pulse.current = next;
    }
    const scale = 1 + PULSE_SCALE * pulse.current;
    groupRef.current?.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, 1.25, 0]}
        fontSize={0.25}
        color="#111827"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}
