# SamCoach (PitchIQ)

Minimal, modular voice-coach client built on Deepgram Agent. This folder hosts a small React hook, an audio utility, and a thin UI wrapper. All files are kept under 400 lines for readability and easier maintenance.

## Files

- `useSamCoachAgent.ts`
  - React hook that manages the Deepgram Agent lifecycle (connect, configure, keepalive, cleanup).
  - Wires Web Audio (48 kHz) for mic capture and TTS playback.
  - Integrates with scoring via `useSamScoring`.
  - Emits collected product/service info via `onDataCollected` once the trigger phrase is detected.
- `audio.ts`
  - Audio helpers for 48 kHz playback and mic pumping using an AudioWorkletNode.
  - Proper Int16 → Float32 conversion and playback scheduling.
- `SamCoachAgent.tsx`
  - Thin UI wrapper that consumes the hook state and actions.

## Quick Start

```tsx
import SamCoachAgent from "./SamCoachAgent";

export default function OnboardingCoach() {
  return (
    <div>
      <SamCoachAgent onDataCollected={(d) => console.log("data:", d)} />
    </div>
  );
}
```

Or use the hook directly:

```tsx
import { useSamCoachAgent } from "./useSamCoachAgent";

function CoachCard() {
  const { connected, connecting, startSession, stopSession, transcript } = useSamCoachAgent({
    onDataCollected: (d) => {/* start persona generation */},
  });

  return (
    <div>
      <button disabled={connecting || connected} onClick={startSession}>Start</button>
      <button disabled={!connected} onClick={stopSession}>Stop</button>
      <div>{transcript}</div>
    </div>
  );
}
```

## Callbacks and State

- `onDataCollected(SamCoachDataPayload)`
  - Fired when the user provides a sufficiently detailed product/service description. Use this to kick off persona generation.
- `onConnectionStateChange({ connected, connecting })`
  - Observe connection state from the hook.

Returned state includes: `initializing`, `connected`, `connecting`, `sessionEnded`, `inactivityWarning`, `transcript`, `muted`, `isSessionActive` plus actions: `startSession`, `stopSession`, `restartSession`, `toggleMute`.

## Design Notes

- 48 kHz end-to-end for mic input and TTS playback to avoid resampling artifacts.
- Keepalive ping is sent periodically to prevent stale sockets.
- Inactivity timer warns at ~45s and auto-terminates at ~60s without speech.
- Scoring integration hooks (`useSamScoring`) track conversation updates.

## Stability Improvements

- Suppress benign Deepgram reconfigure errors:
  - The Deepgram SDK may emit `SETTINGS_ALREADY_APPLIED` when settings are re-sent unchanged. We ignore this in `WebSocketManager` to prevent unintended cleanup.
- Throttled prompt reconfigure:
  - `reconfigurePrompt()` now dedupes identical prompts and enforces a minimum interval between updates to avoid rapid reconfigure loops.
- No-op guards:
  - Persona/voice changes avoid sending reconfigure when values are unchanged; prompt still refreshes when persona context changes.

## Requirements

- Modern browser with Web Audio API and AudioWorklet support.
- Deepgram Web SDK token endpoint exposed at `/api/deepgram/token`.

## Brand/UI

- PitchIQ style: minimalist, bright accents (bold reds), rounded corners, trustworthy and friendly tone.
- Backgrounds slightly darker than cards/content; topmost elements (buttons) brightest.

## Maintenance

- Keep each file under ~400 lines; refactor if a file grows too large or complex.
- Prefer small, named helpers and clear logging for lifecycle events.
