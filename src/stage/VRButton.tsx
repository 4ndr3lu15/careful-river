import { useState } from 'react';
import { useXRSessionModeSupported } from '@react-three/xr';
import { xrStore } from './xr-store';

const BUTTON_STYLE = {
  padding: '0.55rem 1.2rem',
  fontSize: '0.95rem',
  borderRadius: '999px',
  border: '1px solid #6e7781',
  background: '#f6f8fa',
  cursor: 'pointer',
} as const;

const DISABLED_STYLE = {
  ...BUTTON_STYLE,
  opacity: 0.6,
  cursor: 'not-allowed',
} as const;

export function VRButton() {
  const [error, setError] = useState<string | null>(null);
  const supported = useXRSessionModeSupported('immersive-vr', (err) =>
    console.error('[stage] VR support check failed:', err),
  );
  const disabled = supported !== true;
  const label =
    supported === undefined
      ? 'Checking VR...'
      : supported
        ? 'Enter VR'
        : 'VR Unavailable';
  const title =
    supported === false
      ? 'WebXR immersive-vr is not supported in this browser.'
      : supported === undefined
        ? 'Checking WebXR support...'
        : 'Enter VR';

  const handleClick = async () => {
    if (supported !== true) return;
    setError(null);
    try {
      await xrStore.enterVR();
    } catch (err) {
      console.error('[stage] enter VR failed:', err);
      setError('Unable to start VR session.');
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={title}
        style={disabled ? DISABLED_STYLE : BUTTON_STYLE}
      >
        {label}
      </button>
      {error ? (
        <p style={{ marginTop: '0.5rem', color: '#d1242f', fontSize: '0.85rem' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
