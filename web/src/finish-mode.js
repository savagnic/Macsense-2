export const FINISH_MODE_VERSION = 'macsense-finish-pack-v1';

export const REQUIRED_FINISH_EXPORTS = Object.freeze([
  'session-receipt.json',
  'lyrics-sheet.md',
  'revision-proof.json',
  'family-tree.json',
  'mastering-report.json',
  'audible-genetic-proof.json'
]);

export function buildLyricsSheet(project = {}, revisionSession = null) {
  const title = project.name || project.title || 'MacSense Session';
  const bpm = project.bpm || project.tempo || 120;
  const assembled = revisionSession?.assembledSong || revisionSession?.finalSong || null;
  const lines = assembled || project.lyrics || project.draftLyrics || '';
  return [
    `# ${title}`,
    '',
    `BPM: ${bpm}`,
    `Source: MacSense Finish Mode`,
    '',
    '## Lyrics',
    '',
    String(lines || '').trim() || '_No lyrics captured yet._',
    '',
    '## Session Notes',
    '',
    '- Generated from local project state.',
    '- Artist decisions remain editable in the source session.',
    '- Use revision proof for bar-level decision history.'
  ].join('\n');
}

export function buildRevisionProof(revisionSession = null) {
  const bars = revisionSession?.bars || [];
  return {
    version: 'macsense-revision-proof-v1',
    present: Boolean(revisionSession),
    title: revisionSession?.title || 'Bar-by-Bar Revision',
    barCount: bars.length,
    lockedBars: bars.filter(bar => bar.locked).length,
    needsWorkBars: bars.filter(bar => bar.status === 'needs_work').length,
    keptBars: bars.filter(bar => bar.status === 'kept' || bar.locked).length,
    bars: bars.map((bar, index) => ({
      index: bar.index ?? index,
      section: bar.section || 'song',
      status: bar.status || 'draft',
      locked: Boolean(bar.locked),
      seed: bar.seed || bar.seedText || '',
      generated: bar.generated || bar.generatedText || '',
      current: bar.current || bar.currentText || bar.text || '',
      variants: (bar.variants || []).slice(-5)
    }))
  };
}

export function buildFamilyTreeReceipt(project = {}, familyTree = null) {
  const families = familyTree || project.soundFamilies || [];
  const lineage = project.lineage || [];
  const genomes = project.genomes || [];
  return {
    version: 'macsense-family-tree-v1',
    familyCount: families.length,
    genomeCount: genomes.length,
    lineageEvents: lineage.length,
    families: families.map((family, index) => ({
      id: family.id || `family-${index + 1}`,
      name: family.name || `Family ${index + 1}`,
      root: family.root || null,
      members: family.members || [],
      eventCount: lineage.filter(event => event.familyId === family.id).length
    })),
    lineage: lineage.map(event => ({
      type: event.type,
      child: event.child,
      parents: event.parents || [],
      traits: event.traits || [],
      direction: event.direction || null,
      familyId: event.familyId || null,
      createdAt: event.createdAt || null
    }))
  };
}

export function buildMasteringReport({ project = {}, mastering = {}, measures = null } = {}) {
  const settings = {
    preset: mastering.preset || project.mastering?.preset || 'streaming_clean',
    targetLufs: Number(mastering.targetLufs ?? project.mastering?.targetLufs ?? -14),
    ceilingDbtp: Number(mastering.ceilingDbtp ?? project.mastering?.ceilingDbtp ?? -1),
    warmth: Number(mastering.warmth ?? project.mastering?.warmth ?? 0),
    width: Number(mastering.width ?? project.mastering?.width ?? 0),
    punch: Number(mastering.punch ?? project.mastering?.punch ?? 0)
  };
  return {
    version: 'macsense-mastering-report-v1',
    settings,
    measured: measures || null,
    exportFormat: 'WAV 48 kHz target path',
    notes: [
      'Mastering report captures intent and target settings.',
      'Use rendered WAV export for final audio verification.'
    ]
  };
}

export function buildSessionReceipt({ project = {}, revisionProof, familyTree, masteringReport, geneticProofs = [] } = {}) {
  const tracks = project.tracks || [];
  const genomes = project.genomes || [];
  return {
    version: 'macsense-session-receipt-v1',
    projectId: project.id || null,
    projectName: project.name || project.title || 'MacSense Session',
    bpm: project.bpm || project.tempo || 120,
    exportedAt: new Date().toISOString(),
    systems: {
      proofMode: true,
      barRevision: Boolean(revisionProof?.present),
      soundGenetics: genomes.length > 0 || (familyTree?.familyCount || 0) > 0,
      audibleGeneticSound: geneticProofs.length > 0,
      mastering: Boolean(masteringReport)
    },
    counts: {
      tracks: tracks.length,
      genomes: genomes.length,
      families: familyTree?.familyCount || 0,
      lineageEvents: familyTree?.lineageEvents || 0,
      revisionBars: revisionProof?.barCount || 0,
      geneticAudioProofs: geneticProofs.length
    }
  };
}

export function buildFinishPack({ project = {}, revisionSession = null, familyTree = null, mastering = {}, measures = null, geneticProofs = [], wavBytes = null } = {}) {
  const revisionProof = buildRevisionProof(revisionSession);
  const familyReceipt = buildFamilyTreeReceipt(project, familyTree);
  const masteringReport = buildMasteringReport({ project, mastering, measures });
  const sessionReceipt = buildSessionReceipt({ project, revisionProof, familyTree: familyReceipt, masteringReport, geneticProofs });
  const lyricsSheet = buildLyricsSheet(project, revisionSession);
  const files = [
    textFile('session-receipt.json', sessionReceipt),
    textFile('lyrics-sheet.md', lyricsSheet, 'text/markdown'),
    textFile('revision-proof.json', revisionProof),
    textFile('family-tree.json', familyReceipt),
    textFile('mastering-report.json', masteringReport),
    textFile('audible-genetic-proof.json', { version: 'macsense-audible-genetic-proof-list-v1', count: geneticProofs.length, proofs: geneticProofs })
  ];
  if (wavBytes) files.push(binaryFile('audible-genetic-preview.wav', wavBytes, 'audio/wav'));
  return {
    version: FINISH_MODE_VERSION,
    createdAt: sessionReceipt.exportedAt,
    projectName: sessionReceipt.projectName,
    fileCount: files.length,
    requiredComplete: REQUIRED_FINISH_EXPORTS.every(name => files.some(file => file.name === name)),
    files
  };
}

export function finishPackToBlob(pack) {
  return new Blob([JSON.stringify(pack, null, 2)], { type: 'application/vnd.macsense.finish-pack+json' });
}

export function downloadFinishPack(pack, filename = 'macsense-finish-pack.json') {
  const blob = finishPackToBlob(pack);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function textFile(name, content, contentType = 'application/json') {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  return { name, contentType, encoding: 'utf-8', sizeBytes: new TextEncoder().encode(text).length, content: text };
}

function binaryFile(name, bytes, contentType) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  return { name, contentType, encoding: 'base64', sizeBytes: data.byteLength, content: bytesToBase64(data) };
}

export function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
