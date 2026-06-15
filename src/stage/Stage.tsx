import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, XROrigin, useXR } from '@react-three/xr';
import { stagePosition, type BandAgent } from '../band';
import { Environment } from './Environment';
import { Musician } from './Musician';
import { xrStore } from './xr-store';

interface StageProps {
  /** Agents currently on stage (the selected lineup), left→right. */
  agents: readonly BandAgent[];
  /** Agent ids whose part is muted (still rendered, dimmed, silent). */
  mutedAgentIds: ReadonlySet<string>;
  /** Left-click a character: toggle its part muted/live. */
  onMute: (agentId: string) => void;
  /** Right-click a character: open its info card. */
  onInfo: (agent: BandAgent) => void;
}

const XR_USER_POSITION: readonly [number, number, number] = [0, 0, 3.5];

export function Stage({ agents, mutedAgentIds, onMute, onInfo }: StageProps) {
  return (
    <Canvas
      camera={{ position: [0, 2.6, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <XR store={xrStore}>
        <StageScene
          agents={agents}
          mutedAgentIds={mutedAgentIds}
          onMute={onMute}
          onInfo={onInfo}
        />
      </XR>
    </Canvas>
  );
}

function StageScene({ agents, mutedAgentIds, onMute, onInfo }: StageProps) {
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
          muted={mutedAgentIds.has(agent.id)}
          onMute={onMute}
          onInfo={onInfo}
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
