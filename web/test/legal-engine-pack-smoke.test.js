import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const types = new Map([['.html', 'text/html'], ['.js', 'application/javascript'], ['.css', 'text/css'], ['.webmanifest', 'application/manifest+json']]);

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

test('served studio exposes legal engine pack without dropping prior modules', async (t) => {
  const server = await serveStatic();
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const html = await fetch(`${base}/`).then(r => r.text());
  for (const marker of ['proof-mode.js', 'sound-family-ui.js', 'song-revision-ui.js', 'legal-engine-pack-ui.js']) {
    assert.match(html, new RegExp(marker.replace('.', '\\.')));
  }
  const ui = await fetch(`${base}/src/legal-engine-pack-ui.js`).then(r => r.text());
  assert.match(ui, /LEGAL ENGINE PACK/);
  assert.match(ui, /Editor · Regions · Transport · Features/);
  assert.match(ui, /macsense-legal-engine-pack-proof\.json/);
  const engine = await fetch(`${base}/src/legal-engine-pack.js`).then(r => r.text());
  for (const marker of ['ENGINE_PACK', 'createLane', 'splitClip', 'buildBarGrid', 'enhancedFeatureExtract', 'makeBouncePlan']) {
    assert.match(engine, new RegExp(marker));
  }
});
