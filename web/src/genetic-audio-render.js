const DEFAULT_SAMPLE_RATE = 48000;
const TRAITS = ['transient', 'harmonicity', 'brightness', 'dynamics', 'stereoWidth'];

export function createSyntheticGenomeAudio(genome = {}, { durationSeconds = 2.5, sampleRate = DEFAULT_SAMPLE_RATE } = {}) {
  const frames = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const brightness = clamp01(genome.brightness ?? 0.5);
  const harmonicity = clamp01(genome.harmonicity ?? 0.55);
  const transient = clamp01(genome.transient ?? 0.45);
  const dynamics = clamp01(genome.dynamics ?? 0.5);
  const width = clamp01(genome.stereoWidth ?? 0.35);
  const base = 92 + brightness * 310;
  const fifth = base * 1.5;
  const overtone = base * (2 + harmonicity);
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t / 0.018) * Math.exp(-t * (0.18 + transient * 0.34));
    const pulse = Math.sin(t * Math.PI * 2 * (1.8 + transient * 8)) > 0.82 ? transient * 0.12 : 0;
    const body = Math.sin(Math.PI * 2 * base * t) * 0.58 + Math.sin(Math.PI * 2 * fifth * t) * harmonicity * 0.24 + Math.sin(Math.PI * 2 * overtone * t) * brightness * 0.12;
    const movement = Math.sin(Math.PI * 2 * (0.17 + width * 0.35) * t);
    const value = softClip((body + pulse) * envelope * (0.34 + dynamics * 0.44));
    left[i] = value * (1 - width * 0.18 + movement * width * 0.04);
    right[i] = value * (1 + width * 0.18 - movement * width * 0.04);
  }
  return normalizeAudio({ sampleRate, channels: [left, right], source: 'synthetic-genome' }, 0.92);
}

export function renderGeneticAudioVariant(sourceAudio, parentGenome, childGenome, { variantId = null, action = 'genetic_variant' } = {}) {
  assertAudio(sourceAudio);
  const deltas = traitDeltas(parentGenome, childGenome);
  const channels = sourceAudio.channels.map((channel, channelIndex) => processChannel(channel, deltas, childGenome, channelIndex, sourceAudio.sampleRate));
  const audio = normalizeAudio({ sampleRate: sourceAudio.sampleRate || DEFAULT_SAMPLE_RATE, channels, source: action }, 0.94);
  return {
    variantId: variantId || `${action}-${Date.now().toString(36)}`,
    action,
    sampleRate: audio.sampleRate,
    durationSeconds: round(audio.channels[0].length / audio.sampleRate, 4),
    deltas,
    parentTraits: pickTraits(parentGenome),
    childTraits: pickTraits(childGenome),
    metrics: compareAudio(sourceAudio, audio),
    audio
  };
}

export function renderGeneticSet(sourceAudio, parentGenome, variants = []) {
  return variants.map(({ genome, action, variantId }) => renderGeneticAudioVariant(sourceAudio, parentGenome, genome, { action, variantId }));
}

export function buildGeneticRenderProof({ sourceId = 'source', parentGenome, variant, familyId = null } = {}) {
  if (!variant) throw new Error('variant render is required');
  return {
    version: 'macsense-genetic-audio-render-proof-v1',
    sourceId,
    familyId,
    variantId: variant.variantId,
    action: variant.action,
    renderedAudio: true,
    sampleRate: variant.sampleRate,
    durationSeconds: variant.durationSeconds,
    parentTraits: variant.parentTraits,
    childTraits: variant.childTraits,
    deltas: variant.deltas,
    metrics: variant.metrics,
    exportedAt: new Date().toISOString()
  };
}

export function encodeWavBytes(audio) {
  assertAudio(audio);
  const sampleRate = audio.sampleRate || DEFAULT_SAMPLE_RATE;
  const channels = audio.channels;
  const channelCount = channels.length;
  const frames = channels[0].length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}

export function audioToAudioBuffer(audio, context) {
  assertAudio(audio);
  const buffer = context.createBuffer(audio.channels.length, audio.channels[0].length, audio.sampleRate || DEFAULT_SAMPLE_RATE);
  audio.channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
  return buffer;
}

export function playRenderedAudio(audio, context) {
  const audioBuffer = audioToAudioBuffer(audio, context);
  const source = context.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(context.destination);
  source.start();
  return source;
}

function processChannel(channel, deltas, childGenome, channelIndex, sampleRate) {
  const output = new Float32Array(channel.length);
  const brightness = clamp01(childGenome?.brightness ?? 0.5);
  const dynamics = clamp01(childGenome?.dynamics ?? 0.5);
  const transient = clamp01(childGenome?.transient ?? 0.5);
  const width = clamp01(childGenome?.stereoWidth ?? 0.5);
  let previous = 0;
  let smooth = 0;
  const drive = 1 + dynamics * 0.9 + Math.max(0, deltas.dynamics || 0) * 0.8;
  const high = 0.08 + brightness * 0.22;
  const lowKeep = 0.88 - brightness * 0.2;
  const transientLift = 1 + transient * 0.28;
  const panWidth = channelIndex === 0 ? 1 - width * 0.08 : 1 + width * 0.08;
  for (let i = 0; i < channel.length; i++) {
    const dry = channel[i] || 0;
    smooth = smooth * lowKeep + dry * (1 - lowKeep);
    const edge = dry - previous;
    previous = dry;
    const shaped = softClip((smooth + edge * high * transientLift) * drive) * panWidth;
    const tremolo = 1 + Math.sin((i / sampleRate) * Math.PI * 2 * (0.18 + width * 0.34)) * width * 0.035 * (channelIndex ? -1 : 1);
    output[i] = shaped * tremolo;
  }
  return output;
}

function compareAudio(parent, child) {
  const parentMetrics = measureAudio(parent);
  const childMetrics = measureAudio(child);
  return {
    parent: parentMetrics,
    child: childMetrics,
    loudnessLift: round(childMetrics.rms - parentMetrics.rms, 5),
    peakDelta: round(childMetrics.peak - parentMetrics.peak, 5),
    renderedFrames: child.channels[0].length
  };
}

export function measureAudio(audio) {
  assertAudio(audio);
  let sumSq = 0;
  let peak = 0;
  let count = 0;
  for (const channel of audio.channels) {
    for (const value of channel) {
      const sample = Number(value) || 0;
      sumSq += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
      count++;
    }
  }
  return { rms: round(Math.sqrt(sumSq / Math.max(1, count)), 5), peak: round(peak, 5), channels: audio.channels.length, durationSeconds: round(audio.channels[0].length / (audio.sampleRate || DEFAULT_SAMPLE_RATE), 4) };
}

function traitDeltas(parent = {}, child = {}) {
  return Object.fromEntries(TRAITS.map(trait => [trait, round((Number(child[trait]) || 0) - (Number(parent[trait]) || 0), 4)]));
}

function pickTraits(genome = {}) {
  return Object.fromEntries(TRAITS.map(trait => [trait, round(Number(genome[trait]) || 0, 4)]));
}

function normalizeAudio(audio, targetPeak = 0.95) {
  const peak = measureAudio(audio).peak || 1;
  if (peak <= targetPeak) return audio;
  const gain = targetPeak / peak;
  return { ...audio, channels: audio.channels.map(channel => Float32Array.from(channel, value => value * gain)) };
}

function assertAudio(audio) {
  if (!audio || !Array.isArray(audio.channels) || !audio.channels.length) throw new Error('audio channels are required');
  const length = audio.channels[0]?.length || 0;
  if (!length) throw new Error('audio must contain samples');
  if (!audio.channels.every(channel => channel.length === length)) throw new Error('all channels must have the same length');
}

function writeString(view, offset, text) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

function softClip(value) {
  return Math.tanh(value * 1.2) / Math.tanh(1.2);
}

function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function round(value, places = 4) { const unit = 10 ** places; return Math.round((Number(value) || 0) * unit) / unit; }
