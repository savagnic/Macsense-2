export class WebAudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.tracks = new Map();
    this.startedAt = 0;
    this.offset = 0;
    this.playing = false;
  }

  async ensureContext() {
    if (!this.context) {
      const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API is unavailable in this browser');
      this.context = new AudioCtx({ latencyHint: 'interactive' });
      this.master = this.context.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context;
  }

  async decodeFile(file) {
    const ctx = await this.ensureContext();
    const bytes = await file.arrayBuffer();
    return ctx.decodeAudioData(bytes.slice(0));
  }

  async addTrack({ id = crypto.randomUUID(), name, file, buffer, color = 'gold' }) {
    const ctx = await this.ensureContext();
    const audioBuffer = buffer || await this.decodeFile(file);
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    gain.connect(pan).connect(this.master);
    const track = {
      id,
      name: name || file?.name || `Track ${this.tracks.size + 1}`,
      buffer: audioBuffer,
      gain,
      pan,
      volume: 1,
      panValue: 0,
      muted: false,
      solo: false,
      color,
      sources: []
    };
    this.tracks.set(id, track);
    return track;
  }

  removeTrack(id) {
    const track = this.tracks.get(id);
    if (!track) return;
    for (const source of track.sources) { try { source.stop(); } catch {} }
    track.gain.disconnect();
    track.pan.disconnect();
    this.tracks.delete(id);
  }

  setTrackState(id, patch = {}) {
    const track = this.tracks.get(id);
    if (!track) throw new Error(`Unknown track ${id}`);
    if (patch.volume !== undefined) track.volume = Math.max(0, Math.min(2, Number(patch.volume)));
    if (patch.pan !== undefined) track.panValue = Math.max(-1, Math.min(1, Number(patch.pan)));
    if (patch.muted !== undefined) track.muted = Boolean(patch.muted);
    if (patch.solo !== undefined) track.solo = Boolean(patch.solo);
    this.applyMixState();
    return this.snapshotTrack(track);
  }

  applyMixState() {
    const hasSolo = [...this.tracks.values()].some(t => t.solo);
    for (const track of this.tracks.values()) {
      const audible = !track.muted && (!hasSolo || track.solo);
      track.gain.gain.value = audible ? track.volume : 0;
      track.pan.pan.value = track.panValue;
    }
  }

  snapshotTrack(track) {
    return {
      id: track.id, name: track.name, duration: track.buffer.duration,
      volume: track.volume, pan: track.panValue, muted: track.muted, solo: track.solo
    };
  }

  snapshot() { return [...this.tracks.values()].map(t => this.snapshotTrack(t)); }

  async play(offset = this.offset) {
    const ctx = await this.ensureContext();
    this.stopSources(false);
    this.applyMixState();
    const now = ctx.currentTime + 0.035;
    for (const track of this.tracks.values()) {
      if (offset >= track.buffer.duration) continue;
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;
      source.connect(track.gain);
      source.start(now, offset);
      track.sources.push(source);
    }
    this.startedAt = now;
    this.offset = offset;
    this.playing = true;
  }

  pause() {
    if (!this.context || !this.playing) return;
    this.offset = this.currentTime();
    this.stopSources(false);
    this.playing = false;
  }

  stop() {
    this.stopSources(false);
    this.offset = 0;
    this.playing = false;
  }

  seek(seconds) {
    const target = Math.max(0, Number(seconds) || 0);
    const resume = this.playing;
    this.stopSources(false);
    this.offset = target;
    this.playing = false;
    if (resume) return this.play(target);
  }

  stopSources(clear = true) {
    for (const track of this.tracks.values()) {
      for (const source of track.sources) { try { source.stop(); } catch {} try { source.disconnect(); } catch {} }
      track.sources.length = 0;
    }
    if (clear) this.offset = 0;
  }

  currentTime() {
    if (!this.context || !this.playing) return this.offset;
    return this.offset + Math.max(0, this.context.currentTime - this.startedAt);
  }

  duration() {
    return Math.max(0, ...[...this.tracks.values()].map(t => t.buffer.duration));
  }

  async renderMix({ sampleRate = 48000 } = {}) {
    const duration = this.duration();
    if (!duration) throw new Error('Add at least one audio track before exporting');
    const frames = Math.ceil(duration * sampleRate);
    const offline = new OfflineAudioContext(2, frames, sampleRate);
    const destination = offline.createGain();
    destination.connect(offline.destination);
    const hasSolo = [...this.tracks.values()].some(t => t.solo);
    for (const track of this.tracks.values()) {
      if (track.muted || (hasSolo && !track.solo)) continue;
      const src = offline.createBufferSource();
      src.buffer = track.buffer;
      const gain = offline.createGain(); gain.gain.value = track.volume;
      const pan = offline.createStereoPanner(); pan.pan.value = track.panValue;
      src.connect(gain).connect(pan).connect(destination);
      src.start(0);
    }
    return offline.startRendering();
  }
}

export function analyzeBuffer(buffer) {
  const channel = buffer.getChannelData(0);
  const count = Math.min(channel.length, 262144);
  let sumSq = 0, peak = 0, crossings = 0, previous = channel[0] || 0;
  let highDiff = 0;
  for (let i = 0; i < count; i++) {
    const x = channel[i];
    sumSq += x * x;
    peak = Math.max(peak, Math.abs(x));
    if ((x >= 0) !== (previous >= 0)) crossings++;
    highDiff += Math.abs(x - previous);
    previous = x;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, count));
  const zcr = crossings / Math.max(1, count);
  const roughness = highDiff / Math.max(1, count);
  return {
    transient: Math.min(1, peak / Math.max(0.001, rms * 4)),
    harmonicity: Math.max(0, Math.min(1, 1 - zcr * 12)),
    brightness: Math.max(0, Math.min(1, roughness * 18)),
    dynamics: Math.max(0, Math.min(1, (peak - rms) * 2.5)),
    stereoWidth: buffer.numberOfChannels > 1 ? estimateStereoWidth(buffer, count) : 0,
    confidence: Math.min(1, count / 65536)
  };
}

function estimateStereoWidth(buffer, count) {
  const a = buffer.getChannelData(0), b = buffer.getChannelData(1);
  let diff = 0, sum = 0;
  for (let i = 0; i < count; i++) { diff += Math.abs(a[i] - b[i]); sum += Math.abs(a[i]) + Math.abs(b[i]); }
  return Math.max(0, Math.min(1, diff / Math.max(0.0001, sum)));
}
