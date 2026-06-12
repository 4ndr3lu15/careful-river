import { useState } from 'react';
import { useXRSessionModeSupported } from '@react-three/xr';
import { xrStore } from './xr-store';

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
        className="btn"
        onClick={handleClick}
        disabled={disabled}
        title={title}
      >
        {label}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
