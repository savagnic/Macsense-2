const STORAGE_KEY = 'macsense_cinematic_completed';
const modal = document.getElementById('cinematic-intro');
const canvas = document.getElementById('cinematic-canvas');
const caption = document.getElementById('cinematic-caption');
const enter = document.getElementById('enter-studio');
const replay = document.getElementById('replay-cinematic');
const show = document.getElementById('show-cinematic');
const ctx = canvas?.getContext('2d');
let animation = 0;
let audioContext = null;
let step = 0;

const story = [
  'Drop a voice, breed a sound, command the mix, and let Ari propose the dangerous version before you decide what survives.',
  'Every take gets a measurable genome: transient, harmonicity, brightness, dynamics, width, confidence, and lineage.',
  'Ari does not overwrite your work. Ari proposes. You inspect. You apply. The studio remembers.',
  'This browser is now the instrument. Vinny can open it, record, breed, master, export, and keep going.'
];

function pulseAudio() {
  try {
    audioContext ||= new AudioContext();
    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    master.connect(audioContext.destination);
    for (const [frequency, detune, gain] of [[40, 0, 0.8], [108, -8, 0.18], [216, 6, 0.08]]) {
      const oscillator = audioContext.createOscillator();
      const node = audioContext.createGain();
      oscillator.type = frequency < 60 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      node.gain.value = gain;
      oscillator.connect(node).connect(master);
      oscillator.start(now);
      oscillator.stop(now + 1.45);
    }
  } catch { /* Browsers can deny autoplay; visuals still run. */ }
}

function draw(time = 0) {
  if (!ctx || modal.hidden) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const pulse = 0.5 + Math.sin(time / 420) * 0.5;
  const gradient = ctx.createRadialGradient(cx, cy, 8, cx, cy, 320);
  gradient.addColorStop(0, `rgba(229,184,105,${0.34 + pulse * 0.18})`);
  gradient.addColorStop(0.35, 'rgba(0,245,212,0.12)');
  gradient.addColorStop(1, 'rgba(8,8,12,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(229,184,105,.28)';
  ctx.lineWidth = 1;
  for (let ring = 0; ring < 5; ring++) {
    ctx.beginPath();
    const r = 48 + ring * 42 + pulse * 12;
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      const noise = Math.sin(a * (ring + 3) + time / (360 + ring * 70)) * 8;
      const x = cx + Math.cos(a) * (r + noise);
      const y = cy + Math.sin(a) * (r + noise);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,245,212,.72)';
  for (let i = 0; i < 80; i++) {
    const a = i * 2.399 + time / 2200;
    const r = 40 + (i % 13) * 18 + pulse * 18;
    ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2);
  }
  animation = requestAnimationFrame(draw);
}

function advanceStory() {
  if (modal.hidden) return;
  caption.textContent = story[step % story.length];
  step += 1;
  if (step <= story.length) setTimeout(advanceStory, 2600);
}

function openCinematic({ force = false } = {}) {
  if (!force && localStorage.getItem(STORAGE_KEY) === 'true') return;
  step = 0;
  modal.hidden = false;
  document.body.classList.add('cinematic-open');
  pulseAudio();
  cancelAnimationFrame(animation);
  animation = requestAnimationFrame(draw);
  advanceStory();
}

function closeCinematic() {
  modal.hidden = true;
  document.body.classList.remove('cinematic-open');
  localStorage.setItem(STORAGE_KEY, 'true');
  cancelAnimationFrame(animation);
}

enter?.addEventListener('click', closeCinematic);
replay?.addEventListener('click', () => { step = 0; pulseAudio(); advanceStory(); });
show?.addEventListener('click', () => openCinematic({ force: true }));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeCinematic(); });

openCinematic();
