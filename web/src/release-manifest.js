export const RELEASE_MANIFEST = {
  version: 'macsense-production-verification-v1',
  requiredShellMarkers: [
    'MacSense AI — Production Studio',
    'MACSENSE SYSTEM BRIEFING',
    'PRODUCTION WORKSPACE',
    'FINISH MODE'
  ],
  requiredModules: [
    './src/cinematic.js',
    './src/first-use-cinematics.js',
    './src/app.js',
    './src/vocal-scanner.js',
    './src/proof-mode.js',
    './src/sound-family-ui.js',
    './src/song-revision-ui.js',
    './src/legal-engine-pack-ui.js',
    './src/commercial-shell.js',
    './src/genetic-audio-render-ui.js',
    './src/finish-mode-ui.js'
  ],
  requiredFeatureMarkers: [
    'Proof Mode',
    'Sound Genetics',
    'Bar Revision',
    'Editor Engine Pack',
    'Audible Genetic Sound',
    'Finish Mode'
  ],
  liveVerificationPaths: [
    '/',
    '/manifest.webmanifest',
    '/src/app.js',
    '/src/proof-mode.js',
    '/src/sound-family-ui.js',
    '/src/song-revision-ui.js',
    '/src/legal-engine-pack-ui.js',
    '/src/commercial-shell.js',
    '/src/genetic-audio-render-ui.js',
    '/src/finish-mode-ui.js'
  ],
  releaseGates: [
    'Web Studio CI completed successfully',
    'Main CI completed successfully',
    'Production shell marker validation passed',
    'Combined production image built and booted',
    'Live URL verified against required modules',
    'No old static demo shell served from production alias',
    'Browser click-through smoke recorded or documented'
  ],
  currentBoundary: 'A green repository build is not the same as a verified live production deployment.'
};

export function validateReleaseShell(html = '') {
  const missingMarkers = RELEASE_MANIFEST.requiredShellMarkers.filter(marker => !html.includes(marker));
  const missingModules = RELEASE_MANIFEST.requiredModules.filter(modulePath => !html.includes(modulePath));
  return {
    ok: missingMarkers.length === 0 && missingModules.length === 0,
    missingMarkers,
    missingModules,
    expectedModules: RELEASE_MANIFEST.requiredModules.length
  };
}

export function buildLiveVerificationPlan({ url, commitSha = 'unknown', generatedAt = new Date().toISOString() } = {}) {
  if (!url) throw new Error('live URL is required for production verification');
  const base = url.replace(/\/+$/, '');
  return {
    version: RELEASE_MANIFEST.version,
    url: base,
    commitSha,
    generatedAt,
    checks: RELEASE_MANIFEST.liveVerificationPaths.map(path => ({
      path,
      url: `${base}${path}`,
      expectedStatus: 200,
      verified: false
    })),
    gates: RELEASE_MANIFEST.releaseGates.map(gate => ({ gate, passed: false })),
    boundary: RELEASE_MANIFEST.currentBoundary
  };
}

export function summarizeVerificationResult(plan, results = []) {
  const byPath = new Map(results.map(result => [result.path, result]));
  const checks = plan.checks.map(check => ({ ...check, ...(byPath.get(check.path) || {}) }));
  const failed = checks.filter(check => check.status !== 200 || check.verified === false);
  return {
    version: plan.version,
    url: plan.url,
    commitSha: plan.commitSha,
    totalChecks: checks.length,
    passedChecks: checks.length - failed.length,
    failedChecks: failed,
    releaseReady: failed.length === 0 && plan.gates.every(gate => gate.passed),
    checks,
    gates: plan.gates,
    boundary: plan.boundary
  };
}
