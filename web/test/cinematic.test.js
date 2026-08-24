import assert from 'node:assert/strict';
import { MAIN_CINEMATIC, FEATURE_CINEMATICS, assertCinematicSpec } from '../src/cinematic-spec.js';

assert.equal(assertCinematicSpec(), true);
assert.ok(MAIN_CINEMATIC.durationSeconds >= 180, 'main MacSense intro must be at least 3 minutes');
assert.ok(MAIN_CINEMATIC.durationSeconds <= 240, 'main MacSense intro must be no more than 4 minutes');
assert.equal(MAIN_CINEMATIC.title, 'MACSENSE SYSTEM BRIEFING');
assert.ok(MAIN_CINEMATIC.beats.some(beat => /Ari/i.test(beat.line)), 'main intro must introduce Ari');
assert.ok(MAIN_CINEMATIC.beats.some(beat => /Bar-by-Bar Revision/i.test(beat.line)), 'main intro must cover bar revision');
assert.ok(MAIN_CINEMATIC.beats.some(beat => /legal engine pack/i.test(beat.line)), 'main intro must cover the editor engine pack');

const required = new Map([
  ['proof-mode', 'Proof Mode'],
  ['vertical-daw', 'Session Surface'],
  ['flow-capture', 'Flow Capture'],
  ['bar-revision', 'Bar-by-Bar Revision'],
  ['ari', 'Ari Co-Producer'],
  ['sound-genetics', 'Sound Genetics'],
  ['breeding', 'Breeding Chamber'],
  ['resurrection', 'Resurrection Lineage'],
  ['engine-pack', 'Legal Engine Pack'],
  ['vocal-scanner', 'Vocal Preset Scanner'],
  ['mastering', 'Mastering Chamber'],
  ['export', 'Proof Export']
]);
for (const [id, title] of required) {
  const feature = FEATURE_CINEMATICS.find(item => item.id === id);
  assert.ok(feature, `missing cinematic for ${title}`);
  assert.equal(feature.title, title);
  assert.ok(feature.durationSeconds >= 25 && feature.durationSeconds <= 35, `${title} cinematic must be 25-35 seconds`);
}

console.log('cinematic coverage: ok');
