import { createXRStore, type XRStore } from '@react-three/xr';

export const xrStore: XRStore = createXRStore({
  offerSession: false,
});
