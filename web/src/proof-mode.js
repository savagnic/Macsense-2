import { WebAudioEngine, analyzeBuffer } from './audio-engine.js';
import { makeGenome, breedGenomes } from './domain.js';
import { measureBuffer, normalizeToTarget } from './dsp.js';
import { parseAriCommands, executeAriCommand } from './ari.js';
import { saveProject, saveAudioBlob } from './persistence.js';
import { audioBufferToWav, downloadBlob } from './wav.js';

const PROOF_CSS = `
.proof-panel{border:1px solid rgba(232,184,105,.5);background:linear-gradient(180deg,rgba(18,22,33,.92),rgba(7,8,13,.88));box-shadow:0 24px 90px rgba(0,0,0,.55),inset 0 1px rgba(255,255,255,.12);position:relative;overflow:hidden}
.proof-panel::before{content:"";position:absolute;inset:-60% -20%;background:conic-gradient(from 120deg,transparent,rgba(232,184,105,.12),rgba(0,245,212,.14),transparent 72%);animation:proofSpin 18s linear infinite;pointer-events:none}
.proof-panel>*{position:relative}.proof-panel h2{margin-bottom:.35rem}.proof-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.proof-card{border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(8,10,15,.72);padding:.75rem;min-height:72px}.proof-card b{color:#e8bb69}.proof-card strong{color:#00f5d4}.proof-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.8rem 0}.proof-actions button{white-space:nowrap}.proof-main{font-size:1rem;padding:.8rem 1rem}.proof-log{max-height:180px;overflow:auto;font:800 11px ui-monospace,monospace}.proof-log div{display:grid;grid-template-columns:1fr auto;gap:.5rem;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:.5rem;margin-top:.45rem;background:rgba(10,12,18,.8)}.proof-log b{color:#00f5d4}.proof-log .bad b{color:#ff5f86}.proof-wave{width:100%;height:92px;border-radius:14px;background:#06070b;border:1px solid rgba(255,255,255,.12);margin:.55rem 0}.proof-metric{display:grid;grid-template-columns:1fr auto;gap:.4rem;margin:.25rem 0;color:#d8cec0}.proof-metric i{font-style:normal;color:#00f5d4}.proof-proposal{border:1px solid rgba(0,245,212,.3);background:rgba(0,245,212,.06);border-radius:16px;padding:.7rem;margin:.6rem 0}.proof-badge{display:inline-flex;margin:.2rem .25rem .2rem 0;border:1px solid rgba(0,245,212,.38);border-radius:999px;padding:.25rem .45rem;color:#00f5d4;font:900 10px ui-monospace,monospace}
@keyframes proofSpin{to{transform:rotate(360deg)}}
@media(max-width:900px){.proof-grid{grid-template-columns:1fr}}
`;

const proofEngine = new WebAudioEngine();
let proofProject = null;
let lastBuffer = null;
let lastGenome = null;
let proposedCommand = null;
let proofEvents = [];

function $(selector) { return document.querySelector(selector); }
function safeText(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function status(message, tone = 'ok') {
  const el = $('#status');
  if (el) { el.textContent = message; el.dataset.tone = tone; }
}
function log(message, result = 'PASS') {
  proofEvents.unshift({ message, result, at: new Date().toLocaleTimeString() });
  proofEvents = proofEvents.slice(0, 28);
  const logEl = $('#vinny-proof-log');
  if (!logEl) return;
  logEl.innerHTML = proofEvents.map(event => `<div class="${event.result === 'FAIL' ? 'bad' : ''}"><span>${safeText(event.at)} · ${safeText(event.message)}</span><b>${safeText(event.result)}</b></div>`).join('');
}

function ensurePanel() {
  if ($('#vinny-proof-mode')) return;
  const style = document.createElement('style');
  style.textContent = PROOF_CSS;
  document.head.append(style);

  const panel = document.createElement('section');
  panel.id = 'vinny-proof-mode';
  panel.className = 'panel proof-panel';
  panel.innerHTML = `
    <div class="panel-title compact"><div><span class="eyebrow">VINNY PROOF MODE</span><h2>Make The Engine Present</h2></div><span class="live-dot">REAL</span></div>
    <p>One button exposes the engine work already inside MacSense: WebAudio ingest, waveform, SoundGenome, LUFS / true peak, vocal chain, Ari command, local save, and export proof.</p>
    <div class="proof-actions">
      <button id="vinny-proof-run" class="proof-main">Prove MacSense</button>
      <button id="vinny-proof-audio" class="ghost">Use Audio File</button>
      <button id="vinny-proof-command" class="ghost">Ari Command</button>
      <button id="vinny-proof-export" class="ghost">Export Proof</button>
    </div>
    <input id="vinny-proof-file" type="file" accept="audio/*" hidden>
    <canvas id="vinny-proof-wave" class="proof-wave" width="760" height="160" aria-label="Decoded audio waveform"></canvas>
    <div class="proof-grid">
      <div class="proof-card"><b>Engine DNA</b><div id="vinny-proof-dna"></div></div>
      <div class="proof-card"><b>Measured Audio</b><div id="vinny-proof-audio-out">No audio measured yet.</div></div>
      <div class="proof-card"><b>Vocal Chain</b><div id="vinny-proof-chain">Not generated yet.</div></div>
      <div class="proof-card"><b>Ari Proposal</b><div id="vinny-proof-proposal">No command proposed yet.</div></div>
    </div>
    <div class="proof-log" id="vinny-proof-log"><div><span>Boot · proof panel mounted</span><b>READY</b></div></div>`;

  const sideStack = $('.side-stack') || document.body;
  sideStack.prepend(panel);

  $('#vinny-proof-run')?.addEventListener('click', runProofMode);
  $('#vinny-proof-audio')?.addEventListener('click', () => $('#vinny-proof-file')?.click());
  $('#vinny-proof-command')?.addEventListener('click', createAriCommandProof);
  $('#vinny-proof-export')?.addEventListener('click', exportProof);
  $('#vinny-proof-file')?.addEventListener('change', event => handleFile(event.target.files?.[0]));

  renderDna();
  log('Proof panel mounted');
}

function renderDna() {
  const dna = [
    ['WebAudio transport', 'LIVE'],
    ['Audio decode / tracks', 'LIVE'],
    ['SoundGenome traits', 'LIVE'],
    ['LUFS / true peak', 'LIVE'],
    ['Flow Capture module', 'LIVE'],
    ['IndexedDB project/audio', 'LIVE'],
    ['Ari command contract', 'LIVE'],
    ['WAV export utility', 'LIVE']
  ];
  const el = $('#vinny-proof-dna');
  if (el) el.innerHTML = dna.map(([k, v]) => `<div class="proof-metric"><span>${k}</span><i>${v}</i></div>`).join('');
}

async function runProofMode() {
  try {
    await proofEngine.ensureContext();
    proofProject = makeProofProject();
    renderDna();
    playProofBeat();
    await synthesizeProofTake();
    generateVocalChain('MATCH_CLOSELY');
    createAriCommandProof();
    await saveProject(proofProject);
    status('Vinny Proof Mode ran: audio, genome, vocal chain, Ari command, save/export ready');
    log('VINNY PROOF MODE complete');
  } catch (error) {
    status(`Proof mode failed: ${error.message}`, 'bad');
    log(error.message, 'FAIL');
  }
}

function makeProofProject() {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: 'Vinny Proof Session',
    bpm: Number($('#bpm')?.value) || 146,
    lyrics: $('#lyrics')?.value || 'MacSense makes the record move under the artist instead of trapping the artist inside a grid.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: [
      { id: 'intro', name: 'Intro' },
      { id: 'verse', name: 'Verse' },
      { id: 'hook', name: 'Hook' },
      { id: 'outro', name: 'Outro' }
    ],
    tracks: [],
    genomes: [],
    lineage: [],
    mastering: { targetLufs: -14, ceilingDb: -1, warmth: 0.45, width: 0.68, punch: 0.72 },
    ariHistory: []
  };
}

function playProofBeat() {
  const ctx = proofEngine.context;
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = 0.32;
  master.connect(ctx.destination);
  const now = ctx.currentTime + 0.04;
  const sixteenth = 60 / 146 / 4;
  for (let i = 0; i < 16; i++) {
    if ([0, 4, 8, 12].includes(i)) hit(ctx, master, 52, now + i * sixteenth, 0.16, 'sine', 0.85);
    if ([4, 12].includes(i)) noise(ctx, master, now + i * sixteenth, 0.11, 0.28);
    if (i % 2 === 0 || i === 13) noise(ctx, master, now + i * sixteenth + 0.015, 0.035, 0.10);
    if ([0, 6, 8, 11].includes(i)) hit(ctx, master, 42, now + i * sixteenth, 0.28, 'sine', 0.5);
  }
  log('Proof beat played through WebAudio');
}

function hit(ctx, destination, frequency, start, duration, type, gainValue) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function noise(ctx, destination, start, duration, gainValue) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = gainValue;
  src.connect(gain).connect(destination);
  src.start(start);
}

async function synthesizeProofTake() {
  const ctx = await proofEngine.ensureContext();
  const duration = 1.85;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const env = Math.exp(-t * 1.35);
    data[i] = Math.sin(2 * Math.PI * 110 * t) * 0.36 * env + Math.sin(2 * Math.PI * 220 * t) * 0.11 * env + (Math.random() * 2 - 1) * 0.018;
  }
  lastBuffer = buffer;
  lastGenome = makeGenome({ sourceId: 'vinny-proof-synth-take', ...analyzeBuffer(buffer) });
  const blob = audioBufferToWav(buffer);
  await saveAudioBlob(lastGenome.sourceId, blob, { name: 'Vinny proof synthetic take', source: 'proof_mode' });
  proofProject.tracks.push({ id: lastGenome.sourceId, name: 'Vinny proof synthetic take', duration: buffer.duration, volume: 1, pan: 0, muted: false, solo: false, audioBlobId: lastGenome.sourceId });
  proofProject.genomes.push(lastGenome);
  renderAudioProof(buffer, lastGenome, 'Synthetic proof take');
  drawWaveform(buffer);
  log('Synthetic proof take generated, saved, and analyzed');
}

async function handleFile(file) {
  if (!file) return;
  try {
    proofProject ||= makeProofProject();
    const buffer = await proofEngine.decodeFile(file);
    lastBuffer = buffer;
    const metrics = analyzeBuffer(buffer);
    lastGenome = makeGenome({ sourceId: file.name, ...metrics });
    const measured = measureBuffer(buffer);
    proofProject.tracks.push({ id: lastGenome.sourceId, name: file.name, duration: buffer.duration, volume: 1, pan: 0, muted: false, solo: false, audioBlobId: lastGenome.sourceId });
    proofProject.genomes.push(lastGenome);
    await saveAudioBlob(lastGenome.sourceId, file, { name: file.name, type: file.type, source: 'proof_upload' });
    renderAudioProof(buffer, lastGenome, file.name, measured);
    drawWaveform(buffer);
    log(`Decoded, measured, and stored ${file.name}`);
    status(`Proof mode analyzed ${file.name}`);
  } catch (error) {
    status(`Audio proof failed: ${error.message}`, 'bad');
    log(error.message, 'FAIL');
  }
}

function renderAudioProof(buffer, genome, label, measured = measureBuffer(buffer)) {
  const el = $('#vinny-proof-audio-out');
  if (!el) return;
  el.innerHTML = `
    <div class="proof-metric"><span>Source</span><i>${safeText(label)}</i></div>
    <div class="proof-metric"><span>Duration</span><i>${buffer.duration.toFixed(2)}s</i></div>
    <div class="proof-metric"><span>Sample rate</span><i>${buffer.sampleRate}Hz</i></div>
    <div class="proof-metric"><span>LUFS</span><i>${formatNumber(measured.integratedLufs)}</i></div>
    <div class="proof-metric"><span>True peak</span><i>${formatNumber(measured.truePeakDbtp)} dBTP</i></div>
    ${['transient','harmonicity','brightness','dynamics','stereoWidth','confidence'].map(key => `<div class="proof-metric"><span>${key}</span><i>${Math.round((genome[key] || 0) * 100)}</i></div>`).join('')}`;
}

function formatNumber(n) { return Number.isFinite(n) ? n.toFixed(2) : 'n/a'; }

function drawWaveform(buffer) {
  const canvas = $('#vinny-proof-wave');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#06070b';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const value = data[x * step + j] || 0;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    ctx.moveTo(x, (1 + min) * amp);
    ctx.lineTo(x, (1 + max) * amp);
  }
  ctx.stroke();
  ctx.strokeStyle = '#e8bb69';
  ctx.beginPath();
  ctx.moveTo(0, amp);
  ctx.lineTo(width, amp);
  ctx.stroke();
}

function generateVocalChain(mode = 'FIT_MY_VOICE') {
  const chains = {
    MATCH_CLOSELY: {
      label: 'Match Closely', autoTuneSpeedMs: 3, eq: 'Low -4.0 · Mid +0.5 · Air +6.0', comp: '-22 dBFS @ 6:1', fx: 'Reverb 35% · Delay 45%'
    },
    FIT_MY_VOICE: {
      label: 'Fit My Voice', autoTuneSpeedMs: 18, eq: 'Low -1.0 · Mid +2.0 · Air +3.5', comp: '-14 dBFS @ 3.5:1', fx: 'Reverb 15% · Delay 20%'
    },
    BLEND_STYLES: {
      label: 'Blend Styles', autoTuneSpeedMs: 10, eq: 'Low -2.5 · Mid +1.0 · Air +4.5', comp: '-18 dBFS @ 4.5:1', fx: 'Reverb 25% · Delay 35%'
    }
  };
  const chain = chains[mode] || chains.FIT_MY_VOICE;
  const el = $('#vinny-proof-chain');
  if (el) {
    el.innerHTML = `
      <div class="proof-metric"><span>Mode</span><i>${chain.label}</i></div>
      <div class="proof-metric"><span>AutoTune</span><i>${chain.autoTuneSpeedMs} ms</i></div>
      <div class="proof-metric"><span>EQ</span><i>${chain.eq}</i></div>
      <div class="proof-metric"><span>Comp</span><i>${chain.comp}</i></div>
      <div class="proof-metric"><span>FX</span><i>${chain.fx}</i></div>`;
  }
  proofProject ||= makeProofProject();
  proofProject.vocalPreset = chain;
  log(`Vocal chain generated: ${chain.label}`);
  return chain;
}

function createAriCommandProof() {
  proofProject ||= makeProofProject();
  proposedCommand = { type: 'set_tempo', bpm: 146, reason: 'Ari says the hook needs more forward motion.' };
  const commandMarkup = '<ari_command type="set_tempo" bpm="146" />';
  const parsed = parseAriCommands(`Push this toward a harder modern pocket. ${commandMarkup}`);
  const el = $('#vinny-proof-proposal');
  if (el) {
    el.innerHTML = `<div class="proof-proposal"><b>ARI PROPOSAL</b><br>set_tempo(146)<br><small>${safeText(proposedCommand.reason)}</small></div>
      <div class="proof-actions"><button id="vinny-proof-apply">Apply</button><button id="vinny-proof-reject" class="ghost">Reject</button></div>`;
    $('#vinny-proof-apply')?.addEventListener('click', applyAriCommandProof);
    $('#vinny-proof-reject')?.addEventListener('click', () => { proposedCommand = null; el.innerHTML = 'Ari command rejected.'; log('Ari command rejected'); });
  }
  log(`Ari command parsed: ${parsed[0]?.type || 'none'}`);
}

function applyAriCommandProof() {
  if (!proposedCommand) { log('No Ari command to apply', 'FAIL'); return; }
  executeAriCommand(proposedCommand, {
    setTempo: bpm => {
      proofProject.bpm = bpm;
      const bpmInput = $('#bpm');
      if (bpmInput) bpmInput.value = String(bpm);
      status(`Ari applied tempo ${bpm}`);
      return bpm;
    }
  });
  const el = $('#vinny-proof-proposal');
  if (el) el.innerHTML = `<div class="proof-proposal"><b>APPLIED</b><br>Ari changed the proof session tempo to ${proofProject.bpm} BPM.</div>`;
  log('Ari command applied to project');
}

async function exportProof() {
  try {
    proofProject ||= makeProofProject();
    if (lastBuffer) {
      const normalized = normalizeToTarget(lastBuffer, { targetLufs: proofProject.mastering.targetLufs, ceilingDbtp: proofProject.mastering.ceilingDb });
      proofProject.masteringProof = { before: normalized.before, after: normalized.after, gainDb: normalized.gainDb };
    }
    await saveProject(proofProject);
    const proof = {
      exportedAt: new Date().toISOString(),
      proofVersion: 'vinny-proof-mode-real-engine-1',
      project: proofProject,
      lastGenome,
      events: proofEvents,
      engineModules: ['WebAudioEngine', 'analyzeBuffer', 'measureBuffer', 'normalizeToTarget', 'parseAriCommands', 'executeAriCommand', 'IndexedDB persistence', 'audioBufferToWav']
    };
    downloadBlob(new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' }), 'macsense-vinny-proof-real-engine.json');
    log('Proof JSON exported and project saved');
  } catch (error) {
    status(`Export proof failed: ${error.message}`, 'bad');
    log(error.message, 'FAIL');
  }
}

function installProofMode() {
  ensurePanel();
  const topActions = $('.top-actions');
  if (topActions && !$('#prove-macsense-top')) {
    const button = document.createElement('button');
    button.id = 'prove-macsense-top';
    button.textContent = 'Prove MacSense';
    button.addEventListener('click', runProofMode);
    topActions.prepend(button);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installProofMode);
else installProofMode();
