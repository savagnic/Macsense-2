import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticGenomeAudio, renderGeneticAudioVariant, renderGeneticSet, buildGeneticRenderProof, encodeWavBytes, measureAudio } from '../src/genetic-audio-render.js';

const parentGenome = { sourceId: 'parent', transient: 0.4, harmonicity: 0.6, brightness: 0.35, dynamics: 0.55, stereoWidth: 0.25, confidence: 0.9 };
const childGenome = { sourceId: 'child', transient: 0.72, harmonicity: 0.55, brightness: 0.78, dynamics: 0.82, stereoWidth: 0.65, confidence: 0.86 };

test('creates measurable synthetic genome audio', () => {
  const audio = createSyntheticGenomeAudio(parentGenome, { durationSeconds: 1, sampleRate: 24000 });
  assert.equal(audio.sampleRate, 24000);
  assert.equal(audio.channels.length, 2);
  assert.equal(audio.channels[0].length, 24000);
  const metrics = measureAudio(audio);
  assert.ok(metrics.rms > 0);
  assert.ok(metrics.peak <= 0.92);
});

test('renders a child variant from trait deltas and keeps proof metrics', () => {
  const source = createSyntheticGenomeAudio(parentGenome, { durationSeconds: 1, sampleRate: 24000 });
  const variant = renderGeneticAudioVariant(source, parentGenome, childGenome, { action: 'breed', variantId: 'child-proof' });
  assert.equal(variant.variantId, 'child-proof');
  assert.equal(variant.action, 'breed');
  assert.equal(variant.audio.channels.length, 2);
  assert.equal(variant.audio.channels[0].length, source.channels[0].length);
  assert.ok(variant.deltas.brightness > 0);
  assert.ok(variant.metrics.renderedFrames > 0);
  const proof = buildGeneticRenderProof({ sourceId: 'parent', parentGenome, variant, familyId: 'family-parent' });
  assert.equal(proof.renderedAudio, true);
  assert.equal(proof.action, 'breed');
  assert.equal(proof.familyId, 'family-parent');
});

test('renders multiple genetic actions and exports WAV bytes', () => {
  const source = createSyntheticGenomeAudio(parentGenome, { durationSeconds: 0.5, sampleRate: 16000 });
  const set = renderGeneticSet(source, parentGenome, [
    { genome: childGenome, action: 'breed', variantId: 'breed-a' },
    { genome: { ...childGenome, brightness: 0.25, dynamics: 0.64 }, action: 'resurrection', variantId: 'res-a' },
    { genome: { ...childGenome, stereoWidth: 0.9, transient: 0.86 }, action: 'evolution', variantId: 'evo-a' }
  ]);
  assert.equal(set.length, 3);
  assert.deepEqual(set.map(item => item.action), ['breed', 'resurrection', 'evolution']);
  const wav = encodeWavBytes(set[0].audio);
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...wav.slice(8, 12)), 'WAVE');
  assert.ok(wav.byteLength > 44);
});
