class Biquad {
  constructor(b0,b1,b2,a1,a2){this.b0=b0;this.b1=b1;this.b2=b2;this.a1=a1;this.a2=a2;this.z1=0;this.z2=0}
  process(x){const y=this.b0*x+this.z1;this.z1=this.b1*x-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y}
}

export class KWeighting {
  constructor(sampleRate){
    const f0s=1681.974450955533,gainDb=3.999843853973347,q1=.7071752369554196;
    const k1=Math.tan(Math.PI*f0s/sampleRate),vh=10**(gainDb/20),vb=vh**.4996667741545416,den1=1+k1/q1+k1*k1;
    this.stage1=new Biquad((vh+vb*k1/q1+k1*k1)/den1,2*(k1*k1-vh)/den1,(vh-vb*k1/q1+k1*k1)/den1,2*(k1*k1-1)/den1,(1-k1/q1+k1*k1)/den1);
    const f0h=38.13547087602444,q2=.5003270373238773,k2=Math.tan(Math.PI*f0h/sampleRate),den2=1+k2/q2+k2*k2;
    this.stage2=new Biquad(1,-2,1,2*(k2*k2-1)/den2,(1-k2/q2+k2*k2)/den2);
  }
  process(x){return this.stage2.process(this.stage1.process(x))}
}

export function integratedLufs(buffer){
  if(!buffer?.length)return -Infinity;
  const sampleRate=buffer.sampleRate, channels=Array.from({length:buffer.numberOfChannels},(_,c)=>buffer.getChannelData(c));
  const total=buffer.length, block=Math.floor(.4*sampleRate), step=Math.floor(.1*sampleRate); if(total<block)return -Infinity;
  const filtered=channels.map(src=>{const f=new KWeighting(sampleRate),dst=new Float64Array(total);for(let i=0;i<total;i++)dst[i]=f.process(src[i]);return dst});
  const blocks=Math.floor((total-block)/step)+1, energy=filtered.map(()=>new Float64Array(blocks));
  for(let b=0;b<blocks;b++){const start=b*step;for(let c=0;c<filtered.length;c++){let sum=0;const s=filtered[c];for(let i=0;i<block;i++){const x=s[start+i];sum+=x*x}energy[c][b]=sum/block}}
  const weights=channels.map((_,i)=>channels.length===2?1:(i===3||i===4?1.41:1));
  const survive=new Uint8Array(blocks);let n=0;
  for(let b=0;b<blocks;b++){let z=0;for(let c=0;c<channels.length;c++)z+=weights[c]*energy[c][b];if(z>0&&(-.691+10*Math.log10(z))>-70){survive[b]=1;n++}}
  if(!n)return -Infinity;
  let absSum=0;for(let c=0;c<channels.length;c++){let z=0;for(let b=0;b<blocks;b++)if(survive[b])z+=energy[c][b];absSum+=weights[c]*(z/n)}
  if(absSum<=0)return -Infinity;const gammaR=-.691+10*Math.log10(absSum)-10;
  let finalBlocks=0;const means=new Float64Array(channels.length);
  for(let b=0;b<blocks;b++)if(survive[b]){let z=0;for(let c=0;c<channels.length;c++)z+=weights[c]*energy[c][b];if(z>0&&(-.691+10*Math.log10(z))>gammaR){finalBlocks++;for(let c=0;c<channels.length;c++)means[c]+=energy[c][b]}}
  if(!finalBlocks)return -Infinity;let final=0;for(let c=0;c<channels.length;c++)final+=weights[c]*(means[c]/finalBlocks);return final>0?-.691+10*Math.log10(final):-Infinity;
}

const OS=4,TAPS=12,N=OS*TAPS;
function truePeakPhases(){const h=new Float64Array(N),center=(N-1)/2;for(let n=0;n<N;n++){const x=n-center,sinc=Math.abs(x)<1e-12?1/OS:Math.sin(Math.PI*x/OS)/(Math.PI*x),hann=.5-.5*Math.cos(2*Math.PI*n/(N-1));h[n]=sinc*hann}let sum=0;for(const v of h)sum+=v;for(let n=0;n<N;n++)h[n]=h[n]*OS/sum;return Array.from({length:OS},(_,p)=>Float64Array.from({length:TAPS},(_,k)=>h[k*OS+p]))}
const TP_PHASES=truePeakPhases();
export function truePeakDbtp(samples){if(!samples?.length)return -Infinity;let peak=0;const hist=new Float64Array(TAPS);for(const s of samples){for(let i=TAPS-1;i>0;i--)hist[i]=hist[i-1];hist[0]=s;for(let p=0;p<OS;p++){let acc=0;for(let k=0;k<TAPS;k++)acc+=hist[k]*TP_PHASES[p][k];peak=Math.max(peak,Math.abs(acc))}}return peak<=1e-15?-Infinity:20*Math.log10(peak)}

export function measureBuffer(buffer){return{integratedLufs:integratedLufs(buffer),truePeakDbtp:Math.max(...Array.from({length:buffer.numberOfChannels},(_,c)=>truePeakDbtp(buffer.getChannelData(c))))}}

export function applyGainInPlace(buffer,db){const gain=10**(db/20);for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=Math.max(-1,Math.min(1,data[i]*gain))}return buffer}

export function normalizeToTarget(buffer,{targetLufs=-14,ceilingDbtp=-1}={}){const before=measureBuffer(buffer);if(!Number.isFinite(before.integratedLufs))return{buffer,before,after:before,gainDb:0};let gainDb=targetLufs-before.integratedLufs;if(Number.isFinite(before.truePeakDbtp))gainDb=Math.min(gainDb,ceilingDbtp-before.truePeakDbtp);applyGainInPlace(buffer,gainDb);return{buffer,before,after:measureBuffer(buffer),gainDb}}
