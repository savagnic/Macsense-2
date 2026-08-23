const VOCAL_PRESETS={
  'Match Closely':{autoTuneSpeedMs:3,eqLowDb:-4,eqMidDb:.5,eqHighDb:6,compThresholdDb:-22,compRatio:6,reverbMixPct:35,delayFeedbackPct:45},
  'Fit My Voice':{autoTuneSpeedMs:18,eqLowDb:-1,eqMidDb:2,eqHighDb:3.5,compThresholdDb:-14,compRatio:3.5,reverbMixPct:15,delayFeedbackPct:20},
  'Blend Styles':{autoTuneSpeedMs:10,eqLowDb:-2.5,eqMidDb:1,eqHighDb:4.5,compThresholdDb:-18,compRatio:4.5,reverbMixPct:25,delayFeedbackPct:35}
};

export function mountMacsenseExperience({getProject,onProjectChange,onResurrect,onApplyVocalPreset}={}){
  if(!document.querySelector('link[data-macsense-experience]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./experience.css';link.dataset.macsenseExperience='1';document.head.append(link)}
  if(!document.querySelector('#feature-dock')) document.body.insertAdjacentHTML('beforeend',`
    <nav id="feature-dock" class="feature-dock" aria-label="Advanced studio tools">
      <button data-feature="arrangement">Arrangement</button><button data-feature="vocal">Vocal Scanner</button><button data-feature="resurrection">Resurrection</button><button data-feature="story">System</button>
    </nav>
    <dialog id="feature-modal" class="feature-modal"><button id="feature-close" class="modal-close">×</button><div id="feature-body"></div></dialog>`);
  const modal=document.querySelector('#feature-modal'),body=document.querySelector('#feature-body');
  document.querySelector('#feature-close').onclick=()=>modal.close();
  document.querySelector('#feature-dock').onclick=e=>{
    const f=e.target.dataset.feature;if(!f)return;
    body.innerHTML=f==='arrangement'?arrangementMarkup():f==='vocal'?vocalMarkup():f==='resurrection'?resurrectionMarkup():storyMarkup();
    modal.showModal();
    if(f==='arrangement')wireArrangement(getProject,onProjectChange,modal);
    if(f==='vocal')wireVocalScanner(onApplyVocalPreset);
    if(f==='resurrection')wireResurrection(getProject,onResurrect);
  };
}

function wireArrangement(getProject,onProjectChange,modal){
  const project=getProject?.(),list=document.querySelector('#arrangement-list');list.innerHTML='';
  (project?.sections||[]).forEach((s,i)=>{const item=document.createElement('div');item.className='arrange-item';item.draggable=true;item.dataset.id=s.id;item.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><b>${esc(s.name)}</b><small>${esc(s.id)}</small>`;list.append(item)});
  let dragged=null;list.ondragstart=e=>dragged=e.target.closest('.arrange-item');list.ondragover=e=>{e.preventDefault();const over=e.target.closest('.arrange-item');if(!dragged||!over||dragged===over)return;const b=over.getBoundingClientRect();list.insertBefore(dragged,e.clientY<b.top+b.height/2?over:over.nextSibling)};
  document.querySelector('#arrangement-commit').onclick=()=>{const order=[...list.querySelectorAll('.arrange-item')].map(x=>x.dataset.id);project.sections=order.map(id=>project.sections.find(s=>s.id===id)).filter(Boolean);onProjectChange?.(project);modal.close()};
}

function wireVocalScanner(onApply){
  let mode='Fit My Voice',preset={...VOCAL_PRESETS[mode]};const modes=[...document.querySelectorAll('[data-vocal-mode]')],out=document.querySelector('#vocal-chain');
  const render=()=>{out.innerHTML=vocalChainMarkup(preset);modes.forEach(b=>b.classList.toggle('selected',b.dataset.vocalMode===mode));out.querySelectorAll('[data-vocal-key]').forEach(input=>input.oninput=()=>{preset[input.dataset.vocalKey]=Number(input.value);input.parentElement.querySelector('output').value=Number(input.value).toFixed(String(input.step).includes('.')?1:0)})};
  modes.forEach(b=>b.onclick=()=>{mode=b.dataset.vocalMode;preset={...VOCAL_PRESETS[mode]};render()});
  document.querySelector('#vocal-scan-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const p=document.querySelector('#vocal-progress');p.hidden=false;for(let i=0;i<=100;i+=5){p.value=i;await new Promise(r=>setTimeout(r,15))}p.hidden=true;document.querySelector('#vocal-result').textContent=`Reference analyzed · ${mode}`;render()};
  document.querySelector('#apply-vocal-preset').onclick=()=>{onApply?.({mode,...preset});document.querySelector('#vocal-result').textContent=`Applied ${mode} to this project`};render();
}

function wireResurrection(getProject,onResurrect){
  const candidates=[...(getProject?.()?.genomes||[])].reverse(),list=document.querySelector('#resurrection-list');list.innerHTML='';
  if(!candidates.length){list.innerHTML='<div class="empty">Record or import takes first. Their measured DNA becomes resurrection material.</div>';return}
  candidates.forEach(g=>{const row=document.createElement('div');row.className='resurrection-item';row.innerHTML=`<div><b>${esc(g.sourceId)}</b><span>brightness ${Math.round(g.brightness*100)} · dynamics ${Math.round(g.dynamics*100)} · width ${Math.round(g.stereoWidth*100)}</span></div><button>Resurrect</button>`;row.querySelector('button').onclick=()=>{onResurrect?.(g);row.classList.add('resurrected');row.querySelector('button').textContent='Reborn'};list.append(row)});
}

function arrangementMarkup(){return `<div class="feature-heading"><span>ARRANGEMENT VIEW</span><h2>Change the arc without changing the song's identity.</h2><p>Drag sections into a new order. The vertical studio and arrangement view share the same section model.</p></div><div id="arrangement-list" class="arrangement-list"></div><button id="arrangement-commit">Commit Arrangement</button>`}
function vocalMarkup(){return `<div class="feature-heading"><span>VOCAL PRESET SCANNER</span><h2>Match closely. Fit the voice. Blend styles.</h2><p>The web surface carries the Android scanner's authored modes and editable chain.</p></div><div class="mode-grid"><button data-vocal-mode="Match Closely">Match Closely</button><button data-vocal-mode="Fit My Voice" class="selected">Fit My Voice</button><button data-vocal-mode="Blend Styles">Blend Styles</button></div><label class="reference-drop">Drop / choose reference MP3 or WAV<input id="vocal-scan-file" type="file" accept="audio/*"><progress id="vocal-progress" max="100" hidden></progress></label><p id="vocal-result" class="scan-result">Tune the baseline chain or analyze a reference.</p><div id="vocal-chain"></div><button id="apply-vocal-preset">Apply Vocal Chain</button>`}
function vocalChainMarkup(p){return `<div class="vocal-chain">${[['Retune','autoTuneSpeedMs',p.autoTuneSpeedMs,0,100,1,'ms'],['Low shelf','eqLowDb',p.eqLowDb,-12,12,.1,'dB'],['Presence','eqMidDb',p.eqMidDb,-12,12,.1,'dB'],['Air','eqHighDb',p.eqHighDb,-12,12,.1,'dB'],['Threshold','compThresholdDb',p.compThresholdDb,-48,-6,.5,'dBFS'],['Ratio','compRatio',p.compRatio,1,12,.1,':1'],['Reverb','reverbMixPct',p.reverbMixPct,0,80,1,'%'],['Delay','delayFeedbackPct',p.delayFeedbackPct,0,80,1,'%']].map(([l,k,v,min,max,step,u])=>`<label><span>${l}</span><input data-vocal-key="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${v}"><output>${v}${u}</output></label>`).join('')}</div>`}
function resurrectionMarkup(){return `<div class="feature-heading"><span>RESURRECTION RITUAL</span><h2>Nothing useful dies. It goes dormant.</h2><p>Bring a measured sonic identity back into the active lineage without losing its ancestry.</p></div><div id="resurrection-list" class="resurrection-list"></div>`}
function storyMarkup(){return `<div class="feature-heading"><span>THE MACSENSE SYSTEM</span><h2>Ari has context, tools, and boundaries.</h2><p>Ari sees the session and can propose tempo, track, lyric, mastering and breeding actions. Changes stay visible until the artist applies them.</p></div><div class="story-grid"><article><b>FLOW CAPTURE</b><p>Record before the idea evaporates.</p></article><article><b>SOUND GENETICS</b><p>Measure traits, breed identity, preserve lineage.</p></article><article><b>ARI</b><p>Creative reasoning tied to bounded executable studio commands.</p></article><article><b>MASTERING</b><p>Android-parity K-weighted LUFS and true-peak math drives web export.</p></article></div>`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
