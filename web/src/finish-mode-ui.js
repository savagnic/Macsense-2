import { buildFinishPack, downloadFinishPack } from './finish-mode.js';
import { createSyntheticGenomeAudio, renderGeneticAudioVariant, buildGeneticRenderProof, encodeWavBytes } from './genetic-audio-render.js';

const CSS = `
.finish-mode-panel{border:1px solid rgba(232,184,105,.42);background:linear-gradient(180deg,rgba(18,15,20,.96),rgba(7,9,14,.92));box-shadow:0 28px 90px rgba(0,0,0,.54),inset 0 1px rgba(255,255,255,.12);position:relative;overflow:hidden}.finish-mode-panel:before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle,rgba(232,184,105,.18),transparent 32%),conic-gradient(from 120deg,transparent,rgba(0,245,212,.12),transparent 35%,rgba(232,184,105,.13),transparent 70%);animation:finishModeDrift 34s linear infinite;pointer-events:none}.finish-mode-panel>*{position:relative}.finish-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin:.75rem 0}.finish-card{border:1px solid rgba(255,255,255,.12);background:rgba(6,8,12,.72);border-radius:16px;padding:.72rem;margin:.55rem 0}.finish-card b{display:block;color:#fff4df;font-size:12px}.finish-card small{display:block;color:#9e978b;line-height:1.35;margin-top:.25rem}.finish-files{display:grid;grid-template-columns:1fr 1fr;gap:.42rem}.finish-file{border:1px solid rgba(232,184,105,.18);border-radius:12px;padding:.45rem;background:rgba(255,255,255,.035);font:800 10px ui-monospace,monospace;color:#d9d1c4}.finish-file span{display:block;color:#e8b869}.finish-json{max-height:180px;overflow:auto;white-space:pre-wrap;color:#d8d0c2;font:800 10px ui-monospace,monospace}@keyframes finishModeDrift{to{transform:rotate(360deg)}}@media(max-width:900px){.finish-files{grid-template-columns:1fr}}
`;

let activePack = null;

function $(selector) { return document.querySelector(selector); }
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

function demoProject() {
  return {
    id: 'finish-mode-demo',
    name: 'MacSense Finish Session',
    bpm: 146,
    lyrics: 'I built the room then I made it breathe\nEvery bar got a receipt\nSound came back with a family name\nNow the export carries proof with the beat',
    tracks: [{ id: 'lead', name: 'Lead Vocal' }, { id: 'beat', name: 'Reference Beat' }],
    mastering: { preset: 'streaming_clean', targetLufs: -14, ceilingDbtp: -1, warmth: 0.32, width: 0.58, punch: 0.48 },
    genomes: [{ sourceId: 'parent-tone', transient: .42, harmonicity: .68, brightness: .52, dynamics: .57, stereoWidth: .36, confidence: .91 }],
    soundFamilies: [{ id: 'family-parent-tone', name: 'Family 1', root: 'parent-tone', members: ['parent-tone', 'child-tone'] }],
    lineage: [{ type: 'evolution', child: 'child-tone', parents: ['parent-tone'], traits: ['brightness','dynamics'], direction: 'club', familyId: 'family-parent-tone', createdAt: new Date().toISOString() }]
  };
}

function demoRevision() {
  return {
    title: 'Demo Bar Revision',
    assembledSong: 'I built the room then I made it breathe\nEvery bar got a receipt\nSound came back with a family name\nNow the export carries proof with the beat',
    bars: [
      { index: 0, section: 'verse', status: 'kept', locked: true, seed: 'I built the room', generated: 'I built the room then I made it breathe', current: 'I built the room then I made it breathe', variants: ['I built the room and let the system breathe'] },
      { index: 1, section: 'verse', status: 'kept', locked: true, seed: 'every bar', generated: 'Every bar got a receipt', current: 'Every bar got a receipt', variants: [] },
      { index: 2, section: 'hook', status: 'needs_work', locked: false, seed: 'sound came back', generated: 'Sound came back with a family name', current: 'Sound came back with a family name', variants: [] }
    ]
  };
}

function buildDemoGeneticProof(project) {
  const parent = project.genomes[0];
  const child = { ...parent, sourceId: 'child-tone', brightness: .78, dynamics: .74, stereoWidth: .62, transient: .56 };
  const sourceAudio = createSyntheticGenomeAudio(parent, { durationSeconds: 1.8 });
  const variant = renderGeneticAudioVariant(sourceAudio, parent, child, { action: 'finish_mode_preview', variantId: 'finish-preview' });
  return { proof: buildGeneticRenderProof({ sourceId: parent.sourceId, parentGenome: parent, variant, familyId: 'family-parent-tone' }), wavBytes: encodeWavBytes(variant.audio) };
}

function mountFinishMode() {
  if ($('#finish-mode-panel')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const panel = document.createElement('section');
  panel.id = 'finish-mode-panel';
  panel.className = 'panel finish-mode-panel';
  panel.innerHTML = `
    <div class="panel-title compact"><div><span class="eyebrow">FINISH MODE</span><h2>Export Pack</h2></div><span class="live-dot">PACK</span></div>
    <p>One commercial deliverable: session receipt, lyrics sheet, revision proof, family tree, mastering report, audible Genetic Sound proof, and WAV preview bytes.</p>
    <div class="finish-actions"><button id="finish-build">Build Pack</button><button id="finish-download" class="ghost">Download Pack</button></div>
    <div class="finish-card"><b>Pack files</b><div id="finish-files" class="finish-files"></div></div>
    <div class="finish-card"><b>Receipt preview</b><pre id="finish-preview" class="finish-json"></pre></div>`;
  const sideStack = $('.side-stack') || document.body;
  sideStack.prepend(panel);
  $('#finish-build')?.addEventListener('click', buildPack);
  $('#finish-download')?.addEventListener('click', () => {
    if (!activePack) buildPack();
    downloadFinishPack(activePack, 'macsense-finish-pack.json');
  });
  buildPack();
}

function buildPack() {
  const project = demoProject();
  const revisionSession = demoRevision();
  const { proof, wavBytes } = buildDemoGeneticProof(project);
  activePack = buildFinishPack({ project, revisionSession, geneticProofs: [proof], wavBytes, measures: { lufs: -14.2, truePeakDbtp: -0.9 } });
  renderPack(activePack);
  return activePack;
}

function renderPack(pack) {
  const files = $('#finish-files');
  if (files) files.innerHTML = pack.files.map(file => `<div class="finish-file"><span>${safe(file.name)}</span>${safe(file.contentType)} · ${safe(file.sizeBytes)} bytes</div>`).join('');
  const preview = $('#finish-preview');
  if (preview) preview.textContent = JSON.stringify({ version: pack.version, projectName: pack.projectName, requiredComplete: pack.requiredComplete, fileCount: pack.fileCount, files: pack.files.map(file => file.name) }, null, 2);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFinishMode, { once: true });
  else mountFinishMode();
}
