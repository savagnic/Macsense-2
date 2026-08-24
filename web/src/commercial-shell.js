const COMMERCIAL_SYSTEMS = [
  { id: 'proof', label: 'Proof Mode', status: 'wired', detail: 'Guided product proof and export surface.' },
  { id: 'genetics', label: 'Sound Genetics', status: 'wired', detail: 'Families, breeding, resurrection, and evolution.' },
  { id: 'revision', label: 'Bar Revision', status: 'wired', detail: 'Seed draft, generated draft, bar decisions, proof export.' },
  { id: 'engine-pack', label: 'Editor Engine Pack', status: 'wired', detail: 'Clip lanes, regions, bar grid, feature extraction, bounce plan.' },
  { id: 'ari', label: 'Ari Control', status: 'gateway-ready', detail: 'Bounded studio command preview, apply, and reject.' },
  { id: 'finish', label: 'Finish Path', status: 'partial', detail: 'Mastering and WAV export exist. Export pack is next.' }
];

const COMMERCIAL_CSS = `
.commercial-deck{position:relative;border:1px solid rgba(232,184,105,.32);border-radius:20px;background:linear-gradient(135deg,rgba(18,17,23,.96),rgba(8,10,15,.94));box-shadow:0 26px 90px rgba(0,0,0,.48),inset 0 1px rgba(255,255,255,.1);padding:18px;margin-bottom:14px;overflow:hidden}.commercial-deck:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 18% 18%,rgba(232,184,105,.14),transparent 34%),radial-gradient(circle at 88% 12%,rgba(0,245,212,.12),transparent 30%);pointer-events:none}.commercial-deck>*{position:relative}.commercial-top{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;align-items:start}.commercial-kicker{font:900 10px ui-monospace,monospace;letter-spacing:.24em;color:#e8b869;text-transform:uppercase}.commercial-deck h2{margin:.32rem 0;font-size:clamp(28px,4vw,56px);letter-spacing:-.055em;line-height:.94}.commercial-deck p{color:#d8d0c2;line-height:1.55;margin:.5rem 0 0}.commercial-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.commercial-actions button{font-size:12px}.commercial-status{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.commercial-card{border:1px solid rgba(255,255,255,.11);background:rgba(7,9,14,.62);border-radius:14px;padding:10px}.commercial-card b{display:block;color:#fff4e5;font-size:12px}.commercial-card small{display:block;color:#8f8a80;font-size:10px;line-height:1.35;margin-top:4px}.commercial-state{display:inline-flex;margin-top:8px;border:1px solid rgba(0,245,212,.35);border-radius:999px;color:#00f5d4;padding:3px 6px;font:900 9px ui-monospace,monospace;text-transform:uppercase}.commercial-state.partial{border-color:rgba(232,184,105,.42);color:#e8b869}.commercial-proof-line{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.commercial-proof-line span{border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.035);padding:9px;font:800 10px ui-monospace,monospace;color:#cfc8bb;text-align:center}@media(max-width:900px){.commercial-top{grid-template-columns:1fr}.commercial-status{grid-template-columns:1fr}.commercial-proof-line{grid-template-columns:1fr 1fr}}
`;

function $(selector) { return document.querySelector(selector); }
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

function mountCommercialShell() {
  if ($('#commercial-deck')) return;
  const style = document.createElement('style');
  style.textContent = COMMERCIAL_CSS;
  document.head.append(style);

  const deck = document.createElement('section');
  deck.id = 'commercial-deck';
  deck.className = 'commercial-deck';
  deck.innerHTML = `
    <div class="commercial-top">
      <div>
        <div class="commercial-kicker">Commercial Studio Overview</div>
        <h2>One system for writing, sound design, revision, mastering, and proof.</h2>
        <p>MacSense now exposes its core production systems in the web studio: Proof Mode, Sound Genetics, Bar-by-Bar Revision, Ari command control, and the legal editor-engine layer. The next priority is the finish path: audible variant rendering, export packs, and live deployment verification.</p>
        <div class="commercial-actions">
          <button id="commercial-start-cinema">Play System Briefing</button>
          <button id="commercial-run-proof" class="ghost">Open Proof Mode</button>
          <button id="commercial-scroll-revision" class="ghost">Review Song Workflow</button>
        </div>
      </div>
      <div class="commercial-status">
        ${COMMERCIAL_SYSTEMS.map(system => `<article class="commercial-card"><b>${safe(system.label)}</b><small>${safe(system.detail)}</small><span class="commercial-state ${system.status === 'partial' ? 'partial' : ''}">${safe(system.status)}</span></article>`).join('')}
      </div>
    </div>
    <div class="commercial-proof-line"><span>Engine-backed UI</span><span>Browser smoke tested</span><span>Local-first session data</span><span>Proof export direction</span></div>`;

  const workspace = $('.workspace');
  const insertBefore = workspace?.querySelector('.panel-title') || workspace?.firstChild;
  if (workspace) workspace.insertBefore(deck, insertBefore);
  else document.body.prepend(deck);

  $('#commercial-start-cinema')?.addEventListener('click', () => window.MacSenseCinematics?.openCinematic?.({ force: true }));
  $('#commercial-run-proof')?.addEventListener('click', () => {
    window.MacSenseProofMode?.open?.();
    document.querySelector('#vinny-proof-mode, #proof-mode, [data-proof-mode]')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  });
  $('#commercial-scroll-revision')?.addEventListener('click', () => {
    document.querySelector('#song-revision-studio')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountCommercialShell, { once: true });
  else mountCommercialShell();
}
