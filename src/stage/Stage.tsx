import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, XROrigin, useXR } from '@react-three/xr';
import { stagePosition, type BandAgent } from '../band';
import { Environment } from './Environment';
import { Musician } from './Musician';
import { xrStore } from './xr-store';

interface StageProps {
  /** Current roster, left→right across the stage. */
  agents: readonly BandAgent[];
  /** Agent ids currently enabled (others render dimmed/idle). */
  activeAgentIds: ReadonlySet<string>;
  /** Toggle an agent on/off (fired by clicking the character). */
  onToggle: (agentId: string) => void;
}

const XR_USER_POSITION: readonly [number, number, number] = [0, 0, 3.5];

export function Stage({ agents, activeAgentIds, onToggle }: StageProps) {
  return (
    <Canvas
      camera={{ position: [0, 2.6, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <XR store={xrStore}>
        <StageScene agents={agents} activeAgentIds={activeAgentIds} onToggle={onToggle} />
      </XR>
    </Canvas>
  );
}

function StageScene({ agents, activeAgentIds, onToggle }: StageProps) {
  const isPresenting = useXR((state) => state.session != null);

  return (
    <>
      <XROrigin position={XR_USER_POSITION} disabled={!isPresenting} />
      <Environment />
      {agents.map((agent, index) => (
        <Musician
          key={agent.id}
          agent={agent}
          position={stagePosition(index, agents.length)}
          active={activeAgentIds.has(agent.id)}
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
