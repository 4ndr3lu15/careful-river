---
name: webxr-preflight
description: Pre-VR-test checklist. Walks through the small environmental + code checks that, when skipped, cause "the Enter VR button is grayed out" or "the demo crashes inside the Quest". Use before any VR test session — especially before the recorded demo for the paper.
---

# WebXR Preflight

When the user asks "is this ready for VR?", "before I put the headset on, …", "preflight", or is about to record the demo, run through this checklist and report PASS/FAIL with a one-line fix per FAIL.

## Inputs

None. The skill inspects the repo and the running dev server.

## Checks

### 1. HTTPS is on

```bash
curl -k -s -o /dev/null -w "%{http_code} %{scheme}\n" https://localhost:5173/
```

- **PASS** if it returns `200 https`.
- **FAIL** if connection refused → start `pnpm dev`.
- **FAIL** if HTTP only → `vite.config.ts` is missing `@vitejs/plugin-basic-ssl` or `https: false` is set.

### 2. The basic-ssl plugin (or mkcert) is wired up

Read `vite.config.ts`. Look for `basicSsl()` or `https: { cert, key }` referencing `.certs/`.

- **FAIL** if neither is present.

### 3. `audioContext.resume()` is gated on a user gesture

Grep for `audioContext.resume`. It must be called from a click/touch handler, not on mount.

- **FAIL** if it's in a `useEffect` without a user-interaction dependency.

### 4. OrbitControls is conditional on no XR session

```bash
grep -n "OrbitControls" src/stage/
```

The component must be rendered only when `store.session === undefined` (or equivalent). Both controls active at once will fight for input.

- **FAIL** if `<OrbitControls />` is rendered unconditionally inside the same Canvas that contains `<XR>`.

### 5. The clock is `audioContext.currentTime`

```bash
grep -nE "Date\\.now|performance\\.now" src/stage/ src/musician/
```

- **FAIL** if either appears in a scheduling path.

### 6. VR button availability is feature-detected

Grep for `navigator.xr` and `isSessionSupported('immersive-vr')`. The Enter VR button must be disabled when either is false.

- **FAIL** if the button is rendered without the guard.

### 7. The XR origin is positioned for "watching the band"

Confirm `<XROrigin position={[0, 0, 3]}>` (or similar) places the viewer ~3 m in front of the band, ~1.6 m tall. Adjust if the user is testing on a Quest with smaller play space.

- **WARN** if no origin is set — Quest will spawn the user inside the bass drum.

### 8. Loading state for Strudel samples

`musician.init()` may take 1–3 s on first load. The UI must show a loading state during this — otherwise the recorded demo opens with a blank canvas for a few seconds.

- **WARN** if no loading state is wired up.

### 9. The composer error pathway shows in VR

In VR, you can't see DevTools. Errors from `/api/compose` must surface in the scene (a textured plane with the error text) or at minimum in a HUD outside the headset before entering.

- **WARN** if errors are only `console.error`ed.

### 10. The Quest is reachable (when applicable)

If the user is about to deploy to a Quest:

```bash
adb devices
```

- **FAIL** if the headset is not listed → USB cable, debug mode, OEM driver (Windows).
- Hint: the dev server URL the Quest needs is `https://<your-LAN-IP>:5173/` not `localhost`. The basic-ssl cert covers `localhost` only by default; either accept the cert warning in the headset or generate a cert for the LAN IP.

## Output format

```
webxr-preflight
───────────────
[1/10]  HTTPS .................. PASS
[2/10]  basic-ssl wiring ....... PASS
[3/10]  audio gesture .......... FAIL  src/musician/index.ts:42 — audioContext.resume() in useEffect, move into the Play button onClick
[4/10]  orbit/XR coexist ....... PASS
[5/10]  clock .................. PASS
[6/10]  XR feature detect ...... WARN  src/app/VRButton.tsx:18 — no isSessionSupported check
[7/10]  XR origin .............. PASS
[8/10]  Strudel loading ........ WARN  no loading UI visible
[9/10]  VR error pathway ....... WARN  errors only via console.error
[10/10] Quest reachability ..... SKIP  (no -q flag passed)

Verdict: NOT READY (1 fail, 3 warn)
Fix the FAIL before testing in VR. Address WARNs before recording the demo.
```

## When to use this

- Before each VR test session.
- Always before recording the demo for the paper (`docs/publication-plan.md` → "Pre-submission checklist").
- After any change to `src/stage/`, `src/musician/`, or `vite.config.ts`.
