import test from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_CINEMATIC, FEATURE_CINEMATICS, assertCinematicSpec } from '../src/cinematic-spec.js';

test('commercial cinematic spec covers the wired product systems', () => {
  assert.equal(assertCinematicSpec(), true);
  assert.equal(MAIN_CINEMATIC.id, 'macsense-commercial-system-intro');
  assert.ok(MAIN_CINEMATIC.durationSeconds >= 180);
  assert.ok(MAIN_CINEMATIC.durationSeconds <= 240);
  for (const marker of ['SoundGenome', 'Bar-by-Bar Revision', 'legal engine pack', 'Ari', 'Mastering']) {
    assert.match(MAIN_CINEMATIC.beats.map(beat => `${beat.label} ${beat.line}`).join('\n'), new RegExp(marker, 'i'));
  }
  const ids = new Set(FEATURE_CINEMATICS.map(feature => feature.id));
  for (const required of ['proof-mode', 'bar-revision', 'sound-genetics', 'resurrection', 'engine-pack', 'export']) {
    assert.ok(ids.has(required), `missing ${required}`);
  }
});
