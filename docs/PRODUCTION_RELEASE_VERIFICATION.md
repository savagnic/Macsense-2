# Production Release Verification

This guide defines the difference between a green repository build and a verified live MacSense deployment.

## Rule

Do not say the public web app is production-current until the deployed URL has been checked against the release manifest and key user flows.

A `200` response is not enough. A static smoke test is not enough. A Vercel deployment marked ready is not enough by itself.

## Required repo gates

Before a release can be called production-current:

1. Web Studio CI must pass.
2. Main CI must pass.
3. Security scan must pass.
4. Combined production image must build.
5. Combined production container must boot.
6. The release manifest must include every current product module.
7. Browser-smoke checks must confirm the shell loads current modules.

## Required live URL checks

The live deployment must return `200` for:

- `/`
- `/manifest.webmanifest`
- `/src/app.js`
- `/src/proof-mode.js`
- `/src/sound-family-ui.js`
- `/src/song-revision-ui.js`
- `/src/legal-engine-pack-ui.js`
- `/src/commercial-shell.js`
- `/src/genetic-audio-render-ui.js`
- `/src/finish-mode-ui.js`

The root HTML must include:

- `MacSense AI — Production Studio`
- `MACSENSE SYSTEM BRIEFING`
- `PRODUCTION WORKSPACE`
- `FINISH MODE`
- all required module script tags from `web/src/release-manifest.js`

## Required user-flow checks

A real browser click-through should verify:

1. Open the production URL with `?cinema=1`.
2. Cinematic appears.
3. Enter Studio works.
4. Commercial deck is visible.
5. Proof Mode module is present.
6. Sound Families module is present.
7. Bar Revision module is present.
8. Legal Engine Pack module is present.
9. Audible Genetic Sound module is present.
10. Finish Mode module is present.
11. Render a genetic variant.
12. Build a Finish Pack.
13. Export/download does not throw.
14. No blocking console errors appear.
15. Mobile viewport does not hide critical controls.

## Current release manifest

The source of truth for verification markers is:

```text
web/src/release-manifest.js
```

That manifest intentionally states this boundary:

```text
A green repository build is not the same as a verified live production deployment.
```

## What this prevents

This release gate prevents the old failure mode where a public URL looked active but was actually serving an older static demo shell.

## Next hardening pass

After this guide and manifest land, the next hardening pass should add real Playwright browser click-through and/or a small CLI that checks a supplied production URL against `RELEASE_MANIFEST.liveVerificationPaths`.
