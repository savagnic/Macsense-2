import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPETITIVE_BASELINES,
  EDGE_DIMENSIONS,
  PARITY_DIMENSIONS,
  WHOLE_SYSTEM_TESTS,
  buildCustomerEdgeScorecard,
  buildWholeSystemTestPlan,
  scoreCurrentRepoEdge
} from '../src/customer-edge-scorecard.js';

test('whole-system test plan covers customer journeys that matter', () => {
  const plan = buildWholeSystemTestPlan();
  const ids = new Set(plan.tests.map(item => item.id));
  for (const required of ['first-run-to-proof', 'vinny-half-song-to-finish', 'genetic-sound-audition', 'release-current-live-url', 'mobile-production-journey']) {
    assert.ok(ids.has(required), `missing whole-system test ${required}`);
  }
  assert.match(plan.passRule, /green CI/);
  assert.match(plan.passRule, /live URL verification/);
  assert.ok(plan.competitiveBaselines.length >= 3);
});

test('competitive baselines force MacSense to compare against real product lanes', () => {
  const products = new Set(COMPETITIVE_BASELINES.map(item => item.product));
  for (const expected of ['Suno Studio', 'BandLab', 'Soundtrap']) {
    assert.ok(products.has(expected), `missing competitor baseline ${expected}`);
  }
  assert.ok(COMPETITIVE_BASELINES.some(item => item.strengths.includes('stem separation')));
  assert.ok(COMPETITIVE_BASELINES.some(item => item.strengths.includes('AutoMix')));
  assert.ok(COMPETITIVE_BASELINES.some(item => item.strengths.includes('collaboration')));
});

test('edge scorecard exposes missing premium advantage instead of hiding gaps', () => {
  const scorecard = buildCustomerEdgeScorecard({ capabilities: {
    proof: 1,
    genetics: 1,
    revision: 1,
    audible: 0.5,
    finish: 0.75,
    usability: 0.25,
    live: 0
  }});
  assert.ok(scorecard.edgeScore < 90);
  assert.ok(scorecard.missingEdge.some(item => item.id === 'live'));
  assert.ok(scorecard.missingEdge.some(item => item.id === 'usability'));
  assert.ok(scorecard.recommendedNextTests.some(item => /live URL/i.test(item)));
});

test('current repo edge score is honest about live and usability gaps', () => {
  const scorecard = scoreCurrentRepoEdge();
  assert.ok(scorecard.edgeScore >= 80);
  assert.ok(scorecard.edgeScore < 100);
  assert.ok(scorecard.missingEdge.some(item => item.id === 'live'));
  assert.ok(scorecard.missingEdge.some(item => item.id === 'usability'));
  assert.match(scorecard.decision, /live usability|premium customer advantage|verify live/i);
});

test('edge dimensions and parity risks target actual commercial decisions', () => {
  const edgeIds = new Set(EDGE_DIMENSIONS.map(item => item.id));
  for (const id of ['proof', 'genetics', 'revision', 'audible', 'finish', 'usability', 'live']) {
    assert.ok(edgeIds.has(id), `missing edge dimension ${id}`);
  }
  const parityIds = new Set(PARITY_DIMENSIONS.map(item => item.id));
  for (const id of ['stems', 'collaboration', 'cloud', 'browser-e2e', 'live-deploy']) {
    assert.ok(parityIds.has(id), `missing parity risk ${id}`);
  }
});
