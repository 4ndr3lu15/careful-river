import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, XROrigin, useXR } from '@react-three/xr';
import { BAND, type PersonaInstrument } from '../band';
import { Environment } from './Environment';
import { Musician } from './Musician';
import { xrStore } from './xr-store';

interface StageProps {
  /** Instrument categories currently enabled (others render dimmed/idle). */
  activeInstruments: ReadonlySet<PersonaInstrument>;
  /** Toggle a persona on/off (fired by clicking the character). */
  onToggle: (instrument: PersonaInstrument) => void;
}

const XR_USER_POSITION: readonly [number, number, number] = [0, 0, 3.5];

export function Stage({ activeInstruments, onToggle }: StageProps) {
  return (
    <Canvas
      camera={{ position: [0, 2.6, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <XR store={xrStore}>
        <StageScene activeInstruments={activeInstruments} onToggle={onToggle} />
      </XR>
    </Canvas>
  );
}

function StageScene({ activeInstruments, onToggle }: StageProps) {
  const isPresenting = useXR((state) => state.session != null);

  return (
    <>
      <XROrigin position={XR_USER_POSITION} disabled={!isPresenting} />
      <Environment />
      {BAND.map((persona) => (
        <Musician
          key={persona.instrument}
          persona={persona}
          active={activeInstruments.has(persona.instrument)}
          onToggle={onToggle}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={16}
        maxPolarAngle={Math.PI / 2.05}
        enabled={!isPresenting}
        target={[0, 1, 0]}
      />
    </>
  );
}
