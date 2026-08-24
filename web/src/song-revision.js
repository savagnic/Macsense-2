export function splitIntoBars(text = '') {
  const raw = String(text || '').replace(/\r/g, '').split(/\n+/).map(line => line.trim()).filter(Boolean);
  const lines = raw.length ? raw : [''];
  return lines.map((line, index) => makeBar({ index, seed: line }));
}

export function makeBar({ index = 0, seed = '', generated = '', section = null } = {}) {
  const id = `bar-${index + 1}-${slug(seed || generated || 'empty')}`;
  const original = String(seed || '').trim();
  const draft = String(generated || original || '').trim();
  return {
    id,
    index,
    section: section || sectionForIndex(index),
    original,
    generated: draft,
    current: draft,
    status: original ? 'seeded' : 'empty',
    variants: draft ? [{ id: `${id}-draft`, source: 'initial', text: draft, kept: true }] : [],
    notes: [],
    updatedAt: new Date().toISOString()
  };
}

export function createRevisionSession({ title = 'Untitled Revision', seedLyrics = '', generatedLyrics = '' } = {}) {
  const seedBars = splitIntoBars(seedLyrics);
  const generatedBars = splitIntoBars(generatedLyrics);
  const total = Math.max(seedBars.length, generatedBars.length, 8);
  const bars = Array.from({ length: total }, (_, index) => {
    const seed = seedBars[index]?.original || '';
    const generated = generatedBars[index]?.original || generatedBars[index]?.generated || '';
    return makeBar({ index, seed, generated });
  });
  return {
    schemaVersion: 1,
    id: `revision-${Date.now().toString(36)}`,
    title,
    source: 'half-written-song-to-generated-draft',
    bars,
    decisions: [],
    exportedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function addBarVariant(session, barId, text, { source = 'manual', note = '' } = {}) {
  const bar = findBar(session, barId);
  const variant = {
    id: `${bar.id}-v${bar.variants.length + 1}`,
    source,
    text: String(text || '').trim(),
    note,
    kept: false,
    createdAt: new Date().toISOString()
  };
  if (!variant.text) throw new Error('Variant text is required');
  bar.variants.push(variant);
  bar.status = 'reviewing';
  touch(session, `variant:${bar.id}`);
  return variant;
}

export function keepVariant(session, barId, variantId) {
  const bar = findBar(session, barId);
  const variant = bar.variants.find(item => item.id === variantId);
  if (!variant) throw new Error(`Unknown variant ${variantId}`);
  for (const item of bar.variants) item.kept = false;
  variant.kept = true;
  bar.current = variant.text;
  bar.status = 'kept';
  session.decisions.push({ type: 'keep_variant', barId, variantId, text: variant.text, at: new Date().toISOString() });
  touch(session, `keep:${bar.id}`);
  return bar;
}

export function rewriteBar(session, barId, instruction = 'make it better') {
  const bar = findBar(session, barId);
  const base = bar.current || bar.generated || bar.original || 'new line';
  const rewritten = localRewrite(base, instruction, bar.index);
  return addBarVariant(session, barId, rewritten, { source: 'ari-local-rewrite', note: instruction });
}

export function replaceBar(session, barId, text) {
  const variant = addBarVariant(session, barId, text, { source: 'manual-replace', note: 'artist replacement' });
  return keepVariant(session, barId, variant.id);
}

export function markBar(session, barId, status, note = '') {
  const allowed = new Set(['empty', 'seeded', 'reviewing', 'kept', 'needs_work', 'locked']);
  if (!allowed.has(status)) throw new Error(`Unsupported bar status ${status}`);
  const bar = findBar(session, barId);
  bar.status = status;
  if (note) bar.notes.push({ text: note, at: new Date().toISOString() });
  touch(session, `mark:${bar.id}:${status}`);
  return bar;
}

export function assembleSong(session, { includeSectionLabels = true } = {}) {
  const lines = [];
  let lastSection = null;
  for (const bar of session.bars) {
    if (includeSectionLabels && bar.section !== lastSection) {
      lines.push(`[${bar.section.toUpperCase()}]`);
      lastSection = bar.section;
    }
    lines.push(bar.current || bar.generated || bar.original || '');
  }
  return lines.join('\n').trim();
}

export function revisionStats(session) {
  const total = session.bars.length;
  const kept = session.bars.filter(bar => bar.status === 'kept' || bar.status === 'locked').length;
  const needsWork = session.bars.filter(bar => bar.status === 'needs_work' || bar.status === 'reviewing').length;
  const variants = session.bars.reduce((sum, bar) => sum + bar.variants.length, 0);
  return {
    totalBars: total,
    keptBars: kept,
    needsWork,
    variants,
    completion: total ? kept / total : 0,
    decisions: session.decisions.length
  };
}

export function exportRevisionProof(session) {
  return {
    version: 'bar-revision-v1',
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    stats: revisionStats(session),
    assembledSong: assembleSong(session),
    bars: session.bars.map(bar => ({
      id: bar.id,
      index: bar.index,
      section: bar.section,
      original: bar.original,
      generated: bar.generated,
      current: bar.current,
      status: bar.status,
      variants: bar.variants
    })),
    decisions: session.decisions
  };
}

function findBar(session, barId) {
  if (!session?.bars) throw new Error('Revision session is required');
  const bar = session.bars.find(item => item.id === barId);
  if (!bar) throw new Error(`Unknown bar ${barId}`);
  return bar;
}

function touch(session, reason) {
  session.updatedAt = new Date().toISOString();
  session.lastMutation = reason;
  return session;
}

function sectionForIndex(index) {
  if (index < 2) return 'intro';
  if (index < 6) return 'verse';
  if (index < 10) return 'hook';
  if (index < 14) return 'verse2';
  return 'outro';
}

function slug(text) {
  return String(text || 'bar').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'bar';
}

function localRewrite(line, instruction, index) {
  const clean = String(line || '').trim().replace(/\s+/g, ' ');
  const intent = String(instruction || '').toLowerCase();
  if (intent.includes('harder') || intent.includes('punch')) return `${clean} / hit harder when the room goes quiet`;
  if (intent.includes('simple')) return clean.split(/\s+/).slice(0, 8).join(' ');
  if (intent.includes('melody') || intent.includes('sing')) return `${clean} — let it float on bar ${index + 1}`;
  if (intent.includes('dark')) return `${clean} in the low light`;
  return `${clean} / make the next bar answer this`;
}
