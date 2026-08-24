# MACSENSE Engine Reality Map

This file exists to keep the project direction locked and prevent drift into disconnected demos.

## Core product rule

MACSENSE should make the real engine work visible, testable, and usable. Visuals must correspond to real functions. No feature should be presented as complete unless it is wired to code, covered by checks, and has an honest boundary.

## North Star

Bring the existing Android/web engine DNA forward into the browser product:

- Genetic sound
- SoundGenome traits
- sound families
- lineage
- breeding
- resurrection
- evolution
- Flow Capture
- vocal scanner
- LUFS / true peak / mastering math
- Ari command proposals
- apply/reject mutations
- local project/audio persistence
- WAV/proof export
- Android/web/iOS parity path

## Existing real web modules

The web repo already contains production-relevant foundations:

- `web/src/audio-engine.js`
  - WebAudio context unlock
  - audio decode
  - track add/remove
  - volume, pan, mute, solo
  - play, pause, stop, seek
  - offline mix rendering at 48 kHz
  - buffer analysis for transient, harmonicity, brightness, dynamics, stereo width, confidence

- `web/src/domain.js`
  - SoundGenome shape
  - trait clamping
  - genome breeding
  - genome distance
  - project schema
  - sections, tracks, genomes, lineage, mastering defaults, Ari history

- `web/src/dsp.js`
  - K-weighting
  - integrated LUFS
  - true peak dBTP
  - buffer measurement
  - target normalization

- `web/src/ari.js`
  - Ari command parsing
  - Ari command stripping
  - gateway chat client
  - bounded command execution
  - set tempo
  - set track state
  - rewrite lyrics
  - reorder sections
  - set mastering preset
  - update effects
  - breed sounds
  - resurrect sound

- `web/src/recorder.js`
  - MediaRecorder Flow Capture
  - mic capture with echo cancellation, noise suppression, and auto gain disabled
  - stop/cancel lifecycle

- `web/src/persistence.js`
  - IndexedDB project storage
  - IndexedDB audio blob storage
  - project listing, loading, saving, deletion

- `web/src/wav.js`
  - WAV encoding
  - browser download helper

- `web/src/vocal-scanner.js`
  - Match Closely
  - Fit My Voice
  - Blend Styles
  - AutoTune speed
  - EQ values
  - compression values
  - reverb and delay values

## Current PR direction

PR #78 adds a repo-backed `web/src/proof-mode.js` and wires it into the real web studio. This is the first bridge from the hidden engine modules into a visible Vinny-facing proof surface.

## Next implementation sequence

1. Merge repo-backed proof mode after CI.
2. Deploy the repo-backed app, not a one-off static prototype.
3. Add Genetic Sound Families and Resurrection Lineage UI.
4. Add real browser automation smoke tests for proof mode:
   - open app
   - click Prove MacSense
   - verify status changes
   - verify Ari command proposal appears
   - verify set tempo applies
   - verify export button exists
   - verify upload path can decode a generated test WAV where CI supports browser media APIs
5. Add Android/web parity fixtures:
   - same sample buffer
   - expected genome trait range
   - expected LUFS range
   - expected true peak range
   - expected Ari command parse results
6. Only then return to cinematic polish.

## Visual rule

The visual system should look like the engine:

- genomes should look like living trait cards
- families should look like ancestry trees
- resurrection should look like a recovered artifact becoming a new child sound
- mastering should show before/after measurements
- Ari should show commands, not just chat text
- proof/export should create a tangible artifact

## Honest boundary

Do not claim the final DAW is complete until the following are implemented and tested:

- full multitrack timeline
- clip drag/edit
- true imported-track WAV bounce from user sessions
- robust browser automation on deployment
- cloud Ari auth and production gateway
- Android/web parity fixtures
- iOS/shared-core strategy
