import { Text } from '@react-three/drei';

interface MusicianProps {
  label: string;
  color: string;
  position: readonly [number, number, number];
}

export function Musician({ label, color, position }: MusicianProps) {
  return (
    <group position={position}>
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
