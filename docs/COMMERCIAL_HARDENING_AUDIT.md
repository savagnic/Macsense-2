# Commercial Hardening Audit

This audit reflects the current MacSense repository after Proof Mode, Genetic Sound Families, Bar-by-Bar Revision, and the Legal Engine Pack were merged into `main`.

## Repository areas reviewed

- Android/root production docs, distribution docs, hardening plans, and runbooks
- `web/index.html` studio shell
- `web/styles.css` visual system
- `web/src/app.js` studio runtime
- `web/src/audio-engine.js` and `web/src/dsp.js` engine/DSP foundation
- `web/src/ari.js` command gateway/client path
- `web/src/proof-mode.js` product proof surface
- `web/src/sound-family.js` and `web/src/sound-family-ui.js` genetic sound system
- `web/src/song-revision.js` and `web/src/song-revision-ui.js` bar-by-bar workflow
- `web/src/legal-engine-pack.js` and `web/src/legal-engine-pack-ui.js` editor engine surface
- `web/src/cinematic.js`, `web/src/cinematic-spec.js`, and first-use cinematic hooks
- web smoke tests and domain tests

## Three biggest commercial improvements

### 1. Make the first impression executive-grade

The app had real pieces wired, but the entrance and top-level copy still read like a prototype trying to prove it is exciting. This branch replaces that with a commercial system briefing: clear product promise, scene labels, progress rail, stronger visual rhythm, reduced cheesy language, and force modes for `?cinema=1`, `?tour=1`, and `?vinny=1`.

### 2. Turn stacked modules into one product story

MacSense now has Proof Mode, Sound Genetics, Bar Revision, Ari, and the Legal Engine Pack. The problem was not absence of features, it was presentation fragmentation. This branch adds a commercial overview deck that shows the wired systems as one production platform and gives clear entry points into proof mode, system briefing, and song revision.

### 3. Define the next finish path honestly

The repo has mastering, WAV export direction, local persistence, proof exports, genome lineage, bar revision, and clip/region/bounce planning. The next highest-value work is not more feature names. It is audible variant rendering, export packs, live deployment verification, and richer browser E2E. This branch labels the Finish Path as partial so we do not overstate production readiness.

## Cheesy or non-commercial copy removed/replaced

- `This is not a loop pack. This is a living studio.` became a direct system briefing.
- `dangerous version` was removed from the main shell copy.
- `Ari Awakening`/`Replay Pulse` language was replaced with `System Briefing`/`Replay Briefing`.
- The brand subheading was tightened from `CYBER-ORGANIC MUSIC SYSTEM` to `PRODUCTION SYSTEM` in the primary header.
- The footer now states the real cloud-sync boundary plainly.

## What this branch adds

- Commercial cinematic spec with labeled beats and coverage for current wired systems
- Upgraded cinematic runtime with progress rail, force routes, and calmer audio bed
- Commercial overview deck mounted in the production workspace
- First-use cinematic hooks aligned to current modules
- Smoke tests that verify the commercial shell, cinematic copy, and all major modules are still loaded
- Unit test for cinematic spec coverage

## Remaining highest-value work after this branch

1. Render audible Genetic Sound child/resurrection variants and export WAV proof.
2. Add Finish Mode export pack: WAV, lyrics sheet, revision proof, family tree, engine-pack bounce plan.
3. Verify and redeploy the repo-backed app to production, then run browser click-through testing against the live URL.
