const VOCAL_PRESETS={
  'Match Closely':{autoTuneSpeedMs:3,eqLowDb:-4,eqMidDb:.5,eqHighDb:6,compThresholdDb:-22,compRatio:6,reverbMixPct:35,delayFeedbackPct:45},
  'Fit My Voice':{autoTuneSpeedMs:18,eqLowDb:-1,eqMidDb:2,eqHighDb:3.5,compThresholdDb:-14,compRatio:3.5,reverbMixPct:15,delayFeedbackPct:20},
  'Blend Styles':{autoTuneSpeedMs:10,eqLowDb:-2.5,eqMidDb:1,eqHighDb:4.5,compThresholdDb:-18,compRatio:4.5,reverbMixPct:25,delayFeedbackPct:35}
};

export function mountMacsenseExperience({getProject,onProjectChange,onResurrect,onApplyVocalPreset}={}){
  injectExperienceMarkup();
  wireCinematic();
  wireFeatureDock();
  wireArrangement(getProject,onProjectChange);
  wireVocalScanner(onApplyVocalPreset);
  wireResurrection(getProject,onResurrect);
}

function injectExperienceMarkup(){
  if(document.querySelector('#cinematic-intro'))return;
  document.body.insertAdjacentHTML('afterbegin',`
    <section id="cinematic-intro" class="cinematic" aria-label="MACSENSE introduction">
      <canvas id="cinematic-canvas"></canvas>
      <div class="cinematic-vignette"></div>
      <div class="cinematic-copy">
        <div class="cinematic-mark">M</div>
        <p class="cinematic-kicker">MACSENSE AI</p>
        <h1 id="cinematic-line">Every sound remembers where it came from.</h1>
        <p id="cinematic-sub">A studio where ideas become bloodlines, Ari works beside you, and no take has to die.</p>
        <div class="cinematic-actions"><button id="enter-studio">Enter Studio</button><button id="cinematic-skip" class="ghost">Skip intro</button></div>
        <small>Headphones recommended · sound starts only after you interact</small>
      </div>
    </section>
    <nav id="feature-dock" class="feature-dock">
      <button data-feature="arrangement">Arrangement</button><button data-feature="vocal">Vocal Scanner</button><button data-feature="resurrection">Resurrection</button><button data-feature="story">Ari / Story</button>
    </nav>
    <dialog id="feature-modal" class="feature-modal"><button id="feature-close" class="modal-close">×</button><div id="feature-body"></div></dialog>
  `);
}

function wireCinematic(){
  const intro=document.querySelector('#cinematic-intro');
  if(localStorage.getItem('macsense_intro_seen')==='1')intro.classList.add('cinematic-hidden');
  const canvas=document.querySelector('#cinematic-canvas'),ctx=canvas.getContext('2d');
  let raf=0,t=0;
  function size(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px'}
  size();addEventListener('resize',size);
  function draw(){t+=.006;ctx.clearRect(0,0,canvas.width,canvas.height);const w=canvas.width,h=canvas.height,cx=w*.5,cy=h*.46;for(let i=0;i<80;i++){const a=i*.618+t*(i%3+1),r=(Math.sin(i*2.91+t*3)*.5+.5)*Math.min(w,h)*.38,x=cx+Math.cos(a)*r,y=cy+Math.sin(a*1.17)*r*.52;ctx.beginPath();ctx.arc(x,y,(i%5+1)*devicePixelRatio*.45,0,Math.PI*2);ctx.fillStyle=i%7===0?'rgba(0,245,212,.28)':'rgba(229,184,105,.20)';ctx.fill()}raf=requestAnimationFrame(draw)}
  draw();
  const lines=[
    ['Every sound remembers where it came from.','A studio where ideas become bloodlines, Ari works beside you, and no take has to die.'],
    ['Capture the moment before it disappears.','Flow Capture turns instinct into editable material without breaking the creative state.'],
    ['Breed sound instead of browsing forever.','Measured traits become lineage. Cross takes. Inherit what matters. Resurrect what you abandoned.'],
    ['Ari is not a chatbot sitting beside the DAW.','Ari sees the session, proposes bounded changes, and waits for you before touching the record.'],
    ['This is MACSENSE.','Enter the studio. Make something that could not have existed anywhere else.']
  ];
  let index=0,timer=setInterval(()=>{if(intro.classList.contains('cinematic-hidden'))return;index=(index+1)%lines.length;const h=document.querySelector('#cinematic-line'),p=document.querySelector('#cinematic-sub');h.classList.remove('reveal');p.classList.remove('reveal');requestAnimationFrame(()=>{h.textContent=lines[index][0];p.textContent=lines[index][1];h.classList.add('reveal');p.classList.add('reveal')})},5200);
  async function enter(){localStorage.setItem('macsense_intro_seen','1');await playEntranceTone().catch(()=>{});intro.classList.add('cinematic-hidden');setTimeout(()=>{cancelAnimationFrame(raf);clearInterval(timer)},900)}
  document.querySelector('#enter-studio').addEventListener('click',enter);document.querySelector('#cinematic-skip').addEventListener('click',()=>{localStorage.setItem('macsense_intro_seen','1');intro.classList.add('cinematic-hidden');cancelAnimationFrame(raf);clearInterval(timer)});
}

async function playEntranceTone(){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;const c=new C(),g=c.createGain();g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.08,c.currentTime+.08);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+1.8);g.connect(c.destination);[40,80,432].forEach((f,i)=>{const o=c.createOscillator();o.frequency.value=f;o.type=i===2?'sine':'triangle';o.connect(g);o.start();o.stop(c.currentTime+1.9)});setTimeout(()=>c.close(),2100)}

function wireFeatureDock(){const modal=document.querySelector('#feature-modal'),body=document.querySelector('#feature-body');document.querySelector('#feature-close').onclick=()=>modal.close();document.querySelector('#feature-dock').addEventListener('click',e=>{const f=e.target.dataset.feature;if(!f)return;if(f==='arrangement')body.innerHTML=arrangementMarkup();if(f==='vocal')body.innerHTML=vocalMarkup();if(f==='resurrection')body.innerHTML=resurrectionMarkup();if(f==='story')body.innerHTML=storyMarkup();modal.showModal();modal.dispatchEvent(new CustomEvent('feature-opened',{detail:{feature:f}}))})}

function wireArrangement(getProject,onProjectChange){const modal=document.querySelector('#feature-modal');modal.addEventListener('feature-opened',e=>{if(e.detail.feature!=='arrangement')return;const project=getProject?.();const list=document.querySelector('#arrangement-list');list.innerHTML='';(project?.sections||[]).forEach((s,i)=>{const item=document.createElement('div');item.className='arrange-item';item.draggable=true;item.dataset.id=s.id;item.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.id)}</small>`;list.append(item)});let dragged=null;list.addEventListener('dragstart',ev=>{dragged=ev.target.closest('.arrange-item')});list.addEventListener('dragover',ev=>{ev.preventDefault();const over=ev.target.closest('.arrange-item');if(dragged&&over&&dragged!==over){const box=over.getBoundingClientRect();list.insertBefore(dragged,ev.clientY<box.top+box.height/2?over:over.nextSibling)}});document.querySelector('#arrangement-commit').onclick=()=>{const order=[...list.querySelectorAll('.arrange-item')].map(x=>x.dataset.id);project.sections=order.map(id=>project.sections.find(s=>s.id===id)).filter(Boolean);onProjectChange?.(project);modal.close()}})}

function wireVocalScanner(onApply){const modal=document.querySelector('#feature-modal');modal.addEventListener('feature-opened',e=>{if(e.detail.feature!=='vocal')return;let mode='Fit My Voice',preset={...VOCAL_PRESETS[mode]};const modes=[...document.querySelectorAll('[data-vocal-mode]')],out=document.querySelector('#vocal-chain');const render=()=>{out.innerHTML=vocalChainMarkup(preset);modes.forEach(b=>b.classList.toggle('selected',b.dataset.vocalMode===mode));bindVocalSliders(preset)};modes.forEach(b=>b.onclick=()=>{mode=b.dataset.vocalMode;preset={...VOCAL_PRESETS[mode]};render()});document.querySelector('#vocal-scan-file').onchange=async ev=>{const file=ev.target.files?.[0];if(!file)return;const p=document.querySelector('#vocal-progress');p.hidden=false;for(let i=0;i<=100;i+=4){p.value=i;await new Promise(r=>setTimeout(r,18))}p.hidden=true;document.querySelector('#vocal-result').textContent=`Analysis locked · ${mode}`;render()};document.querySelector('#apply-vocal-preset').onclick=()=>{onApply?.({mode,...preset});document.querySelector('#vocal-result').textContent=`Applied ${mode} to the vocal chain`};render()})}

function bindVocalSliders(preset){document.querySelectorAll('[data-vocal-key]').forEach(input=>{input.oninput=()=>{preset[input.dataset.vocalKey]=Number(input.value);const o=input.parentElement.querySelector('output');if(o)o.value=Number(input.value).toFixed(input.step?.includes('.')?1:0)}})}

function wireResurrection(getProject,onResurrect){const modal=document.querySelector('#feature-modal');modal.addEventListener('feature-opened',e=>{if(e.detail.feature!=='resurrection')return;const project=getProject?.(),list=document.querySelector('#resurrection-list');list.innerHTML='';const candidates=[...(project?.genomes||[])].reverse();if(!candidates.length){list.innerHTML='<div class="empty">Record or import takes first. Their measured DNA becomes resurrection material.</div>';return}candidates.forEach(g=>{const row=document.createElement('div');row.className='resurrection-item';row.innerHTML=`<div><b>${escapeHtml(g.sourceId)}</b><span>brightness ${Math.round(g.brightness*100)} · dynamics ${Math.round(g.dynamics*100)} · width ${Math.round(g.stereoWidth*100)}</span></div><button>Resurrect</button>`;row.querySelector('button').onclick=()=>{onResurrect?.(g);row.classList.add('resurrected');row.querySelector('button').textContent='Reborn'};list.append(row)})})}

function arrangementMarkup(){return `<div class="feature-heading"><span>ARRANGEMENT VIEW</span><h2>Reorder the record without breaking its identity.</h2><p>Drag sections into a new arc. The same section model powers the vertical studio.</p></div><div id="arrangement-list" class="arrangement-list"></div><button id="arrangement-commit">Commit Arrangement</button>`}
function vocalMarkup(){return `<div class="feature-heading"><span>VOCAL PRESET SCANNER</span><h2>Match a reference. Fit the voice. Or cross the aesthetics.</h2></div><div class="mode-grid"><button data-vocal-mode="Match Closely">Match Closely</button><button data-vocal-mode="Fit My Voice" class="selected">Fit My Voice</button><button data-vocal-mode="Blend Styles">Blend Styles</button></div><label class="reference-drop">Reference MP3/WAV<input id="vocal-scan-file" type="file" accept="audio/*"><progress id="vocal-progress" max="100" hidden></progress></label><p id="vocal-result" class="scan-result">Choose a reference to analyze or tune the baseline chain directly.</p><div id="vocal-chain"></div><button id="apply-vocal-preset">Apply Vocal Chain</button>`}
function vocalChainMarkup(p){const rows=[['Retune speed','autoTuneSpeedMs',p.autoTuneSpeedMs,0,100,1,'ms'],['Low shelf','eqLowDb',p.eqLowDb,-12,12,.1,'dB'],['Presence','eqMidDb',p.eqMidDb,-12,12,.1,'dB'],['Air','eqHighDb',p.eqHighDb,-12,12,.1,'dB'],['Comp threshold','compThresholdDb',p.compThresholdDb,-48,-6,.5,'dBFS'],['Ratio','compRatio',p.compRatio,1,12,.1,':1'],['Reverb','reverbMixPct',p.reverbMixPct,0,80,1,'%'],['Delay','delayFeedbackPct',p.delayFeedbackPct,0,80,1,'%']];return `<div class="vocal-chain">${rows.map(([label,key,value,min,max,step,unit])=>`<label><span>${label}</span><input data-vocal-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output>${value}${unit}</output></label>`).join('')}</div>`}
function resurrectionMarkup(){return `<div class="feature-heading"><span>RESURRECTION RITUAL</span><h2>Nothing useful dies. It goes dormant.</h2><p>Bring measured sonic identities back into the active creative pool with their ancestry intact.</p></div><div id="resurrection-list" class="resurrection-list"></div>`}
function storyMarkup(){return `<div class="feature-heading"><span>ARI / THE SYSTEM</span><h2>A co-producer with hands, boundaries, and memory.</h2><p>Ari sees BPM, sections, lyrics, tracks, mastering state and recent sound genomes. When Ari wants to change the record, the change appears as a proposal. You apply it or kill it.</p></div><div class="story-grid"><article><b>FLOW CAPTURE</b><p>Catch the idea before the editor brain wakes up.</p></article><article><b>SOUND GENETICS</b><p>Measure identity, breed traits, preserve lineage.</p></article><article><b>ARI</b><p>Session-aware creative reasoning with bounded executable commands.</p></article><article><b>MASTERING</b><p>Measure loudness and true peak, then target the release context.</p></article></div>`}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
