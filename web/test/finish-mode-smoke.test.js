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

test('served studio exposes Finish Mode export pack and required engine modules', async (t) => {
  const server = await serveStatic();
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const html = await fetch(`${base}/`).then(r => r.text());
  for (const marker of ['commercial-shell.js', 'genetic-audio-render-ui.js', 'finish-mode-ui.js']) {
    assert.match(html, new RegExp(marker.replace('.', '\\.')));
  }
  const finishUi = await fetch(`${base}/src/finish-mode-ui.js`).then(r => r.text());
  for (const marker of ['FINISH MODE', 'Export Pack', 'session receipt', 'audible Genetic Sound proof', 'macsense-finish-pack.json']) {
    assert.match(finishUi, new RegExp(marker, 'i'));
  }
  const finishEngine = await fetch(`${base}/src/finish-mode.js`).then(r => r.text());
  for (const marker of ['buildFinishPack', 'buildLyricsSheet', 'buildRevisionProof', 'buildFamilyTreeReceipt', 'buildMasteringReport', 'REQUIRED_FINISH_EXPORTS']) {
    assert.match(finishEngine, new RegExp(marker));
  }
});
