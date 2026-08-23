import { MAIN_CINEMATIC, FEATURE_CINEMATICS } from './cinematic-spec.js';

const modal = document.getElementById('cinematic-intro');
const canvas = document.getElementById('cinematic-canvas');
const caption = document.getElementById('cinematic-caption');
const title = document.getElementById('cinematic-title');
const enter = document.getElementById('enter-studio');
const replay = document.getElementById('replay-cinematic');
const show = document.getElementById('show-cinematic');
const ctx = canvas?.getContext('2d');
let animation = 0;
let audioContext = null;
let beatTimer = 0;
let closeTimer = 0;
let startedAt = 0;

function pulseAudio({ long = false } = {}) {
  try {
    audioContext ||= new AudioContext();
    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(long ? 0.16 : 0.18, now + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, now + (long ? 6.0 : 1.4));
    master.connect(audioContext.destination);
    const tones = long ? [[36, 0, 0.9], [72, -7, 0.22], [144, 5, 0.12], [288, 9, 0.05]] : [[40, 0, 0.8], [108, -8, 0.18], [216, 6, 0.08]];
    for (const [frequency, detune, gain] of tones) {
      const oscillator = audioContext.createOscillator();
      const node = audioContext.createGain();
      oscillator.type = frequency < 60 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      node.gain.value = gain;
      oscillator.connect(node).connect(master);
      oscillator.start(now);
      oscillator.stop(now + (long ? 6.1 : 1.45));
    }
  } catch { /* Browsers can deny autoplay; visuals still run. */ }
}

function draw(time = 0) {
  if (!ctx || modal.hidden) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const elapsed = startedAt ? (performance.now() - startedAt) / 1000 : 0;
  const progress = Math.min(1, elapsed / MAIN_CINEMATIC.durationSeconds);
  const pulse = 0.5 + Math.sin(time / 420) * 0.5;
  const gradient = ctx.createRadialGradient(cx, cy, 8, cx, cy, 360);
  gradient.addColorStop(0, `rgba(229,184,105,${0.34 + pulse * 0.18})`);
  gradient.addColorStop(0.35, 'rgba(0,245,212,0.12)');
  gradient.addColorStop(1, 'rgba(8,8,12,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(229,184,105,.28)';
  ctx.lineWidth = 1;
  for (let ring = 0; ring < 7; ring++) {
    ctx.beginPath();
    const r = 48 + ring * 38 + pulse * 12 + progress * 54;
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const noise = Math.sin(a * (ring + 3) + time / (360 + ring * 70)) * (8 + ring);
      const x = cx + Math.cos(a) * (r + noise);
      const y = cy + Math.sin(a) * (r + noise);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,245,212,.72)';
  for (let i = 0; i < 120; i++) {
    const a = i * 2.399 + time / 2200;
    const r = 40 + (i % 17) * 16 + pulse * 18 + progress * 80;
    ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2);
  }
  ctx.fillStyle = 'rgba(229,184,105,.9)';
  ctx.fillRect(80, h - 44, (w - 160) * progress, 3);
  animation = requestAnimationFrame(draw);
}

function scheduleMainStory() {
  clearTimeout(beatTimer);
  const start = Date.now();
  const showBeat = (index) => {
    const beat = MAIN_CINEMATIC.beats[index];
    if (!beat || modal.hidden) return;
    title.textContent = index === 0 ? MAIN_CINEMATIC.title : beat.line.split('.')[0] + '.';
    caption.textContent = beat.line;
    const next = MAIN_CINEMATIC.beats[index + 1];
    if (next) beatTimer = setTimeout(() => showBeat(index + 1), Math.max(500, (next.at * 1000) - (Date.now() - start)));
  };
  showBeat(0);
  closeTimer = setTimeout(() => {
    if (!modal.hidden) caption.textContent = 'The system is ready. Enter when you feel the pulse.';
  }, MAIN_CINEMATIC.durationSeconds * 1000);
}

export function playFeatureCinematic(featureId, { force = false } = {}) {
  const feature = FEATURE_CINEMATICS.find(item => item.id === featureId);
  if (!feature) return false;
  if (!force && localStorage.getItem(feature.storageKey) === 'true') return false;
  modal.hidden = false;
  document.body.classList.add('cinematic-open');
  startedAt = performance.now();
  title.textContent = feature.title;
  caption.textContent = feature.line;
  pulseAudio();
  cancelAnimationFrame(animation);
  animation = requestAnimationFrame(draw);
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    localStorage.setItem(feature.storageKey, 'true');
    closeCinematic();
  }, feature.durationSeconds * 1000);
  return true;
}

function openCinematic({ force = false } = {}) {
  if (!force && localStorage.getItem(MAIN_CINEMATIC.storageKey) === 'true') return;
  modal.hidden = false;
  document.body.classList.add('cinematic-open');
  startedAt = performance.now();
  pulseAudio({ long: true });
  cancelAnimationFrame(animation);
  animation = requestAnimationFrame(draw);
  scheduleMainStory();
}

function closeCinematic() {
  modal.hidden = true;
  document.body.classList.remove('cinematic-open');
  localStorage.setItem(MAIN_CINEMATIC.storageKey, 'true');
  clearTimeout(beatTimer);
  clearTimeout(closeTimer);
  cancelAnimationFrame(animation);
}

enter?.addEventListener('click', closeCinematic);
replay?.addEventListener('click', () => openCinematic({ force: true }));
show?.addEventListener('click', () => openCinematic({ force: true }));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeCinematic(); });
window.MacSenseCinematics = { playFeatureCinematic, MAIN_CINEMATIC, FEATURE_CINEMATICS };

openCinematic();
