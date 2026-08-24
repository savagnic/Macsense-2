import { makeGenome } from './domain.js';
import { saveProject } from './persistence.js';
import { breedFamilySound, buildFamilyTree, ensureFamilyState, evolveSound, resurrectSound } from './sound-family.js';

const FAMILY_CSS = `
.sound-family-panel{border:1px solid rgba(232,184,105,.42);background:linear-gradient(180deg,rgba(16,20,30,.92),rgba(7,8,13,.88));box-shadow:0 24px 90px rgba(0,0,0,.48),inset 0 1px rgba(255,255,255,.11);position:relative;overflow:hidden}
.sound-family-panel::before{content:"";position:absolute;inset:-45%;background:radial-gradient(circle at 20% 15%,rgba(232,184,105,.14),transparent 30%),radial-gradient(circle at 75% 40%,rgba(0,245,212,.12),transparent 30%);pointer-events:none}.sound-family-panel>*{position:relative}
.family-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.75rem 0}.family-actions button{white-space:nowrap}.family-tree{display:grid;gap:.6rem}.family-card{border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(8,10,15,.72);padding:.75rem}.family-card h3{margin:.1rem 0 .45rem;color:#e8bb69}.family-member{display:grid;grid-template-columns:1fr auto;gap:.5rem;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(13,16,24,.82);padding:.5rem;margin-top:.4rem}.family-member b{color:#00f5d4}.family-member small{color:#a99f93}.family-metrics{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,1fr);gap:.25rem;margin-top:.3rem}.family-metrics span{font:800 10px ui-monospace,monospace;color:#d8cec0}.family-events{border-top:1px solid rgba(255,255,255,.1);margin-top:.55rem;padding-top:.4rem}.family-events div{font:800 11px ui-monospace,monospace;color:#d8cec0;margin:.25rem 0}.family-log{max-height:150px;overflow:auto;font:800 11px ui-monospace,monospace}.family-log div{display:grid;grid-template-columns:1fr auto;gap:.5rem;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:.5rem;margin-top:.45rem;background:rgba(10,12,18,.8)}.family-log b{color:#00f5d4}.family-badge{display:inline-flex;margin:.2rem .25rem .2rem 0;border:1px solid rgba(0,245,212,.38);border-radius:999px;padding:.25rem .45rem;color:#00f5d4;font:900 10px ui-monospace,monospace}
@media(max-width:900px){.family-metrics{grid-template-columns:1fr 1fr}}
`;

let familyProject = null;
let familyEvents = [];

function $(selector) { return document.querySelector(selector); }
function html(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

function log(message, result = 'PASS') {
  familyEvents.unshift({ message, result, at: new Date().toLocaleTimeString() });
  familyEvents = familyEvents.slice(0, 20);
  const el = $('#sound-family-log');
  if (!el) return;
  el.innerHTML = familyEvents.map(event => `<div><span>${html(event.at)} · ${html(event.message)}</span><b>${html(event.result)}</b></div>`).join('');
}

export function mountSoundFamilyExperience(project = null) {
  if ($('#sound-family-panel')) return;
  familyProject = ensureFamilyState(project || createDemoFamilyProject());
  const style = document.createElement('style');
  style.textContent = FAMILY_CSS;
  document.head.append(style);

  const panel = document.createElement('section');
  panel.id = 'sound-family-panel';
  panel.className = 'panel sound-family-panel';
  panel.innerHTML = `
    <div class="panel-title compact"><div><span class="eyebrow">GENETIC SOUND</span><h2>Families + Resurrection</h2></div><span class="live-dot">ENGINE</span></div>
    <p>SoundGenome ancestry is now visible: families, breeding, resurrection, evolution direction, and proof logs backed by the same domain model.</p>
    <div class="family-actions">
      <button id="family-seed">Seed Family</button>
      <button id="family-breed" class="ghost">Breed</button>
      <button id="family-resurrect" class="ghost">Resurrect</button>
      <button id="family-evolve" class="ghost">Evolve</button>
      <button id="family-save" class="ghost">Save Family Proof</button>
    </div>
    <div id="sound-family-tree" class="family-tree"></div>
    <div id="sound-family-log" class="family-log"><div><span>Boot · sound family panel mounted</span><b>READY</b></div></div>`;

  const sideStack = $('.side-stack') || document.body;
  sideStack.prepend(panel);
  $('#family-seed')?.addEventListener('click', seedFamily);
  $('#family-breed')?.addEventListener('click', breedDemo);
  $('#family-resurrect')?.addEventListener('click', resurrectDemo);
  $('#family-evolve')?.addEventListener('click', evolveDemo);
  $('#family-save')?.addEventListener('click', saveFamilyProof);
  renderFamilyTree();
  log('Sound family experience mounted');
}

function createDemoFamilyProject() {
  const project = ensureFamilyState({
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: 'Genetic Sound Family Session',
    bpm: 146,
    lyrics: 'Sound families, resurrection, and evolution should feel visible and real.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tracks: [], genomes: [], lineage: [], soundFamilies: [], mastering: { targetLufs: -14, ceilingDb: -1 }, ariHistory: []
  });
  project.genomes.push(
    makeGenome({ sourceId: 'vinny-vocal-root', transient: .64, harmonicity: .72, brightness: .61, dynamics: .76, stereoWidth: .36, confidence: .94 }),
    makeGenome({ sourceId: 'hook-air-reference', transient: .42, harmonicity: .66, brightness: .88, dynamics: .52, stereoWidth: .74, confidence: .91 })
  );
  return project;
}

function seedFamily() {
  familyProject = createDemoFamilyProject();
  ensureFamilyState(familyProject);
  renderFamilyTree();
  log('Seeded genetic sound family');
}

function breedDemo() {
  ensureFamilyState(familyProject);
  const [a, b] = familyProject.genomes;
  const { child } = breedFamilySound(familyProject, a.sourceId, b.sourceId, ['brightness', 'stereoWidth']);
  renderFamilyTree();
  log(`Bred child ${child.sourceId}`);
}

function resurrectDemo() {
  ensureFamilyState(familyProject);
  const source = familyProject.genomes[0];
  const { child } = resurrectSound(familyProject, source.sourceId, ['hook-ghost']);
  renderFamilyTree();
  log(`Resurrected ${child.sourceId}`);
}

function evolveDemo() {
  ensureFamilyState(familyProject);
  const source = familyProject.genomes.at(-1) || familyProject.genomes[0];
  const { child } = evolveSound(familyProject, source.sourceId, 'cinematic');
  renderFamilyTree();
  log(`Evolved ${child.sourceId}`);
}

async function saveFamilyProof() {
  try {
    familyProject.updatedAt = new Date().toISOString();
    await saveProject(familyProject);
    log('Saved family proof to IndexedDB');
    const status = $('#status');
    if (status) status.textContent = 'Genetic sound family proof saved locally';
  } catch (error) {
    log(error.message, 'FAIL');
  }
}

function renderFamilyTree() {
  ensureFamilyState(familyProject);
  if (!familyProject.soundFamilies.length) {
    for (const genome of familyProject.genomes) {
      familyProject.soundFamilies.push({
        id: `family-${genome.sourceId}`,
        root: genome.sourceId,
        name: genome.sourceId.includes('vocal') ? 'Vinny Vocal Family' : 'Reference Texture Family',
        members: [genome.sourceId],
        createdAt: new Date().toISOString()
      });
    }
  }
  const tree = buildFamilyTree(familyProject);
  const el = $('#sound-family-tree');
  if (!el) return;
  el.innerHTML = tree.map(family => `<article class="family-card">
    <h3>${html(family.name)}</h3>
    <span class="family-badge">root ${html(family.root)}</span><span class="family-badge">${family.members.length} members</span>
    ${family.members.map(memberCard).join('')}
    <div class="family-events">${family.events.length ? family.events.map(event => `<div>${html(event.type)} → ${html(event.child)} ${event.direction ? `(${html(event.direction)})` : ''}</div>`).join('') : '<div>No lineage events yet.</div>'}</div>
  </article>`).join('');
}

function memberCard(genome) {
  return `<div class="family-member"><span><b>${html(genome.sourceId)}</b><br><small>${html((genome.tags || []).join(', ') || 'base genome')} · generation ${genome.generation || 0}</small></span><strong>${Math.round((genome.confidence || 0) * 100)}%</strong><div class="family-metrics">
    ${['transient','harmonicity','brightness','dynamics','stereoWidth'].map(key => `<span>${key}: ${Math.round((genome[key] || 0) * 100)}</span>`).join('')}
  </div></div>`;
}

if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => mountSoundFamilyExperience(), { once: true });
}
