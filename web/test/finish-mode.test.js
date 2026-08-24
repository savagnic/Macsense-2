import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinishPack, buildLyricsSheet, buildRevisionProof, bytesToBase64, REQUIRED_FINISH_EXPORTS } from '../src/finish-mode.js';
import { createSyntheticGenomeAudio, renderGeneticAudioVariant, buildGeneticRenderProof, encodeWavBytes } from '../src/genetic-audio-render.js';

const project = {
  id: 'p1',
  name: 'Finish Test',
  bpm: 146,
  lyrics: 'line one\nline two',
  tracks: [{ id: 'vocal' }, { id: 'beat' }],
  mastering: { preset: 'club_punch', targetLufs: -10, ceilingDbtp: -0.8 },
  genomes: [{ sourceId: 'root', transient: .4, harmonicity: .7, brightness: .5, dynamics: .6, stereoWidth: .3, confidence: .9 }],
  soundFamilies: [{ id: 'family-root', name: 'Family Root', root: 'root', members: ['root','child'] }],
  lineage: [{ type: 'breed', child: 'child', parents: ['root','other'], traits: ['brightness'], familyId: 'family-root' }]
};

const revisionSession = {
  title: 'Revision',
  assembledSong: 'final line one\nfinal line two',
  bars: [
    { index: 0, section: 'verse', status: 'kept', locked: true, seed: 'line one', generated: 'final line one', current: 'final line one', variants: ['alt one'] },
    { index: 1, section: 'hook', status: 'needs_work', locked: false, seed: 'line two', generated: 'final line two', current: 'final line two' }
  ]
};

test('builds lyrics and revision proof from project state', () => {
  const sheet = buildLyricsSheet(project, revisionSession);
  assert.match(sheet, /# Finish Test/);
  assert.match(sheet, /final line one/);
  const revision = buildRevisionProof(revisionSession);
  assert.equal(revision.barCount, 2);
  assert.equal(revision.lockedBars, 1);
  assert.equal(revision.needsWorkBars, 1);
});

test('builds required finish pack files with genetic wav preview', () => {
  const parent = project.genomes[0];
  const child = { ...parent, sourceId: 'child', brightness: .78, dynamics: .82, stereoWidth: .6 };
  const sourceAudio = createSyntheticGenomeAudio(parent, { durationSeconds: .4 });
  const variant = renderGeneticAudioVariant(sourceAudio, parent, child, { action: 'test_variant', variantId: 'child-preview' });
  const proof = buildGeneticRenderProof({ sourceId: 'root', parentGenome: parent, variant, familyId: 'family-root' });
  const wavBytes = encodeWavBytes(variant.audio);
  const pack = buildFinishPack({ project, revisionSession, geneticProofs: [proof], wavBytes, measures: { lufs: -11, truePeakDbtp: -0.7 } });
  assert.equal(pack.requiredComplete, true);
  for (const name of REQUIRED_FINISH_EXPORTS) assert.ok(pack.files.some(file => file.name === name), `missing ${name}`);
  const wav = pack.files.find(file => file.name === 'audible-genetic-preview.wav');
  assert.equal(wav.contentType, 'audio/wav');
  assert.equal(wav.encoding, 'base64');
  assert.ok(wav.content.length > 40);
  const receipt = JSON.parse(pack.files.find(file => file.name === 'session-receipt.json').content);
  assert.equal(receipt.counts.tracks, 2);
  assert.equal(receipt.systems.audibleGeneticSound, true);
});

test('bytesToBase64 supports deterministic binary export encoding', () => {
  assert.equal(bytesToBase64(new Uint8Array([82, 73, 70, 70])), 'UklGRg==');
});
