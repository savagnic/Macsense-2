import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGINE_PACK,
  legalCandidates,
  blockedCandidates,
  createLane,
  createClip,
  splitClip,
  moveClip,
  buildBarGrid,
  makeBouncePlan,
  enhancedFeatureExtract,
  enhancedGenomeTraits
} from '../src/legal-engine-pack.js';

test('keeps permissive candidates separate from guarded engines', () => {
  assert.ok(ENGINE_PACK.some(engine => engine.id === 'audiomass'));
  assert.ok(legalCandidates().some(engine => engine.id === 'wavesurfer'));
  assert.ok(blockedCandidates().some(engine => engine.id === 'opendaw'));
});

test('creates, splits, moves, and plans clip lanes', () => {
  const lane = createLane({ clips: [createClip({ id: 'clip-a', name: 'Hook', start: 0, duration: 8 })] });
  const [left, right] = splitClip(lane, 'clip-a', 3);
  assert.equal(left.duration, 3);
  assert.equal(right.start, 3);
  moveClip(lane, right.id, 5);
  assert.equal(lane.clips[1].start, 5);
  const regions = buildBarGrid({ bpm: 120, bars: 4 });
  assert.equal(regions.length, 4);
  const plan = makeBouncePlan({ lanes: [lane], regions });
  assert.equal(plan.clipCount, 2);
  assert.equal(plan.renderedAudio, false);
});

test('extracts enhanced features and maps them into genome traits', () => {
  const samples = Array.from({ length: 2048 }, (_, i) => Math.sin(i / 8) * 0.4 + (i % 128 === 0 ? 0.5 : 0));
  const features = enhancedFeatureExtract(samples, 48000);
  assert.ok(features.rms > 0);
  assert.ok(features.peak > 0);
  assert.ok(features.pseudoSpectralCentroidHz >= 0);
  const genome = enhancedGenomeTraits(samples, 48000);
  for (const key of ['transient', 'harmonicity', 'brightness', 'dynamics', 'confidence']) {
    assert.ok(genome[key] >= 0 && genome[key] <= 1);
  }
});
