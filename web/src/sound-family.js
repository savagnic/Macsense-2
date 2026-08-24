import { TRAITS, makeGenome, breedGenomes, genomeDistance } from './domain.js';

export const EVOLUTION_DIRECTIONS = {
  aggressive: { transient: 0.18, dynamics: 0.16, brightness: 0.08 },
  airy: { brightness: 0.20, stereoWidth: 0.14, harmonicity: 0.06 },
  club: { transient: 0.12, dynamics: 0.18, stereoWidth: 0.08 },
  cinematic: { stereoWidth: 0.22, harmonicity: 0.10, dynamics: -0.04 },
  intimate: { stereoWidth: -0.14, brightness: -0.06, harmonicity: 0.10 },
  weird: { harmonicity: -0.18, brightness: 0.16, stereoWidth: 0.18 }
};

export function ensureFamilyState(project) {
  project.genomes ||= [];
  project.lineage ||= [];
  project.soundFamilies ||= [];
  return project;
}

export function familyForGenome(project, genomeId) {
  ensureFamilyState(project);
  const existing = project.soundFamilies.find(family => family.members.includes(genomeId));
  if (existing) return existing;
  const family = {
    id: `family-${String(genomeId).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 48)}`,
    root: genomeId,
    name: `Family ${project.soundFamilies.length + 1}`,
    members: [genomeId],
    createdAt: new Date().toISOString()
  };
  project.soundFamilies.push(family);
  return family;
}

export function addGenomeToFamily(project, genome, familyId = null) {
  ensureFamilyState(project);
  if (!project.genomes.some(existing => existing.sourceId === genome.sourceId)) project.genomes.push(genome);
  let family = familyId ? project.soundFamilies.find(item => item.id === familyId) : null;
  if (!family) family = familyForGenome(project, genome.parents?.[0] || genome.sourceId);
  if (!family.members.includes(genome.sourceId)) family.members.push(genome.sourceId);
  return family;
}

export function breedFamilySound(project, parentAId, parentBId, traitsFromB = ['brightness', 'dynamics']) {
  ensureFamilyState(project);
  const parentA = project.genomes.find(genome => genome.sourceId === parentAId);
  const parentB = project.genomes.find(genome => genome.sourceId === parentBId);
  if (!parentA || !parentB) throw new Error('Choose two valid parent genomes to breed a sound family child');
  const child = breedGenomes(parentA, parentB, traitsFromB);
  child.sourceId = `${parentA.sourceId}×${parentB.sourceId}#${Date.now().toString(36)}`;
  child.generation = Math.max(parentA.generation || 0, parentB.generation || 0) + 1;
  const family = addGenomeToFamily(project, child, familyForGenome(project, parentA.sourceId).id);
  project.lineage.push({
    type: 'breed',
    child: child.sourceId,
    parents: [parentA.sourceId, parentB.sourceId],
    traits: traitsFromB,
    distanceFromParentA: round(genomeDistance(parentA, child)),
    distanceFromParentB: round(genomeDistance(parentB, child)),
    familyId: family.id,
    createdAt: new Date().toISOString()
  });
  return { child, family };
}

export function resurrectSound(project, sourceId, tags = []) {
  ensureFamilyState(project);
  const source = project.genomes.find(genome => genome.sourceId === sourceId);
  if (!source) throw new Error(`Cannot resurrect missing sound genome ${sourceId}`);
  const resurrected = makeGenome({
    ...source,
    sourceId: `${source.sourceId}↻${Date.now().toString(36)}`,
    parents: [source.sourceId],
    confidence: source.confidence,
    transient: nudge(source.transient, 0.03),
    harmonicity: nudge(source.harmonicity, 0.02),
    brightness: nudge(source.brightness, -0.02),
    dynamics: nudge(source.dynamics, 0.04),
    stereoWidth: nudge(source.stereoWidth, 0.03)
  });
  resurrected.tags = ['resurrection', ...tags];
  resurrected.generation = (source.generation || 0) + 1;
  const family = addGenomeToFamily(project, resurrected, familyForGenome(project, source.sourceId).id);
  project.lineage.push({
    type: 'resurrection',
    child: resurrected.sourceId,
    parents: [source.sourceId],
    traits: ['resurrection'],
    distanceFromSource: round(genomeDistance(source, resurrected)),
    familyId: family.id,
    createdAt: new Date().toISOString()
  });
  return { child: resurrected, family };
}

export function evolveSound(project, sourceId, direction = 'aggressive') {
  ensureFamilyState(project);
  const source = project.genomes.find(genome => genome.sourceId === sourceId);
  if (!source) throw new Error(`Cannot evolve missing sound genome ${sourceId}`);
  const recipe = EVOLUTION_DIRECTIONS[direction] || EVOLUTION_DIRECTIONS.aggressive;
  const evolved = makeGenome({
    ...source,
    sourceId: `${source.sourceId}→${direction}#${Date.now().toString(36)}`,
    parents: [source.sourceId],
    confidence: Math.max(0.1, source.confidence * 0.96),
    ...Object.fromEntries(TRAITS.map(trait => [trait, nudge(source[trait], recipe[trait] || 0)]))
  });
  evolved.tags = ['evolution', direction];
  evolved.generation = (source.generation || 0) + 1;
  const family = addGenomeToFamily(project, evolved, familyForGenome(project, source.sourceId).id);
  project.lineage.push({
    type: 'evolution',
    child: evolved.sourceId,
    parents: [source.sourceId],
    traits: Object.keys(recipe),
    direction,
    distanceFromSource: round(genomeDistance(source, evolved)),
    familyId: family.id,
    createdAt: new Date().toISOString()
  });
  return { child: evolved, family };
}

export function buildFamilyTree(project) {
  ensureFamilyState(project);
  const genomes = new Map(project.genomes.map(genome => [genome.sourceId, genome]));
  return project.soundFamilies.map(family => ({
    ...family,
    members: family.members.map(id => genomes.get(id)).filter(Boolean),
    events: project.lineage.filter(event => event.familyId === family.id)
  }));
}

function nudge(value, amount) {
  return Math.max(0, Math.min(1, Number(value || 0) + amount));
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
