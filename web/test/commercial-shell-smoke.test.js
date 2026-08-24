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

test('served studio exposes commercial shell and keeps engine modules wired', async (t) => {
  const server = await serveStatic();
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const html = await fetch(`${base}/?cinema=1`).then(r => r.text());
  for (const marker of ['commercial-shell.js', 'proof-mode.js', 'sound-family-ui.js', 'song-revision-ui.js', 'legal-engine-pack-ui.js']) {
    assert.match(html, new RegExp(marker.replace('.', '\\.')));
  }
  assert.match(html, /MacSense AI Production Studio/);
  assert.match(html, /System Briefing/);
  assert.doesNotMatch(html, /dangerous version/i);
  assert.doesNotMatch(html, /living studio/i);

  const shell = await fetch(`${base}/src/commercial-shell.js`).then(r => r.text());
  for (const marker of ['Commercial Studio Overview', 'Proof Mode', 'Sound Genetics', 'Bar Revision', 'Editor Engine Pack', 'Finish Path']) {
    assert.match(shell, new RegExp(marker));
  }

  const cinema = await fetch(`${base}/src/cinematic-spec.js`).then(r => r.text());
  for (const marker of ['MACSENSE SYSTEM BRIEFING', 'Bar-by-Bar Revision', 'Legal Engine Pack', 'Proof Export']) {
    assert.match(cinema, new RegExp(marker));
  }
});
