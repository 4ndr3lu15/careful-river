import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Floor } from './Floor';
import { Musician } from './Musician';

const musicians = [
  { label: 'Drums', color: '#ef4444', position: [-2.3, 0, -1] as const },
  { label: 'Bass', color: '#3b82f6', position: [-0.8, 0, 0] as const },
  { label: 'Keys', color: '#22c55e', position: [0.8, 0, 0] as const },
  { label: 'Horns', color: '#f59e0b', position: [2.3, 0, -1] as const },
];

export function Stage() {
  return (
    <Canvas
      camera={{ position: [0, 2.4, 6], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1} />
      <Floor />
      {musicians.map((musician) => (
        <Musician key={musician.label} {...musician} />
      ))}
      <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2} />
    </Canvas>
  );
}
