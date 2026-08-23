import { WebAudioEngine, analyzeBuffer } from './audio-engine.js';
import { makeGenome, breedGenomes, newProject, touchProject } from './domain.js';
import { AriGatewayClient, executeAriCommand } from './ari.js';
import { saveProject, saveAudioBlob, loadAudioBlob } from './persistence.js';
import { FlowRecorder } from './recorder.js';
import { audioBufferToWav, downloadBlob } from './wav.js';
import { normalizeToTarget } from './dsp.js';
import { mountMacsenseExperience } from './experience.js';

const engine = new WebAudioEngine();
const recorder = new FlowRecorder();
let project = newProject('Vinny Session');
let recording = false;
let pendingAri = [];
let autosaveTimer = null;

const $ = (s) => document.querySelector(s);
const els = {
  projectName: $('#project-name'), bpm: $('#bpm'), play: $('#play'), stop: $('#stop'), record: $('#record'),
  addAudio: $('#add-audio'), fileInput: $('#file-input'), tracks: $('#tracks'), time: $('#time'),
  lyrics: $('#lyrics'), genomeList: $('#genome-list'), lineage: $('#lineage'),
  parentA: $('#parent-a'), parentB: $('#parent-b'), breed: $('#breed'),
  targetLufs: $('#target-lufs'), ceiling: $('#ceiling'), warmth: $('#warmth'), width: $('#width'), punch: $('#punch'),
  ariLog: $('#ari-log'), ariInput: $('#ari-input'), ariSend: $('#ari-send'), ariPending: $('#ari-pending'),
  exportMix: $('#export-mix'), save: $('#save'), status: $('#status'), gateway: $('#gateway-url'), install: $('#install-app')
};

function status(message, tone = 'ok') {
  els.status.textContent = message;
  els.status.dataset.tone = tone;
}

function scheduleSave() {
  touchProject(project);
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    try { await saveProject(project); status('Autosaved locally'); }
    catch (e) { status(`Autosave failed: ${e.message}`, 'bad'); }
  }, 400);
}

function syncControls() {
  els.projectName.value = project.name;
  els.bpm.value = project.bpm;
  els.lyrics.value = project.lyrics;
  els.targetLufs.value = project.mastering.targetLufs;
  els.ceiling.value = project.mastering.ceilingDb;
  els.warmth.value = project.mastering.warmth;
  els.width.value = project.mastering.width;
  els.punch.value = project.mastering.punch;
  renderTracks(); renderGenomes(); renderLineage(); renderPending();
}

function renderTracks() {
  els.tracks.innerHTML = '';
  if (!project.tracks.length) {
    els.tracks.innerHTML = '<div class="empty">Drop audio here or use <b>Add Audio</b>. WAV, MP3, AAC, WebM and browser-decodable formats work.</div>';
    return;
  }
  for (const t of project.tracks) {
    const row = document.createElement('article'); row.className = 'track';
    row.innerHTML = `<div class="track-head"><div><strong>${escapeHtml(t.name)}</strong><small>${formatTime(t.duration || 0)}</small></div><button data-remove="${t.id}" class="icon danger" title="Remove">×</button></div>
      <div class="wave-mini"><span style="width:${Math.min(100, Math.max(8, (t.genome?.brightness || .2) * 100))}%"></span></div>
      <div class="track-controls">
        <label>VOL <input data-volume="${t.id}" type="range" min="0" max="2" step="0.01" value="${t.volume ?? 1}"></label>
        <label>PAN <input data-pan="${t.id}" type="range" min="-1" max="1" step="0.01" value="${t.pan ?? 0}"></label>
        <button data-mute="${t.id}" class="toggle ${t.muted ? 'active' : ''}">M</button>
        <button data-solo="${t.id}" class="toggle ${t.solo ? 'active' : ''}">S</button>
      </div>`;
    els.tracks.append(row);
  }
}

function renderGenomes() {
  els.genomeList.innerHTML = '';
  for (const g of project.genomes) {
    const card = document.createElement('div'); card.className = 'genome-card';
    card.innerHTML = `<div class="genome-title"><strong>${escapeHtml(g.sourceId)}</strong><span>${Math.round(g.confidence * 100)}% confidence</span></div>
      ${['transient','harmonicity','brightness','dynamics','stereoWidth'].map(k => `<div class="trait"><span>${k}</span><i><b style="width:${Math.round(g[k]*100)}%"></b></i><em>${Math.round(g[k]*100)}</em></div>`).join('')}`;
    els.genomeList.append(card);
  }
  const options = '<option value="">Select genome</option>' + project.genomes.map(g => `<option value="${escapeAttr(g.sourceId)}">${escapeHtml(g.sourceId)}</option>`).join('');
  const a = els.parentA.value, b = els.parentB.value;
  els.parentA.innerHTML = options; els.parentB.innerHTML = options;
  if (project.genomes.some(g => g.sourceId === a)) els.parentA.value = a;
  if (project.genomes.some(g => g.sourceId === b)) els.parentB.value = b;
}

function renderLineage() {
  els.lineage.innerHTML = project.lineage.length ? project.lineage.slice().reverse().map(x => `<div class="lineage-node"><b>${escapeHtml(x.child)}</b><span>${escapeHtml(x.parents.join(' + '))}</span><small>${escapeHtml(x.traits.join(', ') || 'base traits')}</small></div>`).join('') : '<div class="empty">Breed two measured sounds to begin a lineage.</div>';
}

function renderPending() {
  els.ariPending.innerHTML = '';
  if (!pendingAri.length) return;
  const title = document.createElement('div'); title.className = 'pending-title'; title.textContent = 'Ari proposed changes'; els.ariPending.append(title);
  pendingAri.forEach((cmd, i) => {
    const row = document.createElement('div'); row.className = 'pending-command';
    row.innerHTML = `<code>${escapeHtml(JSON.stringify(cmd))}</code><div><button data-apply-command="${i}">Apply</button><button data-reject-command="${i}" class="ghost">Reject</button></div>`;
    els.ariPending.append(row);
  });
}

async function addAudioFile(file, source = 'import') {
  status(`Decoding ${file.name || 'recording'}…`);
  const id = crypto.randomUUID();
  const buffer = await engine.decodeFile(file);
  const metrics = analyzeBuffer(buffer);
  const genome = makeGenome({ sourceId: id, ...metrics });
  const track = await engine.addTrack({ id, name: file.name || `Flow take ${project.tracks.length + 1}`, buffer });
  const item = { ...engine.snapshotTrack(track), genome, source, audioBlobId: id };
  project.tracks.push(item); project.genomes.push(genome);
  await saveAudioBlob(id, file, { name: item.name, type: file.type, source });
  scheduleSave(); syncControls(); status(`Loaded ${item.name}`);
}

function applyTrackState(id, patch) {
  engine.setTrackState(id, patch);
  const t = project.tracks.find(x => x.id === id); if (t) Object.assign(t, patch);
  scheduleSave(); renderTracks();
}

function setMasterPreset(preset) {
  const presets = {
    warm_analog: { targetLufs: -12, ceilingDb: -1, warmth: .85, width: .45, punch: .5 },
    club_punch: { targetLufs: -9, ceilingDb: -.8, warmth: .45, width: .6, punch: .9 },
    streaming_clean: { targetLufs: -14, ceilingDb: -1, warmth: .3, width: .55, punch: .45 },
    cinematic_wide: { targetLufs: -16, ceilingDb: -1.2, warmth: .55, width: .95, punch: .55 }
  };
  if (!presets[preset]) throw new Error(`Unknown mastering preset ${preset}`);
  project.mastering = { ...project.mastering, ...presets[preset] }; scheduleSave(); syncControls();
}

function breed(parentA, parentB, traits = ['brightness','dynamics']) {
  const a = project.genomes.find(g => g.sourceId === parentA), b = project.genomes.find(g => g.sourceId === parentB);
  if (!a || !b) throw new Error('Choose two valid parent genomes');
  const child = breedGenomes(a, b, traits);
  project.genomes.push(child);
  project.lineage.push({ child: child.sourceId, parents: child.parents, traits, createdAt: new Date().toISOString() });
  scheduleSave(); renderGenomes(); renderLineage(); return child;
}

function resurrect(genome) {
  const child = makeGenome({ ...genome, sourceId: `${genome.sourceId}↻${Date.now().toString(36)}`, parents: [genome.sourceId], confidence: genome.confidence });
  project.genomes.push(child);
  project.lineage.push({ child: child.sourceId, parents: [genome.sourceId], traits: ['resurrection'], createdAt: new Date().toISOString() });
  scheduleSave(); renderGenomes(); renderLineage(); status(`Resurrected ${genome.sourceId}`);
  return child;
}

async function restoreAudio() {
  for (const t of project.tracks) {
    if (engine.tracks.has(t.id)) continue;
    const stored = await loadAudioBlob(t.audioBlobId || t.id);
    if (!stored?.blob) continue;
    try {
      const buffer = await engine.decodeFile(stored.blob);
      const runtime = await engine.addTrack({ id: t.id, name: t.name, buffer });
      engine.setTrackState(t.id, t);
      t.duration = runtime.buffer.duration;
    } catch (e) { console.warn('Could not restore track', t.id, e); }
  }
  renderTracks();
}

function ariClient() {
  const url = els.gateway.value.trim() || localStorage.getItem('macsense_gateway_url') || '';
  return new AriGatewayClient({ baseUrl: url });
}

async function sendAri() {
  const message = els.ariInput.value.trim(); if (!message) return;
  appendChat('you', message); els.ariInput.value = ''; els.ariSend.disabled = true;
  try {
    const result = await ariClient().chat({ message, project, history: project.ariHistory });
    appendChat('ari', result.text || 'I have a studio change ready.');
    project.ariHistory.push({ role: 'user', parts: [{ text: message }] }, { role: 'model', parts: [{ text: result.text }] });
    project.ariHistory = project.ariHistory.slice(-40);
    pendingAri.push(...result.commands); renderPending(); scheduleSave();
  } catch (e) {
    appendChat('system', `Cloud Ari unavailable: ${e.message}. Your studio remains local and functional.`);
  } finally { els.ariSend.disabled = false; }
}

function appendChat(role, text) {
  const div = document.createElement('div'); div.className = `chat ${role}`; div.innerHTML = `<b>${role === 'ari' ? 'ARI' : role.toUpperCase()}</b><p>${escapeHtml(text)}</p>`; els.ariLog.append(div); els.ariLog.scrollTop = els.ariLog.scrollHeight;
}

els.projectName.addEventListener('input', () => { project.name = els.projectName.value; scheduleSave(); });
els.bpm.addEventListener('change', () => { project.bpm = Math.max(40, Math.min(240, Number(els.bpm.value) || 120)); scheduleSave(); syncControls(); });
els.lyrics.addEventListener('input', () => { project.lyrics = els.lyrics.value; scheduleSave(); });
els.addAudio.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', async () => { for (const file of els.fileInput.files) try { await addAudioFile(file); } catch (e) { status(e.message, 'bad'); } els.fileInput.value = ''; });

for (const evt of ['dragenter','dragover']) document.body.addEventListener(evt, e => { e.preventDefault(); document.body.classList.add('dragging'); });
for (const evt of ['dragleave','drop']) document.body.addEventListener(evt, e => { e.preventDefault(); document.body.classList.remove('dragging'); });
document.body.addEventListener('drop', async e => { for (const file of e.dataTransfer.files) if (file.type.startsWith('audio/')) await addAudioFile(file).catch(err => status(err.message, 'bad')); });

els.play.addEventListener('click', async () => { try { await engine.play(); els.play.classList.add('active'); } catch (e) { status(e.message, 'bad'); } });
els.stop.addEventListener('click', () => { engine.stop(); els.play.classList.remove('active'); });
els.record.addEventListener('click', async () => {
  try {
    if (!recording) { await recorder.start(); recording = true; els.record.classList.add('recording'); els.record.textContent = 'Stop Take'; status('Recording flow…'); }
    else { const { blob } = await recorder.stop(); recording = false; els.record.classList.remove('recording'); els.record.textContent = 'Flow Capture'; const file = new File([blob], `flow-${Date.now()}.webm`, { type: blob.type }); await addAudioFile(file, 'flow_capture'); }
  } catch (e) { recording = false; recorder.cancel(); els.record.classList.remove('recording'); els.record.textContent = 'Flow Capture'; status(e.message, 'bad'); }
});

els.tracks.addEventListener('input', e => {
  if (e.target.dataset.volume) applyTrackState(e.target.dataset.volume, { volume: Number(e.target.value) });
  if (e.target.dataset.pan) applyTrackState(e.target.dataset.pan, { pan: Number(e.target.value) });
});
els.tracks.addEventListener('click', e => {
  const id = e.target.dataset.mute || e.target.dataset.solo || e.target.dataset.remove; if (!id) return;
  const t = project.tracks.find(x => x.id === id); if (!t) return;
  if (e.target.dataset.mute) applyTrackState(id, { muted: !t.muted });
  if (e.target.dataset.solo) applyTrackState(id, { solo: !t.solo });
  if (e.target.dataset.remove) { engine.removeTrack(id); project.tracks = project.tracks.filter(x => x.id !== id); scheduleSave(); renderTracks(); }
});

els.breed.addEventListener('click', () => { try { const child = breed(els.parentA.value, els.parentB.value, [...document.querySelectorAll('[data-trait]:checked')].map(x => x.dataset.trait)); status(`Bred ${child.sourceId}`); } catch (e) { status(e.message, 'bad'); } });

for (const el of [els.targetLufs, els.ceiling, els.warmth, els.width, els.punch]) el.addEventListener('input', () => {
  project.mastering = { targetLufs: Number(els.targetLufs.value), ceilingDb: Number(els.ceiling.value), warmth: Number(els.warmth.value), width: Number(els.width.value), punch: Number(els.punch.value) }; scheduleSave();
});

document.querySelectorAll('[data-master-preset]').forEach(btn => btn.addEventListener('click', () => setMasterPreset(btn.dataset.masterPreset)));
els.ariSend.addEventListener('click', sendAri); els.ariInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAri(); } });
els.ariPending.addEventListener('click', e => {
  const apply = e.target.dataset.applyCommand, reject = e.target.dataset.rejectCommand;
  const index = Number(apply ?? reject); if (!Number.isInteger(index) || !pendingAri[index]) return;
  if (apply !== undefined) {
    try {
      executeAriCommand(pendingAri[index], {
        setTempo: bpm => { project.bpm = Math.max(40, Math.min(240, bpm)); },
        setTrackState: applyTrackState,
        rewriteLyrics: updated => { project.lyrics = updated; },
        setMasterPreset,
        breedSounds: breed
      });
      appendChat('system', `Applied: ${pendingAri[index].type}`); scheduleSave(); syncControls();
    } catch (err) { status(err.message, 'bad'); return; }
  }
  pendingAri.splice(index, 1); renderPending();
});

els.exportMix.addEventListener('click', async () => {
  try {
    status('Rendering and measuring 48 kHz master…');
    const mix = await engine.renderMix({ sampleRate: 48000 });
    const mastered = normalizeToTarget(mix, { targetLufs: project.mastering.targetLufs, ceilingDbtp: project.mastering.ceilingDb });
    const wav = audioBufferToWav(mastered.buffer);
    downloadBlob(wav, `${safeName(project.name)}-master-48k.wav`);
    const before = Number.isFinite(mastered.before.integratedLufs) ? mastered.before.integratedLufs.toFixed(1) : '−∞';
    const after = Number.isFinite(mastered.after.integratedLufs) ? mastered.after.integratedLufs.toFixed(1) : '−∞';
    status(`Master exported · ${before} → ${after} LUFS · ${mastered.after.truePeakDbtp.toFixed(1)} dBTP`);
  } catch (e) { status(e.message, 'bad'); }
});
els.save.addEventListener('click', async () => { try { project = await saveProject(project); status('Project saved locally'); } catch (e) { status(e.message, 'bad'); } });
els.gateway.addEventListener('change', () => localStorage.setItem('macsense_gateway_url', els.gateway.value.trim()));

setInterval(() => { els.time.textContent = `${formatTime(engine.currentTime())} / ${formatTime(engine.duration())}`; }, 120);

let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; els.install.hidden = false; });
els.install.addEventListener('click', async () => { if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; els.install.hidden = true; } });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);
els.gateway.value = localStorage.getItem('macsense_gateway_url') || '';
syncControls(); restoreAudio(); appendChat('ari', 'Studio is live. Add a take, write, breed, master, or ask me for a bounded change. I will show executable changes before anything mutates.');
mountMacsenseExperience({
  getProject: () => project,
  onProjectChange: next => { project = next; scheduleSave(); syncControls(); },
  onResurrect: resurrect,
  onApplyVocalPreset: preset => { project.vocalPreset = preset; scheduleSave(); appendChat('system', `Vocal chain applied: ${preset.mode}`); }
});

function formatTime(seconds) { const s = Math.max(0, Number(seconds) || 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }
function safeName(s) { return String(s || 'macsense').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'macsense'; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s) { return escapeHtml(s); }
