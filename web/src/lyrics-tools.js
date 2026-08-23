const ACTIONS=[
  ['Rewrite','rewrite this selection while preserving the surrounding song voice'],
  ['More aggressive','make this selection more aggressive without adding empty filler'],
  ['Improve rhyme','improve the rhyme structure of this selection without flattening its meaning'],
  ['Better cadence','improve the cadence and mouth-feel of this selection for performance'],
  ['Change flow','change the rhythmic flow of this selection while keeping its core idea']
];

function install(){
  const textarea=document.querySelector('#lyrics');if(!textarea||document.querySelector('#lyric-ai-tools'))return;
  const bar=document.createElement('div');bar.id='lyric-ai-tools';bar.className='lyric-ai-tools';
  bar.innerHTML=`<span>HIGHLIGHT → ARI</span>${ACTIONS.map(([label,intent],i)=>`<button type="button" data-lyric-action="${i}" data-intent="${escapeAttr(intent)}">${label}</button>`).join('')}`;
  textarea.parentElement.insertBefore(bar,textarea);
  bar.onclick=e=>{
    const button=e.target.closest('[data-lyric-action]');if(!button)return;
    const start=textarea.selectionStart,end=textarea.selectionEnd,selected=textarea.value.slice(start,end).trim();
    if(!selected){button.animate([{transform:'translateX(-2px)'},{transform:'translateX(2px)'},{transform:'none'}],{duration:180});return}
    const ari=document.querySelector('#ari-input'),send=document.querySelector('#ari-send');
    if(!ari||!send)return;
    ari.value=`Act as my co-producer. ${button.dataset.intent}. Selected lyric:\n\n${selected}\n\nReturn your critique briefly, then propose the edit using rewrite_lyrics. IMPORTANT: the command's updated field must contain the COMPLETE lyric document, changing only this selected passage so applying it cannot delete the rest of my song.`;
    ari.dispatchEvent(new Event('input',{bubbles:true}));send.click();
    textarea.focus();textarea.setSelectionRange(start,end);
  };
}

function escapeAttr(s){return String(s).replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]))}
if(typeof document!=='undefined')install();
