# Legal Engine Pack

MacSense should use mature open-source engine ideas and permissive libraries without pretending someone else's product is ours. This file is a guardrail and an integration checklist.

## Rule

Do not obfuscate, hide, remove notices, or falsely rebrand third-party code. Use permissive components with attribution, or buy a commercial license where required.

## Preferred pack

| Candidate | Why it matters | License posture | MacSense role |
|---|---|---|---|
| AudioMass | Browser audio editor patterns: waveform editing, multitrack, clip drag, crossfade, recording, bounce | MIT candidate, notice required | Use as editor-lane reference or vendored component after notices are preserved |
| wavesurfer.js | Waveform and region model | BSD-3-Clause candidate, notice required | Use for waveform/region UI or keep our compatible region model |
| Tone.js | Transport, scheduling, synth/effects | MIT candidate, notice required | Upgrade beat engine, bar grid, instrument/effect preview |
| Meyda | Offline/realtime feature extraction | MIT candidate, notice required | Upgrade SoundGenome feature extraction |
| openDAW | Serious browser DAW architecture | AGPL/commercial | Research or commercial-license path only, not hidden in closed MacSense |

## Current PR implementation

This branch adds `web/src/legal-engine-pack.js`, which gives MacSense a local, testable integration surface:

- engine candidate registry
- permissive vs guarded classification
- clip lane primitives
- split / trim / move clip operations
- wavesurfer-style bar/region model
- Tone-style bar grid calculation
- Meyda-style enhanced feature extraction
- SoundGenome trait bridge
- bounce-plan proof export

The browser UI is in `web/src/legal-engine-pack-ui.js` and is loaded alongside Proof Mode, Genetic Families, and Bar-by-Bar Revision.

## Next integration passes

1. Replace the local waveform with wavesurfer.js or a vendored compatible wrapper after license notices are added.
2. Add AudioMass-derived editor features only through a clean vendoring step with MIT notices preserved.
3. Add Tone.js transport only if the repo gets a bundler/import-map path that CI validates.
4. Add Meyda if the dependency/bundle path is verified and the current native enhanced-feature bridge needs more depth.
5. Do not embed openDAW in closed production without AGPL compliance or a commercial license.
