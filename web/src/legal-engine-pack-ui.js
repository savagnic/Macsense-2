import { ENGINE_PACK, legalCandidates, blockedCandidates, createLane, createClip, splitClip, moveClip, buildBarGrid, makeBouncePlan, enhancedFeatureExtract, enhancedGenomeTraits } from './legal-engine-pack.js';

const CSS = `
.engine-pack-panel{border:1px solid rgba(0,245,212,.42);background:linear-gradient(180deg,rgba(10,20,27,.94),rgba(7,8,13,.9));box-shadow:0 24px 90px rgba(0,0,0,.52),inset 0 1px rgba(255,255,255,.12);position:relative;overflow:hidden}.engine-pack-panel:before{content:"";position:absolute;inset:-50%;background:conic-gradient(from 90deg,transparent,rgba(0,245,212,.14),rgba(232,184,105,.12),rgba(255,63,114,.12),transparent 70%);animation:enginePackSpin 28s linear infinite;pointer-events:none}.engine-pack-panel>*{position:relative}.engine-pack-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin:.7rem 0}.engine-pack-actions button{white-space:nowrap}.engine-pack-card{border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(7,9,14,.76);padding:.65rem;margin:.5rem 0}.engine-pack-card b{color:#e8bb69}.engine-pack-card small{display:block;color:#00f5d4;font:900 10px ui-monospace,monospace}.engine-pack-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.engine-pack-timeline{height:76px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px) 0 0/12.5% 100%,rgba(0,0,0,.25);position:relative;overflow:hidden}.engine-pack-clip{position:absolute;top:16px;height:38px;border-radius:10px;background:linear-gradient(135deg,rgba(232,184,105,.85),rgba(0,245,212,.55));box-shadow:0 8px 30px rgba(0,0,0,.35);color:#100b05;font:900 10px ui-monospace,monospace;display:flex;align-items:center;justify-content:center}.engine-pack-json{max-height:180px;overflow:auto;white-space:pre-wrap;color:#d8cec0;font:800 10px ui-monospace,monospace}.engine-pack-pill{display:inline-flex;margin:.2rem .22rem .2rem 0;border:1px solid rgba(0,245,212,.35);border-radius:999px;padding:.22rem .42rem;color:#00f5d4;font:900 10px ui-monospace,monospace}@keyframes enginePackSpin{to{transform:rotate(360deg)}}@media(max-width:900px){.engine-pack-grid{grid-template-columns:1fr}}
`;

let lane = createLane({ id: 'macsense-engine-lane', name: 'MacSense Engine Lane', clips: [
  createClip({ id: 'hook-clip', name: 'Hook', start: 0, duration: 4 }),
  createClip({ id: 'verse-clip', name: 'Verse', start: 4.2, duration: 5.6, gain: .9 })
]});
let regions = buildBarGrid({ bpm: 146, bars: 8 });

function $(selector) { return document.querySelector(selector); }
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

function mountEnginePack() {
  if ($('#legal-engine-pack')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const panel = document.createElement('section');
  panel.id = 'legal-engine-pack';
  panel.className = 'panel engine-pack-panel';
  panel.innerHTML = `
    <div class="panel-title compact"><div><span class="eyebrow">LEGAL ENGINE PACK</span><h2>Editor · Regions · Transport · Features</h2></div><span class="live-dot">WIRED</span></div>
    <p>Permissive-engine strategy without poisoning the repo: AudioMass-grade editing, wavesurfer-style regions, Tone-style transport, Meyda-style features, all wrapped by MacSense.</p>
    <div class="engine-pack-actions">
      <button id="engine-pack-split">Split Hook</button>
      <button id="engine-pack-move" class="ghost">Move Verse</button>
      <button id="engine-pack-analyze" class="ghost">Analyze Demo</button>
      <button id="engine-pack-export" class="ghost">Export Plan</button>
    </div>
    <div class="engine-pack-timeline" id="engine-pack-timeline"></div>
    <div class="engine-pack-grid">
      <div class="engine-pack-card"><b>Allowed candidates</b><div id="engine-pack-allowed"></div></div>
      <div class="engine-pack-card"><b>Guarded candidates</b><div id="engine-pack-guarded"></div></div>
    </div>
    <div class="engine-pack-card"><b>Engine proof</b><pre id="engine-pack-proof" class="engine-pack-json"></pre></div>`;

  const sideStack = $('.side-stack') || document.body;
  sideStack.prepend(panel);
  $('#engine-pack-split')?.addEventListener('click', () => { try { splitClip(lane, 'hook-clip', 2); render('Hook split into editable clips'); } catch (error) { render(error.message); } });
  $('#engine-pack-move')?.addEventListener('click', () => { try { moveClip(lane, 'verse-clip', 6.25); render('Verse clip moved on the timeline'); } catch (error) { render(error.message); } });
  $('#engine-pack-analyze')?.addEventListener('click', () => render('Enhanced genome features generated', demoFeatures()));
  $('#engine-pack-export')?.addEventListener('click', exportPlan);
  render('Engine pack mounted');
}

function render(message, extra = null) {
  const allowed = $('#engine-pack-allowed');
  if (allowed) allowed.innerHTML = legalCandidates().map(engine => `<span class="engine-pack-pill">${safe(engine.id)} · ${safe(engine.license)}</span>`).join('');
  const guarded = $('#engine-pack-guarded');
  if (guarded) guarded.innerHTML = blockedCandidates().map(engine => `<span class="engine-pack-pill">${safe(engine.id)} · ${safe(engine.license)}</span>`).join('');
  const timeline = $('#engine-pack-timeline');
  if (timeline) {
    const duration = Math.max(1, lane.clips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0));
    timeline.innerHTML = lane.clips.map(clip => `<div class="engine-pack-clip" style="left:${(clip.start / duration) * 100}%;width:${(clip.duration / duration) * 100}%">${safe(clip.name)}</div>`).join('');
  }
  const proof = $('#engine-pack-proof');
  if (proof) proof.textContent = JSON.stringify({ message, candidates: ENGINE_PACK, lane, regions: regions.length, bouncePlan: makeBouncePlan({ lanes: [lane], regions }), extra }, null, 2);
}

function demoFeatures() {
  const samples = Array.from({ length: 2048 }, (_, i) => Math.sin(i / 9) * Math.exp(-i / 2800) + (i % 97 === 0 ? .4 : 0));
  return { features: enhancedFeatureExtract(samples, 48000), genome: enhancedGenomeTraits(samples, 48000) };
}

function exportPlan() {
  const proof = { version: 'macsense-legal-engine-pack-v1', exportedAt: new Date().toISOString(), candidates: ENGINE_PACK, lane, regions, bouncePlan: makeBouncePlan({ lanes: [lane], regions }), note: 'Not an obfuscation pass. Legal engine advantages are wrapped by MacSense features with notices intact.' };
  const blob = new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'macsense-legal-engine-pack-proof.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountEnginePack, { once: true });
  else mountEnginePack();
}
