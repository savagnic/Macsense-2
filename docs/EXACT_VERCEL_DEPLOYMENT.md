# Exact Vercel Deployment Gate

This document closes the last known deployment-process gap: a green repo and a manually corrected Vercel file-payload deployment are useful, but the durable production path must deploy the checked-out `main` branch and then verify the live alias.

## What this adds

- `vercel.json` at the repository root so Vercel knows how to build and serve the `web/` app.
- `.github/workflows/vercel-production-deploy.yml` to deploy the exact checked-out repository to production on relevant `main` pushes or manual dispatch.
- `scripts/verify-live-release.mjs` to verify deployed output and production alias parity against `web/src/release-manifest.js`.

## Required GitHub secret

The workflow requires this secret:

```text
VERCEL_TOKEN
```

Do not put the token in source, chat, commit messages, or workflow logs. Store it only in GitHub Actions repository secrets.

## Project identifiers

The workflow pins the current Vercel project and team IDs:

```text
VERCEL_ORG_ID=team_R3kGWx1Hkh6WzkGlQ3tuc4h8
VERCEL_PROJECT_ID=prj_7tDd1wYNdz1qUYEThzvLAyPzlDpc
```

## Verification behavior

The verifier checks:

- root HTML returns `200`
- root HTML is not the stale v17 proof shell
- release shell markers are present
- feature markers are present across root and required module paths
- required module scripts are included
- every release manifest path returns `200`
- duplicate script imports are rejected
- the manifest boundary is preserved: a green repo is not the same as a verified live deployment

## Operating rule

A production release is not complete until all three are true:

1. Repo tests pass.
2. Vercel deploy from the checked-out repo succeeds.
3. The deployed URL and production alias pass `scripts/verify-live-release.mjs`.

## Current caveat

A manual Vercel file-payload deployment currently serves the production alias correctly. This gate makes the process durable so future `main` changes can deploy and verify the exact repository rather than relying on manual packaging.
