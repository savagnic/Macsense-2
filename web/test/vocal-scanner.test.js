import assert from 'node:assert/strict';
import { computeVocalPreset } from '../src/vocal-scanner.js';

const match = computeVocalPreset('MATCH_CLOSELY');
assert.equal(match.label, 'Match Closely');
assert.equal(match.autoTuneSpeedMs, 3);
assert.equal(match.compRatio, 6);

const fit = computeVocalPreset('FIT_MY_VOICE', {
  perceivedLoudnessDb: -20,
  estimatedReverbPct: 60,
  spectralBrightness: 1
});
assert.equal(fit.label, 'Fit My Voice');
assert.equal(fit.compThresholdDb, -20);
assert.equal(fit.reverbMixPct, 37.5);
assert.equal(fit.eqHighDb, 5.5);

const blend = computeVocalPreset('BLEND_STYLES', {
  perceivedLoudnessDb: -200,
  estimatedReverbPct: 999,
  spectralBrightness: -10
});
assert.equal(blend.compThresholdDb, -48);
assert.equal(blend.reverbMixPct, 80);
assert.equal(blend.eqHighDb, -12);

const fallback = computeVocalPreset('UNKNOWN_MODE');
assert.equal(fallback.label, 'Fit My Voice');

console.log('vocal scanner parity: ok');
