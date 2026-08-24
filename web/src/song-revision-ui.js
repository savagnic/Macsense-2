import { createRevisionSession, rewriteBar, replaceBar, keepVariant, markBar, assembleSong, revisionStats, exportRevisionProof } from './song-revision.js';
import { saveProject } from './persistence.js';

const REVISION_CSS = `
.revision-panel{border:1px solid rgba(255,63,114,.42);background:linear-gradient(180deg,rgba(22,19,31,.92),rgba(8,10,15,.86));box-shadow:0 24px 90px rgba(0,0,0,.52),inset 0 1px rgba(255,255,255,.12);position:relative;overflow:hidden}.revision-panel:before{content:"";position:absolute;inset:-50%;background:conic-gradient(from 60deg,transparent,rgba(255,63,114,.14),rgba(232,184,105,.12),rgba(0,245,212,.12),transparent 70%);filter:blur(18px);animation:revisionSpin 24s linear infinite;pointer-events:none}.revision-panel>*{position:relative}.revision-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.75rem 0}.revision-actions button{white-space:nowrap}.revision-grid{display:grid;gap:.55rem;max-height:360px;overflow:auto}.revision-bar{border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(7,9,14,.78);padding:.65rem}.revision-bar.locked{border-color:rgba(0,245,212,.45)}.revision-bar.needs_work{border-color:rgba(255,95,134,.55)}.revision-bar header{display:flex;justify-content:space-between;gap:.5rem;align-items:center;margin-bottom:.4rem}.revision-bar b{color:#e8bb69}.revision-bar small{color:#00f5d4;font:900 10px ui-monospace,monospace}.revision-bar textarea{width:100%;min-height:58px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22);color:#fff4e5;padding:.55rem;resize:vertical}.revision-mini{font-size:12px;color:#cfc3b5}.revision-variants{font-size:12px;color:#d8cec0;margin-top:.45rem}.revision-variants button{font-size:11px;padding:.38rem .5rem}.revision-output{white-space:pre-wrap;max-height:220px;overflow:auto;border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(0,0,0,.2);padding:.65rem;color:#d8cec0}.revision-stat{display:inline-flex;margin:.2rem .25rem .2rem 0;border:1px solid rgba(0,245,212,.35);border-radius:999px;padding:.25rem .45rem;color:#00f5d4;font:900 10px ui-monospace,monospace}@keyframes revisionSpin{to{transform:rotate(360deg)}}
`;

const starterSeed = `I got the hook but I don't got the whole thing
I know the feeling but the words keep moving
Tell the room I came from static
Now the line hits back like magic`;

const starterGenerated = `I got the hook but I don't got the whole thing
I chase the spark while the night keeps moving
Tell the room I came from static
Now the line hits back like magic
I bend the verse until it speaks my name
I cut the weak parts out the frame
If the chorus needs a little more flame
I go bar by bar until it feels like mine`;

let session = createRevisionSession({ title: 'Vinny Bar Revision', seedLyrics: starterSeed, generatedLyrics: starterGenerated });
let selectedBarId = session.bars[0]?.id;

function $(selector) { return document.querySelector(selector); }
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

function mountSongRevisionStudio() {
  if ($('#song-revision-studio')) return;
  const style = document.createElement('style');
  style.textContent = REVISION_CSS;
  document.head.append(style);

  const panel = document.createElement('section');
  panel.id = 'song-revision-studio';
  panel.className = 'panel revision-panel';
  panel.innerHTML = `
    <div class="panel-title compact"><div><span class="eyebrow">BAR-BY-BAR REVISION</span><h2>Draft → Fix → Keep</h2></div><span class="live-dot">VINNY</span></div>
    <p class="revision-mini">Start half-written, paste/generated draft, then go bar by bar: rewrite, replace, keep, lock, mark needs work, assemble, save, and export proof.</p>
    <div id="revision-stats"></div>
    <div class="revision-actions">
      <button id="revision-demo">Load Demo</button>
      <button id="revision-rewrite" class="ghost">Rewrite Selected</button>
      <button id="revision-keep" class="ghost">Keep Selected</button>
      <button id="revision-needs" class="ghost">Needs Work</button>
      <button id="revision-lock" class="ghost">Lock</button>
      <button id="revision-save" class="ghost">Save</button>
      <button id="revision-export" class="ghost">Export Proof</button>
    </div>
    <div id="revision-bars" class="revision-grid"></div>
    <h3>Assembled Song</h3>
    <div id="revision-output" class="revision-output"></div>`;

  const sideStack = $('.side-stack') || document.body;
  sideStack.prepend(panel);

  $('#revision-demo')?.addEventListener('click', () => {
    session = createRevisionSession({ title: 'Vinny Bar Revision', seedLyrics: starterSeed, generatedLyrics: starterGenerated });
    selectedBarId = session.bars[0]?.id;
    render();
  });
  $('#revision-rewrite')?.addEventListener('click', () => {
    const variant = rewriteBar(session, selectedBarId, 'make it hit harder and sound more finished');
    keepVariant(session, selectedBarId, variant.id);
    render();
  });
  $('#revision-keep')?.addEventListener('click', () => { markBar(session, selectedBarId, 'kept', 'artist kept this bar'); render(); });
  $('#revision-needs')?.addEventListener('click', () => { markBar(session, selectedBarId, 'needs_work', 'artist wants another pass'); render(); });
  $('#revision-lock')?.addEventListener('click', () => { markBar(session, selectedBarId, 'locked', 'bar is final'); render(); });
  $('#revision-save')?.addEventListener('click', saveRevision);
  $('#revision-export')?.addEventListener('click', exportRevision);
  render();
}

function render() {
  const stats = revisionStats(session);
  const statsEl = $('#revision-stats');
  if (statsEl) statsEl.innerHTML = [
    ['bars', stats.totalBars], ['kept', stats.keptBars], ['needs work', stats.needsWork], ['variants', stats.variants], ['done', `${Math.round(stats.completion * 100)}%`]
  ].map(([k, v]) => `<span class="revision-stat">${safe(k)}: ${safe(v)}</span>`).join('');

  const barsEl = $('#revision-bars');
  if (barsEl) barsEl.innerHTML = session.bars.map(bar => `
    <article class="revision-bar ${safe(bar.status)}" data-bar-id="${safe(bar.id)}">
      <header><b>${bar.index + 1}. ${safe(bar.section)}</b><small>${safe(bar.status)} · ${bar.variants.length} variants</small></header>
      <textarea data-revision-text="${safe(bar.id)}">${safe(bar.current || bar.generated || bar.original)}</textarea>
      <div class="revision-mini">Seed: ${safe(bar.original || 'none')}<br>Generated: ${safe(bar.generated || 'none')}</div>
      <div class="revision-variants">${bar.variants.slice(-3).map(v => `<div>${safe(v.source)}: ${safe(v.text)} <button data-keep-variant="${safe(bar.id)}|${safe(v.id)}">Keep</button></div>`).join('')}</div>
    </article>`).join('');

  barsEl?.querySelectorAll('[data-bar-id]').forEach(el => el.addEventListener('click', () => { selectedBarId = el.dataset.barId; }));
  barsEl?.querySelectorAll('[data-revision-text]').forEach(el => el.addEventListener('change', () => { replaceBar(session, el.dataset.revisionText, el.value); render(); }));
  barsEl?.querySelectorAll('[data-keep-variant]').forEach(el => el.addEventListener('click', event => {
    event.stopPropagation();
    const [barId, variantId] = el.dataset.keepVariant.split('|');
    keepVariant(session, barId, variantId);
    render();
  }));

  const output = $('#revision-output');
  if (output) output.textContent = assembleSong(session);
}

async function saveRevision() {
  try {
    await saveProject({ ...session, kind: 'bar_revision_session', updatedAt: new Date().toISOString() });
    const status = $('#status');
    if (status) status.textContent = 'Bar-by-bar revision saved locally';
  } catch (error) {
    const status = $('#status');
    if (status) { status.textContent = `Revision save failed: ${error.message}`; status.dataset.tone = 'bad'; }
  }
}

function exportRevision() {
  const proof = exportRevisionProof(session);
  const blob = new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'macsense-bar-by-bar-revision-proof.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSongRevisionStudio, { once: true });
  else mountSongRevisionStudio();
}
