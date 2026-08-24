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
| Feature marker coverage | 100% | Confirms the product story still exposes the systems users are buying. |
| Live path coverage | 100% | Confirms every required deployment path has a check. |
| Duplicate module imports | 0 | Prevents double-loading UI systems and drifting state. |
| Initial HTML payload | <= 70 KB | Keeps the entry shell mobile-safe and prevents accidental huge inline bundles. |
| Script tag count | <= 24 | Keeps the no-bundler shell controlled until a bundler path is intentionally introduced. |
| Release score | 100/100 | Provides a single fail-fast score for repo shell readiness. |

## Files added

- `web/src/release-metrics.js`
- `web/test/release-metrics.test.js`

## What the tests enforce

The tests intentionally cover both pass and fail behavior:

1. The current repo shell must score 100/100.
2. Removing a required module must fail.
3. Duplicating a module import must fail.
4. All release manifest paths must return `200` from a local static server.
5. The release metric report must preserve the boundary that a green repo build is not the same thing as verified live production.

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
