import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const types = new Map([['.html', 'text/html'], ['.js', 'application/javascript'], ['.css', 'text/css'], ['.webmanifest', 'application/manifest+json']]);

async function serveStatic() {
  const server = createServer(async (req, res) => {
    const requested = req.url.split('?')[0];
    const path = requested === '/' || requested === '' ? '/index.html' : requested;
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

test('served studio exposes audible genetic audio rendering', async (t) => {
  const server = await serveStatic();
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const html = await fetch(`${base}/`).then(r => r.text());
  assert.match(html, /genetic-audio-render-ui\.js/);
  assert.match(html, /commercial-shell\.js/);
  assert.match(html, /sound-family-ui\.js/);

  const ui = await fetch(`${base}/src/genetic-audio-render-ui.js`).then(r => r.text());
  for (const marker of ['AUDIBLE GENETIC SOUND', 'Render · A/B · Export', 'Render Breed', 'Render Resurrection', 'Render Evolution', 'Export WAV']) {
    assert.match(ui, new RegExp(marker));
  }

  const engine = await fetch(`${base}/src/genetic-audio-render.js`).then(r => r.text());
  for (const marker of ['createSyntheticGenomeAudio', 'renderGeneticAudioVariant', 'buildGeneticRenderProof', 'encodeWavBytes', 'playRenderedAudio']) {
    assert.match(engine, new RegExp(marker));
  }
});
