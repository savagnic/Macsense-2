const MAGIC='MACSENSE_DNA_V1';

export function exportSoundDna(genome,{trackName='MacSense Sound',creatorName='MacSense Artist',tags=[]}={}){
  if(!genome?.sourceId)throw new Error('Choose a measured genome to export');
  const payload={
    genome:structuredClone(genome),trackName,creatorName,macsenseVersion:'1.0',exportedAt:Date.now(),tags:[...tags],
    lineageSummary:`Parents: ${(genome.parents||[]).length}, Source: ${genome.sourceId}`
  };
  return `# ${MAGIC}\n# Track: ${trackName}\n# Creator: ${creatorName}\n# Exported: ${payload.exportedAt}\n# Breed this sound — import into MacSense and mutate freely.\n\n${JSON.stringify(payload,null,2)}`;
}

export function importSoundDna(raw){
  if(!String(raw||'').includes(MAGIC))throw new Error(`Not a Sound DNA payload: missing ${MAGIC} header`);
  const json=String(raw).split(/\r?\n/).filter(line=>!line.startsWith('#')).join('\n').trim();
  let payload;try{payload=JSON.parse(json)}catch{throw new Error('Sound DNA payload is not readable')}
  const g=payload?.genome;if(!g?.sourceId)throw new Error('Sound DNA has no genome source');
  for(const key of ['transient','harmonicity','brightness','dynamics','stereoWidth','confidence']){
    const value=Number(g[key]??(key==='stereoWidth'?0:key==='confidence'?1:NaN));if(!Number.isFinite(value)||value<0||value>1)throw new Error(`Invalid Sound DNA trait: ${key}`);g[key]=value;
  }
  g.parents=Array.isArray(g.parents)?g.parents.map(String):[];
  return {payload,genome:g};
}

function install(){
  const genetics=document.querySelector('.genetics-panel');if(!genetics||document.querySelector('#sound-dna-tools'))return;
  const panel=document.createElement('div');panel.id='sound-dna-tools';panel.className='sound-dna-tools';
  panel.innerHTML=`<div class="subhead"><span>SOUND DNA PORT</span><small>Android-compatible ${MAGIC}</small></div><div class="dna-actions"><button id="dna-export">Export Selected DNA</button><button id="dna-import-toggle" class="ghost">Import DNA</button></div><textarea id="dna-payload" hidden placeholder="Paste a MACSENSE_DNA_V1 payload here"></textarea><button id="dna-import" hidden>Import Into Lineage</button><p id="dna-status"></p>`;
  genetics.append(panel);
  const area=panel.querySelector('#dna-payload'),importButton=panel.querySelector('#dna-import'),status=panel.querySelector('#dna-status');
  panel.querySelector('#dna-import-toggle').onclick=()=>{area.hidden=!area.hidden;importButton.hidden=area.hidden};
  panel.querySelector('#dna-export').onclick=async()=>{
    try{
      const bridge=globalThis.macsenseStudio,project=bridge?.getProject?.();if(!project)throw new Error('Studio project is not ready');
      const selected=document.querySelector('#parent-a')?.value||project.genomes.at(-1)?.sourceId;
      const genome=project.genomes.find(g=>g.sourceId===selected)||project.genomes.at(-1);if(!genome)throw new Error('Record, import, or measure a take first');
      const raw=exportSoundDna(genome,{trackName:project.name,creatorName:'MACSENSE Web',tags:genome.tags||[]});area.hidden=false;importButton.hidden=false;area.value=raw;area.select();
      try{await navigator.clipboard.writeText(raw);status.textContent='DNA copied to clipboard and shown below.'}catch{status.textContent='DNA ready below. Copy it to share.'}
    }catch(e){status.textContent=e.message}
  };
  importButton.onclick=()=>{
    try{
      const bridge=globalThis.macsenseStudio,project=bridge?.getProject?.();if(!project)throw new Error('Studio project is not ready');
      const {payload,genome}=importSoundDna(area.value);const local={...genome,sourceId:`${genome.sourceId}↧${Date.now().toString(36)}`,parents:[...(genome.parents||[]),genome.sourceId],tags:[...(payload.tags||[]),'imported']};
      project.genomes.push(local);project.lineage.push({child:local.sourceId,parents:local.parents,traits:['imported'],createdAt:new Date().toISOString()});bridge.setProject?.(project);status.textContent=`Imported ${payload.trackName||genome.sourceId} with lineage intact.`;
    }catch(e){status.textContent=e.message}
  };
}

if(typeof document!=='undefined')install();
