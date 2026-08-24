import test from 'node:test';
import assert from 'node:assert/strict';
import { RELEASE_MANIFEST, validateReleaseShell, buildLiveVerificationPlan, summarizeVerificationResult } from '../src/release-manifest.js';

test('release manifest includes current production modules', () => {
  for (const modulePath of [
    './src/proof-mode.js',
    './src/sound-family-ui.js',
    './src/song-revision-ui.js',
    './src/legal-engine-pack-ui.js',
    './src/commercial-shell.js',
    './src/genetic-audio-render-ui.js',
    './src/finish-mode-ui.js'
  ]) {
    assert.ok(RELEASE_MANIFEST.requiredModules.includes(modulePath), `missing ${modulePath}`);
  }
  assert.ok(RELEASE_MANIFEST.currentBoundary.includes('verified live production'));
});

test('validates served shell markers and modules', () => {
  const html = `
    <title>MacSense AI — Production Studio</title>
    <span>MACSENSE SYSTEM BRIEFING</span>
    <main>PRODUCTION WORKSPACE</main>
    <section>FINISH MODE</section>
    ${RELEASE_MANIFEST.requiredModules.map(path => `<script type="module" src="${path}"></script>`).join('\n')}
  `;
  const result = validateReleaseShell(html);
  assert.equal(result.ok, true);
  assert.equal(result.missingModules.length, 0);
});

test('builds live verification plan and summarizes incomplete checks honestly', () => {
  const plan = buildLiveVerificationPlan({ url: 'https://macsense.example', commitSha: 'abc123' });
  assert.equal(plan.url, 'https://macsense.example');
  assert.ok(plan.checks.some(check => check.path === '/src/finish-mode-ui.js'));
  const summary = summarizeVerificationResult(plan, [
    { path: '/', status: 200, verified: true },
    { path: '/manifest.webmanifest', status: 200, verified: true }
  ]);
  assert.equal(summary.releaseReady, false);
  assert.ok(summary.failedChecks.length > 0);
});
