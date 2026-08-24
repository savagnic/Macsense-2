import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRevisionSession,
  addBarVariant,
  keepVariant,
  rewriteBar,
  replaceBar,
  markBar,
  assembleSong,
  revisionStats,
  exportRevisionProof
} from '../src/song-revision.js';

test('creates a bar-by-bar session from seed and generated lyrics', () => {
  const session = createRevisionSession({
    title: 'Vinny flow',
    seedLyrics: 'half hook\nsecond seed',
    generatedLyrics: 'half hook polished\nsecond generated\nthird generated'
  });
  assert.equal(session.bars.length, 8);
  assert.equal(session.bars[0].original, 'half hook');
  assert.equal(session.bars[0].generated, 'half hook polished');
  assert.equal(session.bars[2].generated, 'third generated');
});

test('adds variants and keeps the chosen bar text', () => {
  const session = createRevisionSession({ seedLyrics: 'first bar', generatedLyrics: 'first generated' });
  const barId = session.bars[0].id;
  const variant = addBarVariant(session, barId, 'first bar but meaner', { source: 'test' });
  keepVariant(session, barId, variant.id);
  assert.equal(session.bars[0].current, 'first bar but meaner');
  assert.equal(session.bars[0].status, 'kept');
  assert.equal(revisionStats(session).keptBars, 1);
});

test('rewrites, replaces, marks, assembles and exports proof', () => {
  const session = createRevisionSession({ seedLyrics: 'soft line', generatedLyrics: 'soft line generated' });
  const barId = session.bars[0].id;
  const variant = rewriteBar(session, barId, 'make it hit harder');
  assert.match(variant.text, /hit harder/);
  replaceBar(session, barId, 'artist final bar');
  markBar(session, barId, 'locked', 'Vinny liked this one');
  const assembled = assembleSong(session);
  assert.match(assembled, /artist final bar/);
  const proof = exportRevisionProof(session);
  assert.equal(proof.version, 'bar-revision-v1');
  assert.equal(proof.stats.totalBars, 8);
  assert.match(proof.assembledSong, /artist final bar/);
});
