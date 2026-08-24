import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function fetchText(path) {
  const res = await fetch(`http://127.0.0.1:4173/${path}`);
  assert.equal(res.status, 200, `${path} should return 200`);
  return res.text();
}

test('static browser smoke exposes proof mode and genetic sound family modules', async () => {
  const server = spawn('python3', ['-m', 'http.server', '4173', '-d', '.'], { cwd: new URL('..', import.meta.url), stdio: 'ignore' });
  try {
    await wait(900);
    const html = await fetchText('');
    assert.match(html, /MACSENSE AI/);
    assert.match(html, /src\/proof-mode\.js/);
    assert.match(html, /src\/sound-family-ui\.js/);

    const proof = await fetchText('src/proof-mode.js');
    assert.match(proof, /VINNY PROOF MODE/);
    assert.match(proof, /WebAudioEngine/);
    assert.match(proof, /measureBuffer/);
    assert.match(proof, /executeAriCommand/);

    const familyUi = await fetchText('src/sound-family-ui.js');
    assert.match(familyUi, /GENETIC SOUND/);
    assert.match(familyUi, /Families \+ Resurrection/);
    assert.match(familyUi, /Seed Family/);
    assert.match(familyUi, /Resurrect/);
    assert.match(familyUi, /Evolve/);

    const familyEngine = await fetchText('src/sound-family.js');
    assert.match(familyEngine, /breedFamilySound/);
    assert.match(familyEngine, /resurrectSound/);
    assert.match(familyEngine, /evolveSound/);
    assert.match(familyEngine, /buildFamilyTree/);
  } finally {
    server.kill('SIGTERM');
  }
});
