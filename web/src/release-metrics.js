import { RELEASE_MANIFEST, validateReleaseShell } from './release-manifest.js';

export const RELEASE_METRIC_THRESHOLDS = Object.freeze({
  requiredModuleCoverage: 1,
  requiredShellMarkerCoverage: 1,
  requiredFeatureMarkerCoverage: 1,
  livePathCoverage: 1,
  duplicateModuleImports: 0,
  maxHtmlBytes: 70000,
  maxScriptTags: 24,
  minReleaseScore: 100,
  maxMissingModules: 0,
  maxMissingShellMarkers: 0,
  maxMissingFeatureMarkers: 0
});

export const MEANINGFUL_RELEASE_METRICS = Object.freeze([
  {
    id: 'moduleCoverage',
    label: 'Required production module coverage',
    why: 'Proves the served shell includes the real MacSense product modules, not an older demo island.',
    target: '100%'
  },
  {
    id: 'shellMarkerCoverage',
    label: 'Commercial shell marker coverage',
    why: 'Proves the premium/commercial shell, System Briefing, workspace, and Finish Mode are present.',
    target: '100%'
  },
  {
    id: 'featureMarkerCoverage',
    label: 'Feature story coverage',
    why: 'Proves the release surface names the key systems users are paying for, even when those markers live in imported modules.',
    target: '100%'
  },
  {
    id: 'livePathCoverage',
    label: 'Live asset path coverage',
    why: 'Proves every required live deployment path has a corresponding release check.',
    target: '100%'
  },
  {
    id: 'payloadBudget',
    label: 'Initial HTML payload budget',
    why: 'Keeps the entry shell lean enough for mobile and prevents accidental giant inline bundles.',
    target: '<= 70 KB'
  },
  {
    id: 'duplicateModuleImports',
    label: 'Duplicate module import count',
    why: 'Prevents the same subsystem from being loaded twice and causing hard-to-debug UI drift.',
    target: '0'
  },
  {
    id: 'releaseScore',
    label: 'Release readiness score',
    why: 'Combines coverage, payload, duplication, and live-plan completeness into one fail-fast number.',
    target: '100/100'
  }
]);

export function measureReleaseShell(html = '', manifest = RELEASE_MANIFEST, thresholds = RELEASE_METRIC_THRESHOLDS, options = {}) {
  const releaseSurfaceText = options.releaseSurfaceText || html;
  const payloadText = options.payloadText || html;
  const shell = validateReleaseShell(html);
  const importedModules = extractModuleImports(html);
  const duplicateModuleImports = importedModules.filter((modulePath, index) => importedModules.indexOf(modulePath) !== index);
  const missingFeatureMarkers = manifest.requiredFeatureMarkers.filter(marker => !releaseSurfaceText.includes(marker));
  const htmlBytes = byteLength(payloadText);
  const releaseSurfaceBytes = byteLength(releaseSurfaceText);
  const scriptTagCount = countMatches(html, /<script\b/gi);
  const moduleCoverage = ratio(manifest.requiredModules.length - shell.missingModules.length, manifest.requiredModules.length);
  const shellMarkerCoverage = ratio(manifest.requiredShellMarkers.length - shell.missingMarkers.length, manifest.requiredShellMarkers.length);
  const featureMarkerCoverage = ratio(manifest.requiredFeatureMarkers.length - missingFeatureMarkers.length, manifest.requiredFeatureMarkers.length);
  const livePathCoverage = ratio(unique(manifest.liveVerificationPaths).length, manifest.liveVerificationPaths.length);
  const checks = [
    moduleCoverage >= thresholds.requiredModuleCoverage,
    shellMarkerCoverage >= thresholds.requiredShellMarkerCoverage,
    featureMarkerCoverage >= thresholds.requiredFeatureMarkerCoverage,
    livePathCoverage >= thresholds.livePathCoverage,
    duplicateModuleImports.length <= thresholds.duplicateModuleImports,
    htmlBytes <= thresholds.maxHtmlBytes,
    scriptTagCount <= thresholds.maxScriptTags,
    shell.missingModules.length <= thresholds.maxMissingModules,
    shell.missingMarkers.length <= thresholds.maxMissingShellMarkers,
    missingFeatureMarkers.length <= thresholds.maxMissingFeatureMarkers
  ];
  const releaseScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const metrics = {
    version: 'macsense-release-metrics-v1',
    ok: checks.every(Boolean) && releaseScore >= thresholds.minReleaseScore,
    releaseScore,
    moduleCoverage,
    shellMarkerCoverage,
    featureMarkerCoverage,
    livePathCoverage,
    htmlBytes,
    releaseSurfaceBytes,
    scriptTagCount,
    importedModuleCount: importedModules.length,
    duplicateModuleImports,
    missingModules: shell.missingModules,
    missingShellMarkers: shell.missingMarkers,
    missingFeatureMarkers,
    thresholds,
    gates: {
      moduleCoverage: moduleCoverage >= thresholds.requiredModuleCoverage,
      shellMarkerCoverage: shellMarkerCoverage >= thresholds.requiredShellMarkerCoverage,
      featureMarkerCoverage: featureMarkerCoverage >= thresholds.requiredFeatureMarkerCoverage,
      livePathCoverage: livePathCoverage >= thresholds.livePathCoverage,
      duplicateModuleImports: duplicateModuleImports.length <= thresholds.duplicateModuleImports,
      htmlPayloadBudget: htmlBytes <= thresholds.maxHtmlBytes,
      scriptCountBudget: scriptTagCount <= thresholds.maxScriptTags,
      releaseScore: releaseScore >= thresholds.minReleaseScore
    }
  };
  return metrics;
}

export function buildReleaseMetricReport(metrics, { commitSha = 'unknown', source = 'repo-shell', generatedAt = new Date().toISOString() } = {}) {
  return {
    reportType: 'macsense-production-metrics-report',
    generatedAt,
    commitSha,
    source,
    status: metrics.ok ? 'pass' : 'fail',
    releaseScore: metrics.releaseScore,
    metrics,
    metricDefinitions: MEANINGFUL_RELEASE_METRICS,
    decision: metrics.ok
      ? 'Repo shell meets the current measurable release gate. Live production must still be verified against the deployment URL.'
      : 'Repo shell does not meet the measurable release gate. Do not claim production-current until failures are fixed.',
    liveBoundary: RELEASE_MANIFEST.currentBoundary
  };
}

export function assertReleaseMetrics(metrics) {
  if (!metrics.ok) {
    const failures = Object.entries(metrics.gates).filter(([, passed]) => !passed).map(([name]) => name);
    throw new Error(`Release metrics failed: ${failures.join(', ') || 'unknown failure'}`);
  }
  return true;
}

export function extractModuleImports(html = '') {
  const matches = html.matchAll(/<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/gi);
  return Array.from(matches, match => match[1]);
}

function countMatches(text, pattern) {
  return Array.from(String(text).matchAll(pattern)).length;
}

function byteLength(text) {
  return new TextEncoder().encode(String(text)).length;
}

function ratio(value, total) {
  return total === 0 ? 1 : Number((value / total).toFixed(4));
}

function unique(items) {
  return Array.from(new Set(items));
}
