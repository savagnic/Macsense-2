export const ENGINE_PACK = Object.freeze([
  {
    id: 'audiomass',
    name: 'AudioMass-grade editor lane',
    license: 'MIT candidate',
    mode: 'permissive_with_notice',
    useFor: ['waveform editing', 'clip lanes', 'multitrack bounce pattern', 'record lane'],
    status: 'adapter_ready_not_vendored'
  },
  {
    id: 'wavesurfer',
    name: 'wavesurfer.js-style regions',
    license: 'BSD-3-Clause candidate',
    mode: 'permissive_with_notice',
    useFor: ['waveform display', 'regions', 'selection editing'],
    status: 'region_model_ready_not_vendored'
  },
  {
    id: 'tone',
    name: 'Tone.js-style transport',
    license: 'MIT candidate',
    mode: 'permissive_with_notice',
    useFor: ['musical transport', 'bar grid', 'synth scheduling', 'effects'],
    status: 'transport_model_ready_not_vendored'
  },
  {
    id: 'meyda',
    name: 'Meyda-style feature extraction',
    license: 'MIT candidate',
    mode: 'permissive_with_notice',
    useFor: ['enhanced genome features', 'spectral centroid', 'zcr', 'rms'],
    status: 'native_feature_bridge_ready'
  },
  {
    id: 'opendaw',
    name: 'openDAW research path',
    license: 'AGPL/commercial',
    mode: 'do_not_embed_closed_without_commercial_license',
    useFor: ['research only', 'architecture inspiration', 'possible commercial license'],
    status: 'guarded'
  }
]);

export function legalCandidates() {
  return ENGINE_PACK.filter(engine => engine.mode === 'permissive_with_notice');
}

export function blockedCandidates() {
  return ENGINE_PACK.filter(engine => engine.mode.includes('do_not_embed'));
}

export function createClip({ id, name = 'clip', start = 0, duration = 4, sourceStart = 0, gain = 1, fadeIn = 0, fadeOut = 0, trackId = 'track-1' } = {}) {
  if (!Number.isFinite(start) || start < 0) throw new Error('clip start must be a non-negative number');
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('clip duration must be positive');
  return { id: id || `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, name, trackId, start, duration, sourceStart, gain, fadeIn, fadeOut, locked: false };
}

export function createLane({ id = 'lane-1', name = 'Main Lane', clips = [] } = {}) {
  return { id, name, clips: clips.map(clip => createClip(clip)), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function splitClip(lane, clipId, splitAt) {
  const index = lane.clips.findIndex(clip => clip.id === clipId);
  if (index < 0) throw new Error(`Unknown clip ${clipId}`);
  const clip = lane.clips[index];
  const offset = splitAt - clip.start;
  if (offset <= 0 || offset >= clip.duration) throw new Error('split point must be inside clip bounds');
  const left = { ...clip, id: `${clip.id}-a`, duration: round(offset) };
  const right = { ...clip, id: `${clip.id}-b`, start: round(splitAt), sourceStart: round(clip.sourceStart + offset), duration: round(clip.duration - offset) };
  lane.clips.splice(index, 1, left, right);
  touchLane(lane);
  return [left, right];
}

export function trimClip(lane, clipId, { start, duration } = {}) {
  const clip = findClip(lane, clipId);
  if (start !== undefined) {
    const delta = start - clip.start;
    if (delta < 0) throw new Error('cannot trim clip before its original start in this pass');
    clip.start = round(start);
    clip.sourceStart = round(clip.sourceStart + delta);
    clip.duration = round(clip.duration - delta);
  }
  if (duration !== undefined) {
    if (duration <= 0) throw new Error('duration must be positive');
    clip.duration = round(duration);
  }
  touchLane(lane);
  return clip;
}

export function moveClip(lane, clipId, start, trackId) {
  const clip = findClip(lane, clipId);
  if (clip.locked) throw new Error('locked clip cannot be moved');
  if (!Number.isFinite(start) || start < 0) throw new Error('clip start must be non-negative');
  clip.start = round(start);
  if (trackId) clip.trackId = trackId;
  touchLane(lane);
  return clip;
}

export function createRegion({ id, label = 'region', start = 0, end = 4, barIndex = null } = {}) {
  if (end <= start) throw new Error('region end must be after start');
  return { id: id || `region-${Date.now().toString(36)}`, label, start: round(start), end: round(end), duration: round(end - start), barIndex };
}

export function buildBarGrid({ bpm = 120, bars = 16, beatsPerBar = 4 } = {}) {
  const beat = 60 / bpm;
  return Array.from({ length: bars }, (_, index) => createRegion({
    id: `bar-region-${index + 1}`,
    label: `Bar ${index + 1}`,
    start: index * beatsPerBar * beat,
    end: (index + 1) * beatsPerBar * beat,
    barIndex: index
  }));
}

export function makeBouncePlan({ lanes = [], regions = [], sampleRate = 48000 } = {}) {
  const clips = lanes.flatMap(lane => lane.clips.map(clip => ({ ...clip, laneId: lane.id })));
  const duration = clips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);
  return {
    version: 'macsense-engine-pack-bounce-plan-v1',
    sampleRate,
    duration: round(duration),
    clipCount: clips.length,
    lanes: lanes.length,
    regions: regions.length,
    clips: clips.sort((a, b) => a.start - b.start),
    renderedAudio: false,
    nextStep: 'connect clips to WebAudioEngine offline render for audible bounce proof'
  };
}

export function enhancedFeatureExtract(samples, sampleRate = 48000) {
  const data = Array.from(samples || []);
  if (!data.length) throw new Error('samples are required');
  let sumSquares = 0;
  let peak = 0;
  let zcr = 0;
  let positiveEnergy = 0;
  for (let i = 0; i < data.length; i++) {
    const value = Number(data[i]) || 0;
    sumSquares += value * value;
    peak = Math.max(peak, Math.abs(value));
    positiveEnergy += Math.max(0, value);
    if (i > 0 && Math.sign(value) !== Math.sign(data[i - 1] || 0)) zcr++;
  }
  const rms = Math.sqrt(sumSquares / data.length);
  const crest = rms ? peak / rms : 0;
  const centroid = pseudoSpectralCentroid(data, sampleRate);
  const onsetDensity = estimateOnsetDensity(data, sampleRate);
  return {
    rms: round(rms, 5),
    peak: round(peak, 5),
    zeroCrossingRate: round(zcr / Math.max(1, data.length - 1), 5),
    crestFactor: round(crest, 5),
    pseudoSpectralCentroidHz: round(centroid, 2),
    onsetDensity: round(onsetDensity, 5),
    positiveEnergy: round(positiveEnergy / data.length, 5),
    confidence: round(Math.min(1, 0.35 + rms * 2 + onsetDensity * 0.25), 5)
  };
}

export function enhancedGenomeTraits(samples, sampleRate = 48000) {
  const f = enhancedFeatureExtract(samples, sampleRate);
  return {
    transient: clamp01(f.onsetDensity),
    harmonicity: clamp01(1 - f.zeroCrossingRate),
    brightness: clamp01(f.pseudoSpectralCentroidHz / (sampleRate / 2)),
    dynamics: clamp01(f.crestFactor / 8),
    stereoWidth: 0.5,
    confidence: f.confidence,
    enginePackFeatures: f
  };
}

function pseudoSpectralCentroid(samples, sampleRate) {
  let weighted = 0;
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const diff = Math.abs((samples[i] || 0) - (samples[i - 1] || 0));
    const freq = (i / samples.length) * (sampleRate / 2);
    weighted += diff * freq;
    total += diff;
  }
  return total ? weighted / total : 0;
}

function estimateOnsetDensity(samples, sampleRate) {
  const window = Math.max(64, Math.floor(sampleRate / 100));
  let last = 0;
  let onsets = 0;
  for (let i = 0; i < samples.length; i += window) {
    let energy = 0;
    for (let j = i; j < Math.min(samples.length, i + window); j++) energy += Math.abs(samples[j] || 0);
    energy /= window;
    if (energy > last * 1.75 && energy > 0.02) onsets++;
    last = Math.max(last * 0.75, energy);
  }
  return onsets / Math.max(1, samples.length / sampleRate);
}

function findClip(lane, clipId) {
  const clip = lane.clips.find(item => item.id === clipId);
  if (!clip) throw new Error(`Unknown clip ${clipId}`);
  return clip;
}

function touchLane(lane) { lane.updatedAt = new Date().toISOString(); return lane; }
function round(value, places = 4) { const unit = 10 ** places; return Math.round(value * unit) / unit; }
function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
