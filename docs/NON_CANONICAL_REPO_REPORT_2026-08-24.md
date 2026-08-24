# Non-Canonical MacSense Repo Report

Date: 2026-08-24
Status: working report, not a legal record, not a valuation report, not a promise of production readiness.

## Purpose

This report explains what happened in the MacSense repository, why the work became messy at points, what has now been merged, and what should happen next. It is intentionally plain-spoken. It is meant to keep the build aligned and stop the project from drifting back into disconnected demo work.

## Executive summary

MacSense has moved from a scattered proof/demo state into a repo-backed web studio with multiple engine surfaces wired into the real app shell:

- Commercial cinematic system briefing
- Proof Mode
- Genetic Sound Families
- Sound resurrection and evolution
- Bar-by-Bar Song Revision
- Legal Engine Pack primitives
- Audible Genetic Sound rendering
- Finish Mode export pack

The biggest remaining gap is live production verification. The repository now has more real product systems than the public URL has been proven to expose. The next work should focus on verified deployment, browser click-through, and connecting demo/export surfaces to active user session state.

## What got messed up

### 1. Demo island drift

Early public Vercel builds were useful for showing a direction, but some were disconnected from the real repo-backed app. That created the worst kind of product confusion: a URL could look alive while not proving that the actual app code had the newest engine work.

Corrective action taken:

- Shifted work back into GitHub PRs against `main`.
- Required modules to load from `web/index.html`.
- Added browser-smoke tests so new features cannot exist only as hidden code.

### 2. Hype before hard proof

Some earlier UI/copy pushed excitement harder than the underlying proof path. That made the app feel cheaper than the engine ambition.

Corrective action taken:

- PR #83 replaced hype-forward language with a commercial system briefing.
- Added `commercial-shell.js` as a product overview deck.
- Added smoke tests guarding against reintroducing some cheaper phrases.

### 3. Branch order and merge conflicts

A few branches were cut before previous PRs were merged. After squash merges, GitHub sometimes showed bloated diffs or conflicts because branch history carried old work again.

Corrective action taken:

- Closed conflicted or bloated PRs instead of forcing ugly merges.
- Recreated clean replacement branches from current `main`.
- Kept major PRs small and reviewable whenever possible.

Examples:

- PR #80 was superseded by clean PR #81.
- PR #84 was superseded by clean PR #85.

### 4. Visual polish was not enough

The user correctly called out that the public-facing experience still did not feel premium enough. A pretty shell without audible or exportable engine behavior is not enough.

Corrective action taken:

- Built commercial shell and cinematic briefing.
- Added audible Genetic Sound rendering.
- Added Finish Mode export pack so the app leaves the user with a deliverable artifact.

### 5. Integration surfaces were real but fragmented

The repo had audio engine, DSP, Ari, persistence, lyrics, SoundGenome, proof, and other modules, but the user experience could feel like separate panels rather than one product.

Corrective action taken:

- Added `commercial-shell.js` to describe the product as one platform.
- Added Finish Mode as a single commercial output path.

## What has landed in main

### PR #77: Web parity browser studio

Major browser studio foundation:

- WebAudio engine
- import/decode
- playback and render path
- local persistence direction
- Ari command path
- mastering/DSP direction
- cinematic and product shell foundation

### PR #78: Vinny Proof Mode

Made real engine work visible in the app:

- Proof Mode panel
- one-button product proof concept
- use of existing engine/DSP/Ari/persistence modules
- documentation guardrails

### PR #79: Genetic Sound Families

Added repo-backed genetic sound organization:

- family roots
- breeding
- resurrection
- evolution
- lineage events
- family UI
- browser-smoke coverage

### PR #81: Bar-by-Bar Song Revision Studio

Added the Vinny workflow:

- half-written song
- generated draft comparison
- bar-level rewrite/replace/keep/lock/needs-work
- assembled song output
- proof export direction

### PR #82: Legal Engine Pack

Added mature engine strategy without license contamination:

- permissive vs guarded engine registry
- clip/lane primitives
- split/trim/move operations
- regions and bar grid
- enhanced feature extraction bridge
- bounce-plan proof
- license guardrail doc

### PR #83: Commercial Cinematic Hardening

Raised the product surface:

- MacSense System Briefing
- commercial overview deck
- cleaner shell copy
- first-use cinematic hooks aligned to actual modules
- commercial hardening audit

### PR #85: Audible Genetic Sound Rendering

Made Genetic Sound hearable:

- synthetic genome audio generation
- child/resurrection/evolution audio preview rendering
- before/after metrics
- WAV byte export
- browser playback bridge
- smoke tests

### PR #86: Finish Mode Export Pack

Added the deliverable layer:

- session receipt
- lyrics sheet
- revision proof
- family tree receipt
- mastering report
- audible genetic proof
- optional WAV preview inclusion
- Finish Mode UI

## Where the repo is now

MacSense now has a coherent product spine:

```text
Commercial cinematic shell
→ Proof Mode
→ Bar-by-Bar Revision
→ Genetic Sound Families
→ Audible Genetic Sound
→ Finish Mode Export Pack
```

That is a much stronger foundation than the earlier disconnected demo state.

## What is still not production-hardened

### 1. Public deployment is not verified against latest main

The current public URL may not reflect the newest merged repo work. A server 200 alone is not enough. The live app must be checked for current module markers and actual user flows.

Needed:

- deploy current `main`
- verify URL response
- verify script/module markers
- verify service worker cache version
- verify UI modules load
- verify no old static shell is being served

### 2. Static smoke is not full browser click-through

Current smoke tests are useful, but not the same as a real browser clicking through user flows.

Needed:

- Playwright or equivalent browser E2E
- console error capture
- mobile viewport coverage
- audio unlock click
- Proof Mode flow
- Genetic Sound flow
- Bar Revision flow
- Finish Mode export flow

### 3. Finish Mode is not yet a true ZIP or cloud artifact

Finish Mode currently creates a JSON-based pack object and browser download helpers. The next pass should produce a real archive or cloud artifact record.

Needed:

- ZIP pack generation or backend artifact storage
- include rendered master WAV from WebAudioEngine
- connect to actual active project state
- persistent artifact metadata

### 4. Audible genetics still uses deterministic demo source first

PR #85 made genetics hearable, but the next serious upgrade is connecting the renderer to imported/recorded user audio blobs.

Needed:

- select a real track/source audio
- render parent vs child from actual audio
- save variant audio blob
- add variant to track lane
- export variant WAV in Finish Mode

### 5. Ari is gateway-ready but not fully production-authenticated end to end

The app has Ari client/command plumbing, but production auth and live gateway verification still need to be proven.

Needed:

- production gateway URL config
- token/env setup
- live `/v1/ari/chat` smoke with safe request
- command apply/reject verification

## Next steps

### PR #87: This report

Add this non-canonical report so the repository records the working history and next gates without pretending it is a final legal document.

### PR #88: Production verification and release checklist

Add a repo-backed release verification layer:

- deployment manifest
- live URL verification checklist
- browser E2E plan
- module marker list
- cache/version verification
- release gate doc
- optional test stubs for future Playwright work

### PR #89: Connect Finish Mode to active project state

Move Finish Mode from demo pack to real session pack:

- pull lyrics from active textarea/project
- include current revision session if available
- include current family tree
- include audible variant proof from actual rendered variant
- include WebAudioEngine master report

### PR #90: Real browser click-through

Add Playwright-style E2E once dependency/runtime path is confirmed:

- open studio
- force cinema
- skip/enter
- click Proof Mode
- create/render Genetic Sound variant
- create Finish Pack
- verify no console errors

## Operating rules going forward

1. No disconnected demo islands.
2. No feature claims unless code is wired into the real app.
3. No merge until CI is green.
4. No public-live claim until deployment is verified.
5. Keep PRs small enough to review.
6. Prefer clean replacement branches over conflict mud.
7. Make visuals reflect real engine state.
8. Every major workflow should leave proof or an export.

## Current build priority

The repo is now strong enough that the next highest-value work is not another flashy panel. It is verification and active-state connection:

1. Confirm latest `main` is live.
2. Add release verification docs/checks.
3. Add real browser click-through.
4. Connect Finish Mode to active project data.
5. Connect audible Genetic Sound to user imported/recorded audio.

That is how MacSense gets from impressive repo to expensive production web app.
