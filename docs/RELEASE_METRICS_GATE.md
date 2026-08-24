# Release Metrics Gate

This is the measurable production-readiness layer for MacSense. It is not a replacement for live browser testing, but it prevents the repo from claiming readiness without numbers.

## Why this exists

MacSense has passed through several stages where a public URL or a polished shell could look more complete than the actual wired product. The release metrics gate makes the repo answer a harder question:

> Does the production shell include the required systems, stay within budget, avoid duplicate subsystem loading, and expose the live verification paths we need to check after deployment?

## Metrics that matter now

| Metric | Target | Why it matters |
|---|---:|---|
| Required production module coverage | 100% | Confirms the real modules are loaded: Proof Mode, Sound Families, Bar Revision, Legal Engine Pack, Commercial Shell, Audible Genetic Sound, Finish Mode. |
| Commercial shell marker coverage | 100% | Confirms the expensive commercial shell and Finish Mode are present. |
| Feature marker coverage | 100% | Confirms the product story still exposes the systems users are buying across the full release surface, not only the initial HTML. |
| Live path coverage | 100% | Confirms every required deployment path has a check. |
| Duplicate module imports | 0 | Prevents double-loading UI systems and drifting state. |
| Initial HTML payload | <= 70 KB | Keeps the entry shell mobile-safe and prevents accidental huge inline bundles. |
| Script tag count | <= 24 | Keeps the no-bundler shell controlled until a bundler path is intentionally introduced. |
| Release score | 100/100 | Provides a single fail-fast score for repo shell readiness. |

## Customer edge metrics

PR #89 also adds a customer edge scorecard because release metrics alone do not tell us how MacSense wins.

| Edge dimension | Why it matters |
|---|---|
| Proof and accountability | Buyers need to leave with artifacts, not promises. |
| Sound genetics and lineage | This is the MacSense invention lane. |
| Bar-level writer control | This matches the half-written-song-to-finished-song workflow. |
| Audible variants | Genetics must be heard, not only shown. |
| Finish/export deliverables | Commercial products produce useful packages. |
| Guided customer usability | A premium product must guide a first-time user. |
| Verified live production | A green repo is not enough. The public URL must match the repo. |

## Competitive baseline lanes

The scorecard intentionally compares MacSense against the major lanes users already understand:

- Suno Studio: generative editing, chat-assisted creation, stems, section replacement, multitrack export.
- BandLab: browser/mobile creation, recording, mixing, AutoMix, mastering.
- Soundtrap: online collaboration, invitations, any-device creation.

The point is not to copy them. The point is to make the tests reveal where MacSense can win: SoundGenome, lineage, resurrection, bar-by-bar writer control, proof packs, and measurable release verification.

## Files added

- `web/src/release-metrics.js`
- `web/test/release-metrics.test.js`
- `web/src/customer-edge-scorecard.js`
- `web/test/customer-edge-scorecard.test.js`

## What the tests enforce

The tests intentionally cover both pass and fail behavior:

1. The current repo shell and required modules must score 100/100.
2. Removing a required module must fail.
3. Duplicating a module import must fail.
4. All release manifest paths must return `200` from a local static server.
5. The release metric report must preserve the boundary that a green repo build is not the same thing as verified live production.
6. Whole-system tests must cover first-run-to-proof, half-written song to finish, genetic sound audition, live URL verification, and mobile journey.
7. Competitive baselines must include Suno Studio, BandLab, and Soundtrap lanes.
8. The edge scorecard must expose usability and live deployment gaps instead of hiding them.

## Current boundary

Passing this gate means the repository shell is measurable and internally consistent. It does **not** prove the live public URL is current.

Before calling the app production-current, the operator still needs to verify the deployed URL against `web/src/release-manifest.js` and record browser click-through results for:

- System Briefing
- Proof Mode
- Bar-by-Bar Revision
- Sound Families
- Audible Genetic Sound
- Finish Mode export pack
- PWA manifest/service worker
- mobile viewport
- console/page errors

## Next step after this PR

Run live deployment verification against the production alias and record the result in a deployment note. If the alias serves an older static shell, do not call it live. Deploy or fix the alias first.
