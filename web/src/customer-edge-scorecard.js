export const COMPETITIVE_BASELINES = Object.freeze([
  {
    product: 'Suno Studio',
    lane: 'generative audio workstation',
    strengths: ['chat-assisted editing', 'stem separation', 'section replacement', 'multitrack export', 'MIDI/effects workflow'],
    macsenseCounter: ['bar-by-bar revision proof', 'SoundGenome lineage', 'audible genetic variants', 'finish pack receipt']
  },
  {
    product: 'BandLab',
    lane: 'browser/mobile DAW and creator platform',
    strengths: ['record/edit/mix in browser or phone', 'AutoMix', 'mastering', 'mobile creator workflow'],
    macsenseCounter: ['local-first proof path', 'Ari command preview/apply', 'commercial briefing', 'exportable production receipt']
  },
  {
    product: 'Soundtrap',
    lane: 'online collaborative studio',
    strengths: ['any-device online creation', 'collaboration', 'invite workflow', 'education-friendly sharing'],
    macsenseCounter: ['artist-controlled revision decisions', 'proof pack', 'genetic sound identity', 'release verification gate']
  }
]);

export const WHOLE_SYSTEM_TESTS = Object.freeze([
  {
    id: 'first-run-to-proof',
    label: 'First run to proof export',
    customerQuestion: 'Can a new user understand MacSense and produce a proof artifact without guessing?',
    requiredEvidence: ['system briefing visible', 'proof mode visible', 'finish mode visible', 'export pack available'],
    metric: 'time_to_first_proof_minutes',
    target: '<= 5 minutes in guided mode'
  },
  {
    id: 'vinny-half-song-to-finish',
    label: 'Half-written song to finished pack',
    customerQuestion: 'Can a writer bring a partial song, revise it bar by bar, and leave with useful deliverables?',
    requiredEvidence: ['bar revision session', 'lyrics sheet', 'revision proof', 'finish pack'],
    metric: 'song_workflow_completion_rate',
    target: '>= 90% guided completion in test script'
  },
  {
    id: 'genetic-sound-audition',
    label: 'Genetic sound audition',
    customerQuestion: 'Can a user hear the difference between parent, child, resurrection, and evolution variants?',
    requiredEvidence: ['family data', 'audible genetic render', 'before/after metrics', 'wav preview'],
    metric: 'audible_variant_success_rate',
    target: '100% render + playback path in smoke test'
  },
  {
    id: 'release-current-live-url',
    label: 'Live URL production-current verification',
    customerQuestion: 'Is the public URL serving the same systems that are green in the repo?',
    requiredEvidence: ['release manifest paths 200', 'required modules present', 'no old static demo shell', 'browser click-through recorded'],
    metric: 'live_release_match_rate',
    target: '100% before production-current claim'
  },
  {
    id: 'mobile-production-journey',
    label: 'Mobile creator journey',
    customerQuestion: 'Can the web app feel usable on Android for Vinny without needing iOS?',
    requiredEvidence: ['mobile viewport', 'audio unlock', 'record/import', 'revision flow', 'finish pack'],
    metric: 'mobile_blocker_count',
    target: '0 P0 blockers'
  }
]);

export const EDGE_DIMENSIONS = Object.freeze([
  { id: 'proof', label: 'Proof and accountability', weight: 18 },
  { id: 'genetics', label: 'Sound genetics and lineage', weight: 18 },
  { id: 'revision', label: 'Bar-level writer control', weight: 16 },
  { id: 'audible', label: 'Audible variants', weight: 14 },
  { id: 'finish', label: 'Finish/export deliverables', weight: 14 },
  { id: 'usability', label: 'Guided customer usability', weight: 10 },
  { id: 'live', label: 'Verified live production', weight: 10 }
]);

export const PARITY_DIMENSIONS = Object.freeze([
  { id: 'stems', label: 'Stem separation / stem lane depth', risk: 'Suno and BandLab are stronger today.' },
  { id: 'collaboration', label: 'Real-time collaboration / sharing', risk: 'Soundtrap and BandLab are stronger today.' },
  { id: 'cloud', label: 'Cloud sync and authenticated projects', risk: 'MacSense still needs production auth/cloud configuration.' },
  { id: 'browser-e2e', label: 'Real browser click-through automation', risk: 'Static smoke is good; Playwright-style click proof is still needed.' },
  { id: 'live-deploy', label: 'Verified public deployment', risk: 'Repo green does not mean the live URL is current.' }
]);

export function buildCustomerEdgeScorecard({ capabilities = {}, competitorBaselines = COMPETITIVE_BASELINES } = {}) {
  const dimensions = EDGE_DIMENSIONS.map(dimension => {
    const raw = Number(capabilities[dimension.id] || 0);
    const value = clamp(raw, 0, 1);
    return {
      ...dimension,
      value,
      weightedScore: Number((value * dimension.weight).toFixed(2))
    };
  });
  const totalScore = Number(dimensions.reduce((sum, dimension) => sum + dimension.weightedScore, 0).toFixed(2));
  const maxScore = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const edgeScore = Math.round((totalScore / maxScore) * 100);
  const missingEdge = dimensions.filter(dimension => dimension.value < 1).map(dimension => ({
    id: dimension.id,
    label: dimension.label,
    gap: Number((1 - dimension.value).toFixed(2)),
    lostPoints: Number((dimension.weight - dimension.weightedScore).toFixed(2))
  }));
  return {
    version: 'macsense-customer-edge-scorecard-v1',
    edgeScore,
    totalScore,
    maxScore,
    dimensions,
    missingEdge,
    parityRisks: PARITY_DIMENSIONS,
    competitorBaselines,
    recommendedNextTests: recommendNextTests(missingEdge),
    decision: edgeScore >= 90
      ? 'MacSense has a strong differentiated story. Next work should close parity risks and verify live usability.'
      : 'MacSense needs focused work on the missing edge dimensions before it can claim a premium customer advantage.'
  };
}

export function buildWholeSystemTestPlan({ includeCompetitive = true } = {}) {
  return {
    version: 'macsense-whole-system-test-plan-v1',
    generatedAt: new Date().toISOString(),
    tests: WHOLE_SYSTEM_TESTS,
    competitiveBaselines: includeCompetitive ? COMPETITIVE_BASELINES : [],
    edgeDimensions: EDGE_DIMENSIONS,
    parityDimensions: PARITY_DIMENSIONS,
    passRule: 'A production-current claim requires green CI, 100/100 release metrics, live URL verification, and customer-journey proof for first-run, song revision, genetic audio, finish pack, and mobile use.'
  };
}

export function scoreCurrentRepoEdge() {
  return buildCustomerEdgeScorecard({
    capabilities: {
      proof: 1,
      genetics: 1,
      revision: 1,
      audible: 1,
      finish: 1,
      usability: 0.65,
      live: 0
    }
  });
}

function recommendNextTests(missingEdge) {
  const recommendations = [];
  if (missingEdge.some(item => item.id === 'live')) recommendations.push('Run live URL release-manifest verification and record browser click-through proof.');
  if (missingEdge.some(item => item.id === 'usability')) recommendations.push('Add Playwright customer journey tests for first-run-to-proof, bar revision, genetic audio, and Finish Mode export.');
  if (missingEdge.some(item => item.id === 'audible')) recommendations.push('Verify audible genetic variants with playback and WAV integrity checks.');
  if (missingEdge.some(item => item.id === 'finish')) recommendations.push('Verify finish pack contains every required deliverable and opens as customer-facing files.');
  return recommendations.length ? recommendations : ['Move from repo metrics to live production verification and competitor parity testing.'];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}
