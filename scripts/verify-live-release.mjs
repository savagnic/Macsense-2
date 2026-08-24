#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const DEFAULT_URL = 'https://macsense-2-sable.vercel.app';
const baseUrl = (process.env.MACSENSE_LIVE_URL || process.argv[2] || DEFAULT_URL).replace(/\/$/, '');
const expectedCommit = process.env.GITHUB_SHA || process.env.MACSENSE_EXPECTED_COMMIT || 'unknown';
const deploymentUrl = process.env.VERCEL_DEPLOYMENT_URL ? `https://${process.env.VERCEL_DEPLOYMENT_URL.replace(/^https?:\/\//, '')}` : baseUrl;

async function fetchText(path) {
  const url = `${deploymentUrl}${path}`;
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  return { path, url, status: res.status, ok: res.ok, text, headers: Object.fromEntries(res.headers.entries()) };
}

function extractScripts(html) {
  return [...html.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>/g)].map(match => match[1]);
}

async function main() {
  const manifestPath = new URL('../web/src/release-manifest.js', import.meta.url);
  const manifestSource = await readFile(manifestPath, 'utf8');
  const module = await import(`data:text/javascript,${encodeURIComponent(manifestSource)}`);
  const manifest = module.RELEASE_MANIFEST;
  if (!manifest) throw new Error('RELEASE_MANIFEST export not found.');

  const root = await fetchText('/');
  const scriptSources = extractScripts(root.text);
  const requiredPaths = new Set([...(manifest.liveVerificationPaths || []), '/styles.css', '/sw.js']);
  const expectedModules = manifest.requiredModules || [];
  for (const modulePath of expectedModules) {
    requiredPaths.add(modulePath.replace(/^\./, ''));
  }
  for (const src of scriptSources) requiredPaths.add(src.startsWith('/') ? src : `/${src.replace(/^\.\//, '')}`);

  const pathResults = [];
  for (const path of [...requiredPaths].sort()) pathResults.push(await fetchText(path));

  const missingShellMarkers = (manifest.requiredShellMarkers || []).filter(marker => !root.text.includes(marker));
  const missingFeatureMarkers = (manifest.requiredFeatureMarkers || []).filter(marker => !root.text.includes(marker) && !pathResults.some(result => result.text.includes(marker)));
  const missingModuleScripts = expectedModules.filter(modulePath => {
    const normalized = modulePath.replace(/^\.\//, '/');
    return !scriptSources.includes(normalized) && !scriptSources.includes(modulePath);
  });
  const failingPaths = pathResults.filter(result => !result.ok).map(result => ({ path: result.path, status: result.status }));
  const duplicateScripts = scriptSources.filter((src, index) => scriptSources.indexOf(src) !== index);
  const staleV17 = /Vinny Proof v17|MA¢SNSE Vinny Proof v17/i.test(root.text);

  const report = {
    url: deploymentUrl,
    expectedCommit,
    manifestVersion: manifest.version,
    checkedAt: new Date().toISOString(),
    rootStatus: root.status,
    rootCache: root.headers['x-vercel-cache'] || null,
    rootAge: root.headers.age || null,
    requiredPathCount: pathResults.length,
    okPathCount: pathResults.filter(result => result.ok).length,
    scriptCount: scriptSources.length,
    duplicateScripts,
    missingShellMarkers,
    missingFeatureMarkers,
    missingModuleScripts,
    failingPaths,
    staleV17,
    passed: root.ok && !staleV17 && failingPaths.length === 0 && missingShellMarkers.length === 0 && missingFeatureMarkers.length === 0 && missingModuleScripts.length === 0 && duplicateScripts.length === 0,
    boundary: manifest.currentBoundary
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exit(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
