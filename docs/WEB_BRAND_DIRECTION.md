# MACSENSE AI web brand direction

Status: approved by product owner in chat on 2026-08-23.

## North star

**One Mind. One Studio. Endless Possibilities.**

MacSense should feel like a premium browser-native music production system, not a web demo. The visual direction is dark, expensive, cinematic, and cyber-organic: a studio where sound has lineage, Ari feels present, and every feature feels like a serious creative instrument.

## Approved visual language

- Obsidian foundation: `#08080C`
- Carbon graphite panels: `#141A1F`
- Resonance gold: `#E5B869`
- Synapse cyan: `#00F5D4`
- Crimson danger / destructive action: `#FF3366`
- Deep teal / spectrum glow for Ari and analysis surfaces
- Thin gold borders, cyan signal lines, soft radial glows, waveform texture, and module cards
- No generic flat SaaS look
- No playful toy DAW aesthetic
- No default browser form styling where custom studio controls are possible

## Product presentation requirements

The web app must present these as first-class surfaces:

1. Cinematic Ari system intro
2. Vertical DAW
3. Flow Capture
4. Lyrics Studio
5. Ari co-producer dock
6. Sound Genetics
7. Breeding Chamber
8. Resurrection
9. Vocal Scanner
10. Arrangement
11. Mastering Suite
12. Export
13. Offline/local-first save state
14. Installable PWA shell

## Cinematic requirements

### Main intro

- Duration target: 180-240 seconds
- Current authored target: 210 seconds
- Must introduce the system, Ari, sound genetics, Flow Capture, lyrics, mastering, arrangement, resurrection, export, and local-first continuity
- Must support Skip, Enter Studio, and Replay
- Must not block use if audio autoplay fails

### First-use feature cinematics

Each major feature should have a 25-35 second first-use cinematic, keyed by feature id and saved in browser local state so it runs once per feature unless replayed.

Feature cinematic keys:

- `flow_capture`
- `vertical_daw`
- `lyrics_studio`
- `ari_coproducer`
- `sound_genetics`
- `breeding_chamber`
- `resurrection`
- `vocal_scanner`
- `arrangement`
- `mastering_suite`
- `export_master`

## Tone

Ari should feel like a real co-producer: present, opinionated, bounded, and useful. Ari can propose bold changes, but the user must always see the change before it mutates a project.

Preferred interaction pattern:

```text
Ari observes -> proposes -> shows command/diff -> user applies/rejects -> project mutates -> change is undoable
```

## Acceptance tests this direction implies

The web launch branch should not be considered ready unless tests verify:

- Approved brand tokens are present in the shell CSS
- Main cinematic duration is 180-240 seconds
- Every required first-use feature cinematic exists and is 25-35 seconds
- Every major feature has a visible entry point in the UI
- Ari command parsing remains fail-closed for unknown commands
- Ari changes remain proposed until explicitly applied
- SoundGenome traits match Android semantics
- Vocal Scanner presets match Android authored modes
- Offline app shell caches every active JS module used by the studio
