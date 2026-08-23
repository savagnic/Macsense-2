export const TRAITS = ['transient', 'harmonicity', 'brightness', 'dynamics', 'stereoWidth'];

export function clamp01(v) { return Math.max(0, Math.min(1, Number(v) || 0)); }

export function makeGenome(input = {}) {
  const genome = {
    sourceId: String(input.sourceId || crypto.randomUUID()),
    transient: clamp01(input.transient),
    harmonicity: clamp01(input.harmonicity),
    brightness: clamp01(input.brightness),
    dynamics: clamp01(input.dynamics),
    stereoWidth: clamp01(input.stereoWidth),
    confidence: clamp01(input.confidence ?? 1),
    parents: Array.isArray(input.parents) ? [...input.parents] : []
  };
  return genome;
}

export function breedGenomes(a, b, traitsFromB = []) {
  const selected = new Set(traitsFromB);
  const out = makeGenome({
    sourceId: `${a.sourceId}×${b.sourceId}`,
    transient: selected.has('transient') ? b.transient : a.transient,
    harmonicity: selected.has('harmonicity') ? b.harmonicity : a.harmonicity,
    brightness: selected.has('brightness') ? b.brightness : a.brightness,
    dynamics: selected.has('dynamics') ? b.dynamics : a.dynamics,
    stereoWidth: selected.has('stereoWidth') ? b.stereoWidth : a.stereoWidth,
    confidence: Math.min(a.confidence, b.confidence),
    parents: [a.sourceId, b.sourceId]
  });
  return out;
}

export function genomeDistance(a, b) {
  const mean = TRAITS.reduce((n, key) => n + (a[key] - b[key]) ** 2, 0) / TRAITS.length;
  return Math.sqrt(mean);
}

export function newProject(name = 'Untitled Session') {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name,
    bpm: 120,
    lyrics: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: [
      { id: 'intro', name: 'Intro' },
      { id: 'verse1', name: 'Verse' },
      { id: 'hook', name: 'Hook' },
      { id: 'bridge', name: 'Bridge' },
      { id: 'outro', name: 'Outro' }
    ],
    tracks: [],
    genomes: [],
    lineage: [],
    mastering: { targetLufs: -14, ceilingDb: -1, warmth: 0.35, width: 0.5, punch: 0.45 },
    ariHistory: []
  };
}

export function touchProject(project) {
  project.updatedAt = new Date().toISOString();
  return project;
}
