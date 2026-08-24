import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const types = new Map([
  ['.html', 'text/html'], ['.js', 'application/javascript'], ['.css', 'text/css'], ['.webmanifest', 'application/manifest+json']
]);

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

test('served studio exposes bar-by-bar revision module and markers', async (t) => {
  const server = await serveStatic();
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const html = await fetch(`${base}/`).then(r => r.text());
  assert.match(html, /song-revision-ui\.js/);
  assert.match(html, /sound-family-ui\.js/);
  assert.match(html, /proof-mode\.js/);

  const ui = await fetch(`${base}/src/song-revision-ui.js`).then(r => r.text());
  assert.match(ui, /BAR-BY-BAR REVISION/);
  assert.match(ui, /Draft → Fix → Keep/);
  assert.match(ui, /Rewrite Selected/);
  assert.match(ui, /Export Proof/);
  assert.match(ui, /macsense-bar-by-bar-revision-proof\.json/);

  const engine = await fetch(`${base}/src/song-revision.js`).then(r => r.text());
  for (const marker of ['createRevisionSession', 'rewriteBar', 'replaceBar', 'keepVariant', 'assembleSong', 'exportRevisionProof']) {
    assert.match(engine, new RegExp(marker));
  }
});
