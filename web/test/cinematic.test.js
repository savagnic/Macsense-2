import assert from 'node:assert/strict';
import { MAIN_CINEMATIC, FEATURE_CINEMATICS, assertCinematicSpec } from '../src/cinematic-spec.js';

assert.equal(assertCinematicSpec(), true);
assert.ok(MAIN_CINEMATIC.durationSeconds >= 180, 'main Ari intro must be at least 3 minutes');
assert.ok(MAIN_CINEMATIC.durationSeconds <= 240, 'main Ari intro must be no more than 4 minutes');
assert.ok(MAIN_CINEMATIC.beats.some(beat => /Ari/i.test(beat.line)), 'main intro must introduce Ari');
assert.ok(MAIN_CINEMATIC.beats.some(beat => /Vinny/i.test(beat.line)), 'main intro must directly frame Vinny entering the system');

const required = new Map([
  ['vertical-daw', 'Vertical DAW'],
  ['flow-capture', 'Flow Capture'],
  ['lyrics-studio', 'Lyrics Studio'],
  ['ari', 'Ari Co-Producer'],
  ['sound-genetics', 'Sound Genetics'],
  ['breeding', 'Breeding Chamber'],
  ['resurrection', 'Resurrection Ritual'],
  ['vocal-scanner', 'Vocal Preset Scanner'],
  ['mastering', 'Mastering Chamber'],
  ['arrangement', 'Arrangement View'],
  ['export', 'Export Master']
]);
for (const [id, title] of required) {
  const feature = FEATURE_CINEMATICS.find(item => item.id === id);
  assert.ok(feature, `missing cinematic for ${title}`);
  assert.equal(feature.title, title);
  assert.ok(feature.durationSeconds >= 25 && feature.durationSeconds <= 35, `${title} cinematic must be 25-35 seconds`);
}

console.log('cinematic coverage: ok');
