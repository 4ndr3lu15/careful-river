import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, XROrigin, useXR } from '@react-three/xr';
import type { NoteEvent } from '../types';
import { Floor } from './Floor';
import { Musician } from './Musician';
import { xrStore } from './xr-store';

const musicians: Array<{
  label: string;
  instrument: NoteEvent['instrument'];
  color: string;
  position: readonly [number, number, number];
}> = [
  {
    label: 'Drums',
    instrument: 'drums',
    color: '#ef4444',
    position: [-2.3, 0, -1] as const,
  },
  {
    label: 'Bass',
    instrument: 'bass',
    color: '#3b82f6',
    position: [-0.8, 0, 0] as const,
  },
  {
    label: 'Keys',
    instrument: 'keys',
    color: '#22c55e',
    position: [0.8, 0, 0] as const,
  },
  {
    label: 'Horns',
    instrument: 'horns',
    color: '#f59e0b',
    position: [2.3, 0, -1] as const,
  },
];

const XR_USER_POSITION: readonly [number, number, number] = [0, 0, 3];

export function Stage() {
  return (
    <Canvas
      camera={{ position: [0, 2.4, 6], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <XR store={xrStore}>
        <StageScene />
      </XR>
    </Canvas>
  );
}

function StageScene() {
  const isPresenting = useXR((state) => state.session != null);

  return (
    <>
      <XROrigin position={XR_USER_POSITION} disabled={!isPresenting} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1} />
      <Floor />
      {musicians.map((musician) => (
        <Musician key={musician.label} {...musician} />
      ))}
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        enabled={!isPresenting}
      />
    </>
  );
}
