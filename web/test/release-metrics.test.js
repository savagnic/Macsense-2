import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { RELEASE_MANIFEST } from '../src/release-manifest.js';
import {
  MEANINGFUL_RELEASE_METRICS,
  assertReleaseMetrics,
  buildReleaseMetricReport,
  extractModuleImports,
  measureReleaseShell
} from '../src/release-metrics.js';

const root = new URL('..', import.meta.url).pathname;
const types = new Map([['.html', 'text/html'], ['.js', 'application/javascript'], ['.css', 'text/css'], ['.webmanifest', 'application/manifest+json']]);

async function readRepoReleaseSurface() {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const modules = await Promise.all(RELEASE_MANIFEST.requiredModules.map(modulePath => readFile(join(root, modulePath.replace('./', '')), 'utf8')));
  return { html, releaseSurfaceText: [html, ...modules].join('\n') };
}

async function readServedReleaseSurface(base) {
  const html = await fetch(`${base}/`).then(response => response.text());
  const modules = await Promise.all(RELEASE_MANIFEST.requiredModules.map(modulePath => fetch(`${base}/${modulePath.replace(/^\.\//, '')}`).then(response => response.text())));
  return { html, releaseSurfaceText: [html, ...modules].join('\n') };
}

async function serveStatic() {
  const server = createServer(async (req, res) => {
    const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    try {
      const file = await readFile(join(root, path));
      res.writeHead(200, { 'content-type': types.get(extname(path)) || 'text/plain' });
      res.end(file);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

test('release metrics pass on the repo production shell with meaningful budgets', async () => {
  const { html, releaseSurfaceText } = await readRepoReleaseSurface();
  const metrics = measureReleaseShell(html, RELEASE_MANIFEST, undefined, { releaseSurfaceText });
  assert.equal(metrics.ok, true);
  assert.equal(metrics.releaseScore, 100);
  assert.equal(metrics.moduleCoverage, 1);
  assert.equal(metrics.shellMarkerCoverage, 1);
  assert.equal(metrics.featureMarkerCoverage, 1);
  assert.equal(metrics.livePathCoverage, 1);
  assert.equal(metrics.duplicateModuleImports.length, 0);
  assert.ok(metrics.htmlBytes > 1000);
  assert.ok(metrics.releaseSurfaceBytes > metrics.htmlBytes);
  assert.ok(metrics.htmlBytes <= metrics.thresholds.maxHtmlBytes);
  assert.ok(metrics.scriptTagCount <= metrics.thresholds.maxScriptTags);
  assert.equal(assertReleaseMetrics(metrics), true);
});

test('release metrics fail if a required production module is missing', async () => {
  const { html, releaseSurfaceText } = await readRepoReleaseSurface();
  const broken = html.replace('./src/finish-mode-ui.js', './src/missing-finish-mode-ui.js');
  const metrics = measureReleaseShell(broken, RELEASE_MANIFEST, undefined, { releaseSurfaceText });
  assert.equal(metrics.ok, false);
  assert.ok(metrics.missingModules.includes('./src/finish-mode-ui.js'));
  assert.throws(() => assertReleaseMetrics(metrics), /Release metrics failed/);
});

test('release metrics fail on duplicate module imports', async () => {
  const { html, releaseSurfaceText } = await readRepoReleaseSurface();
  const duplicated = html.replace('</body>', '  <script type="module" src="./src/finish-mode-ui.js"></script>\n</body>');
  const metrics = measureReleaseShell(duplicated, RELEASE_MANIFEST, undefined, { releaseSurfaceText });
  assert.equal(metrics.ok, false);
  assert.deepEqual(metrics.duplicateModuleImports, ['./src/finish-mode-ui.js']);
});

test('served release paths resolve and keep 100 percent coverage', async (t) => {
  const server = await serveStatic();
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const { html, releaseSurfaceText } = await readServedReleaseSurface(base);
  const metrics = measureReleaseShell(html, RELEASE_MANIFEST, undefined, { releaseSurfaceText });
  assert.equal(metrics.ok, true);
  const imports = extractModuleImports(html);
  for (const modulePath of RELEASE_MANIFEST.requiredModules) {
    assert.ok(imports.includes(modulePath), `shell missing ${modulePath}`);
  }
  for (const path of RELEASE_MANIFEST.liveVerificationPaths) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, `${path} should return 200`);
    assert.ok(Number(response.headers.get('content-length') || 1) >= 0);
  }
});

test('metric report explains the release decision and boundary', async () => {
  const { html, releaseSurfaceText } = await readRepoReleaseSurface();
  const metrics = measureReleaseShell(html, RELEASE_MANIFEST, undefined, { releaseSurfaceText });
  const report = buildReleaseMetricReport(metrics, { commitSha: 'test-sha', source: 'node-test' });
  assert.equal(report.status, 'pass');
  assert.equal(report.releaseScore, 100);
  assert.equal(report.commitSha, 'test-sha');
  assert.match(report.decision, /Live production must still be verified/);
  assert.match(report.liveBoundary, /green repository build/i);
  assert.ok(MEANINGFUL_RELEASE_METRICS.length >= 7);
});
