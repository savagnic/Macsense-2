import { createSyntheticGenomeAudio, renderGeneticAudioVariant, buildGeneticRenderProof, encodeWavBytes, playRenderedAudio } from './genetic-audio-render.js';

const parentGenome = { sourceId: 'vinny-parent-tone', transient: 0.46, harmonicity: 0.62, brightness: 0.42, dynamics: 0.58, stereoWidth: 0.34, confidence: 0.91 };
const childGenomes = {
  breed: { sourceId: 'vinny-child-breed', transient: 0.61, harmonicity: 0.66, brightness: 0.64, dynamics: 0.72, stereoWidth: 0.48, confidence: 0.88 },
  resurrect: { sourceId: 'vinny-resurrection', transient: 0.51, harmonicity: 0.64, brightness: 0.38, dynamics: 0.66, stereoWidth: 0.42, confidence: 0.9 },
  evolve: { sourceId: 'vinny-evolution-wide', transient: 0.68, harmonicity: 0.54, brightness: 0.74, dynamics: 0.78, stereoWidth: 0.72, confidence: 0.84 }
};

const CSS = `
.genetic-audio-panel{border:1px solid rgba(0,245,212,.34);background:linear-gradient(145deg,rgba(10,20,25,.95),rgba(8,8,12,.96));box-shadow:0 28px 90px rgba(0,0,0,.5),inset 0 1px rgba(255,255,255,.1);position:relative;overflow:hidden}.genetic-audio-panel:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 0%,rgba(0,245,212,.16),transparent 38%),radial-gradient(circle at 80% 10%,rgba(232,184,105,.14),transparent 34%);pointer-events:none}.genetic-audio-panel>*{position:relative}.genetic-audio-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin:.7rem 0}.genetic-audio-actions button{font-size:11px}.genetic-audio-bars{display:grid;gap:.34rem;margin:.55rem 0}.genetic-audio-bar{display:grid;grid-template-columns:96px 1fr 44px;gap:.45rem;align-items:center;color:#aaa39b;font:800 10px ui-monospace,monospace}.genetic-audio-bar i{height:5px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden}.genetic-audio-bar b{display:block;height:100%;background:linear-gradient(90deg,#e8b869,#00f5d4)}.genetic-audio-proof{max-height:180px;overflow:auto;white-space:pre-wrap;color:#d8cec0;font:800 10px ui-monospace,monospace;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(0,0,0,.2);padding:.65rem}.genetic-audio-wave{height:54px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px) 0 0/10px 100%,rgba(0,0,0,.22);display:flex;align-items:center;gap:2px;padding:8px;overflow:hidden}.genetic-audio-wave span{width:3px;border-radius:9px;background:linear-gradient(180deg,#00f5d4,#e8b869);opacity:.82}.genetic-audio-status{color:#00f5d4;font:900 10px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.12em}
`;

let audioContext = null;
let sourceAudio = createSyntheticGenomeAudio(parentGenome);
let currentVariant = renderGeneticAudioVariant(sourceAudio, parentGenome, childGenomes.breed, { action: 'breed', variantId: 'breed-preview' });

function $(selector) { return document.querySelector(selector); }
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

function mountGeneticAudioRender() {
  if ($('#genetic-audio-render')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const panel = document.createElement('section');
  panel.id = 'genetic-audio-render';
  panel.className = 'panel genetic-audio-panel';
  panel.innerHTML = `
    <div class="panel-title compact"><div><span class="eyebrow">AUDIBLE GENETIC SOUND</span><h2>Render · A/B · Export</h2></div><span class="live-dot">AUDIO</span></div>
    <p>Turn family genetics into audible previews: parent tone, bred child, resurrected child, evolved child, WAV bytes, and proof metadata.</p>
    <div class="genetic-audio-actions">
      <button id="genetic-play-parent">Play Parent</button>
      <button id="genetic-render-breed" class="ghost">Render Breed</button>
      <button id="genetic-render-resurrect" class="ghost">Render Resurrection</button>
      <button id="genetic-render-evolve" class="ghost">Render Evolution</button>
      <button id="genetic-play-child" class="ghost">Play Variant</button>
      <button id="genetic-export-wav" class="ghost">Export WAV</button>
    </div>
    <div class="genetic-audio-status" id="genetic-audio-status">breed-preview ready</div>
    <div class="genetic-audio-wave" id="genetic-audio-wave"></div>
    <div class="genetic-audio-bars" id="genetic-audio-bars"></div>
    <pre class="genetic-audio-proof" id="genetic-audio-proof"></pre>`;
  const sideStack = $('.side-stack') || document.body;
  sideStack.prepend(panel);
  $('#genetic-play-parent')?.addEventListener('click', () => play(sourceAudio));
  $('#genetic-render-breed')?.addEventListener('click', () => renderVariant('breed'));
  $('#genetic-render-resurrect')?.addEventListener('click', () => renderVariant('resurrect'));
  $('#genetic-render-evolve')?.addEventListener('click', () => renderVariant('evolve'));
  $('#genetic-play-child')?.addEventListener('click', () => play(currentVariant.audio));
  $('#genetic-export-wav')?.addEventListener('click', exportWav);
  render();
}

function renderVariant(action) {
  currentVariant = renderGeneticAudioVariant(sourceAudio, parentGenome, childGenomes[action], { action, variantId: `${action}-preview` });
  $('#genetic-audio-status').textContent = `${action} variant rendered`;
  render();
}

async function getContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error('Web Audio API unavailable');
  audioContext ||= new AudioCtx();
  if (audioContext.state === 'suspended') await audioContext.resume();
  return audioContext;
}

async function play(audio) {
  try {
    playRenderedAudio(audio, await getContext());
  } catch (error) {
    $('#genetic-audio-status').textContent = error.message;
  }
}

function exportWav() {
  const bytes = encodeWavBytes(currentVariant.audio);
  const blob = new Blob([bytes], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `macsense-${currentVariant.action}-genetic-variant.wav`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function render() {
  const bars = $('#genetic-audio-bars');
  if (bars) bars.innerHTML = Object.entries(currentVariant.deltas).map(([trait, delta]) => {
    const value = Math.min(1, Math.abs(delta) * 3.5);
    return `<div class="genetic-audio-bar"><span>${safe(trait)}</span><i><b style="width:${Math.round(value * 100)}%"></b></i><em>${delta > 0 ? '+' : ''}${safe(delta)}</em></div>`;
  }).join('');
  const wave = $('#genetic-audio-wave');
  if (wave) {
    const channel = currentVariant.audio.channels[0];
    const step = Math.max(1, Math.floor(channel.length / 96));
    wave.innerHTML = Array.from({ length: 96 }, (_, index) => {
      let peak = 0;
      for (let i = index * step; i < Math.min(channel.length, (index + 1) * step); i++) peak = Math.max(peak, Math.abs(channel[i] || 0));
      return `<span style="height:${Math.max(4, Math.round(peak * 44))}px"></span>`;
    }).join('');
  }
  const proof = buildGeneticRenderProof({ sourceId: parentGenome.sourceId, parentGenome, variant: currentVariant, familyId: 'vinny-demo-family' });
  const proofNode = $('#genetic-audio-proof');
  if (proofNode) proofNode.textContent = JSON.stringify(proof, null, 2);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountGeneticAudioRender, { once: true });
  else mountGeneticAudioRender();
}
