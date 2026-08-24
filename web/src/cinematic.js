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
let activeBeat = MAIN_CINEMATIC.beats[0];

function ensureCanvasSize() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(900, Math.floor(rect.width * dpr));
  const height = Math.max(520, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function pulseAudio({ long = false } = {}) {
  try {
    audioContext ||= new AudioContext();
    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 24;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.24;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(long ? 0.11 : 0.13, now + 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, now + (long ? 7.4 : 1.6));
    master.connect(compressor).connect(audioContext.destination);
    const tones = long ? [[34, 0, 0.84], [68, -5, 0.28], [136, 7, 0.13], [272, -9, 0.05]] : [[42, 0, 0.7], [126, -7, 0.16], [252, 6, 0.06]];
    for (const [frequency, detune, gain] of tones) {
      const oscillator = audioContext.createOscillator();
      const node = audioContext.createGain();
      oscillator.type = frequency < 60 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      node.gain.setValueAtTime(gain, now);
      node.gain.exponentialRampToValueAtTime(0.0001, now + (long ? 7.35 : 1.55));
      oscillator.connect(node).connect(master);
      oscillator.start(now);
      oscillator.stop(now + (long ? 7.5 : 1.7));
    }
  } catch { /* Browsers can deny autoplay; visuals still run. */ }
}

function draw(time = 0) {
  if (!ctx || modal.hidden) return;
  ensureCanvasSize();
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.62, cy = h * 0.42;
  const elapsed = startedAt ? (performance.now() - startedAt) / 1000 : 0;
  const progress = Math.min(1, elapsed / MAIN_CINEMATIC.durationSeconds);
  const pulse = 0.5 + Math.sin(time / 460) * 0.5;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#040408');
  bg.addColorStop(0.52, '#0b0d12');
  bg.addColorStop(1, '#05080a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.58);
  glow.addColorStop(0, `rgba(229,184,105,${0.26 + pulse * 0.18})`);
  glow.addColorStop(0.24, 'rgba(0,245,212,0.13)');
  glow.addColorStop(0.58, 'rgba(38,34,54,0.12)');
  glow.addColorStop(1, 'rgba(8,8,12,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = 'rgba(232,184,105,.36)';
  ctx.lineWidth = Math.max(1, w / 1600);
  for (let ring = 0; ring < 8; ring++) {
    ctx.beginPath();
    const r = 54 + ring * 42 + pulse * 16 + progress * 74;
    for (let i = 0; i <= 240; i++) {
      const a = (i / 240) * Math.PI * 2;
      const noise = Math.sin(a * (ring + 2) + time / (440 + ring * 72)) * (7 + ring * 1.3);
      const x = cx + Math.cos(a) * (r + noise);
      const y = cy + Math.sin(a) * (r * 0.72 + noise);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.78;
  for (let i = 0; i < 150; i++) {
    const a = i * 2.399963 + time / 2500;
    const r = 52 + (i % 23) * 18 + pulse * 20 + progress * 100;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.72;
    ctx.fillStyle = i % 7 === 0 ? 'rgba(229,184,105,.78)' : 'rgba(0,245,212,.55)';
    ctx.fillRect(x, y, 2.2, 2.2);
  }
  ctx.restore();

  const railLeft = w * 0.07;
  const railTop = h * 0.12;
  const railHeight = h * 0.56;
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(railLeft, railTop);
  ctx.lineTo(railLeft, railTop + railHeight);
  ctx.stroke();
  MAIN_CINEMATIC.beats.forEach((beat, index) => {
    const y = railTop + (beat.at / MAIN_CINEMATIC.durationSeconds) * railHeight;
    const active = activeBeat?.label === beat.label;
    ctx.fillStyle = active ? 'rgba(229,184,105,.95)' : 'rgba(255,255,255,.2)';
    ctx.fillRect(railLeft - 4, y - 2, active ? 18 : 8, 4);
    if (active) {
      ctx.font = `${Math.max(11, w / 105)}px ui-monospace, monospace`;
      ctx.fillStyle = 'rgba(229,184,105,.92)';
      ctx.fillText(beat.label.toUpperCase(), railLeft + 24, y + 4);
    }
  });

  const progressY = h - Math.max(34, h * 0.065);
  ctx.fillStyle = 'rgba(255,255,255,.11)';
  ctx.fillRect(w * 0.07, progressY, w * 0.86, 2);
  ctx.fillStyle = 'rgba(229,184,105,.95)';
  ctx.fillRect(w * 0.07, progressY, w * 0.86 * progress, 3);

  animation = requestAnimationFrame(draw);
}

function scheduleMainStory() {
  clearTimeout(beatTimer);
  const start = Date.now();
  const showBeat = (index) => {
    const beat = MAIN_CINEMATIC.beats[index];
    if (!beat || modal.hidden) return;
    activeBeat = beat;
    title.textContent = index === 0 ? MAIN_CINEMATIC.title : beat.label;
    caption.textContent = beat.line;
    const next = MAIN_CINEMATIC.beats[index + 1];
    if (next) beatTimer = setTimeout(() => showBeat(index + 1), Math.max(500, (next.at * 1000) - (Date.now() - start)));
  };
  showBeat(0);
  closeTimer = setTimeout(() => {
    if (!modal.hidden) caption.textContent = 'The studio is ready. Enter when you are ready to work.';
  }, MAIN_CINEMATIC.durationSeconds * 1000);
}

export function playFeatureCinematic(featureId, { force = false } = {}) {
  const feature = FEATURE_CINEMATICS.find(item => item.id === featureId);
  if (!feature) return false;
  if (!force && localStorage.getItem(feature.storageKey) === 'true') return false;
  modal.hidden = false;
  document.body.classList.add('cinematic-open');
  startedAt = performance.now();
  activeBeat = { label: feature.title, line: feature.line, at: 0 };
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

function shouldForceIntro() {
  const params = new URLSearchParams(location.search);
  return params.has('cinema') || params.has('tour') || params.has('vinny');
}

function openCinematic({ force = false } = {}) {
  if (!force && !shouldForceIntro() && localStorage.getItem(MAIN_CINEMATIC.storageKey) === 'true') return;
  modal.hidden = false;
  document.body.classList.add('cinematic-open');
  startedAt = performance.now();
  activeBeat = MAIN_CINEMATIC.beats[0];
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
window.addEventListener('resize', ensureCanvasSize);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeCinematic(); });
window.MacSenseCinematics = { playFeatureCinematic, MAIN_CINEMATIC, FEATURE_CINEMATICS, openCinematic };

openCinematic();
