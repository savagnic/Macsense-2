const PRESETS = {
  MATCH_CLOSELY: {
    label: 'Match Closely', autoTuneSpeedMs: 3, eqLowDb: -4, eqMidDb: 0.5, eqHighDb: 6,
    compThresholdDb: -22, compRatio: 6, reverbMixPct: 35, delayFeedbackPct: 45
  },
  FIT_MY_VOICE: {
    label: 'Fit My Voice', autoTuneSpeedMs: 18, eqLowDb: -1, eqMidDb: 2, eqHighDb: 3.5,
    compThresholdDb: -14, compRatio: 3.5, reverbMixPct: 15, delayFeedbackPct: 20
  },
  BLEND_STYLES: {
    label: 'Blend Styles', autoTuneSpeedMs: 10, eqLowDb: -2.5, eqMidDb: 1, eqHighDb: 4.5,
    compThresholdDb: -18, compRatio: 4.5, reverbMixPct: 25, delayFeedbackPct: 35
  }
};

export function computeVocalPreset(mode, analysis = {}) {
  const base = PRESETS[mode] || PRESETS.FIT_MY_VOICE;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  return {
    ...base,
    compThresholdDb: analysis.perceivedLoudnessDb == null ? base.compThresholdDb : clamp(base.compThresholdDb + analysis.perceivedLoudnessDb * 0.3, -48, -6),
    reverbMixPct: analysis.estimatedReverbPct == null ? base.reverbMixPct : clamp((base.reverbMixPct + analysis.estimatedReverbPct) / 2, 0, 80),
    eqHighDb: analysis.spectralBrightness == null ? base.eqHighDb : clamp(base.eqHighDb + analysis.spectralBrightness * 4 - 2, -12, 12)
  };
}

function installVocalScanner() {
  const sideStack = document.querySelector('.side-stack');
  if (!sideStack) return;
  const panel = document.createElement('section');
  panel.className = 'panel vocal-panel';
  panel.innerHTML = `
    <div class="panel-title compact"><div><span class="eyebrow">VOCAL SCANNER</span><h2>Preset Chain</h2></div></div>
    <div class="vocal-body">
      <div class="preset-row vocal-modes">
        <button data-vocal-mode="MATCH_CLOSELY">Match Closely</button>
        <button data-vocal-mode="FIT_MY_VOICE">Fit My Voice</button>
        <button data-vocal-mode="BLEND_STYLES">Blend Styles</button>
      </div>
      <div class="vocal-analysis">
        <label>Loudness dB <input id="vocal-loudness" type="range" min="-36" max="0" step="1" value="-14"></label>
        <label>Reverb % <input id="vocal-reverb" type="range" min="0" max="80" step="1" value="20"></label>
        <label>Brightness <input id="vocal-brightness" type="range" min="0" max="1" step="0.01" value="0.55"></label>
      </div>
      <div id="vocal-result" class="vocal-result"></div>
    </div>`;
  sideStack.append(panel);
  let mode = 'FIT_MY_VOICE';
  const render = () => {
    const preset = computeVocalPreset(mode, {
      perceivedLoudnessDb: Number(document.getElementById('vocal-loudness').value),
      estimatedReverbPct: Number(document.getElementById('vocal-reverb').value),
      spectralBrightness: Number(document.getElementById('vocal-brightness').value)
    });
    document.querySelectorAll('[data-vocal-mode]').forEach(b => b.classList.toggle('active', b.dataset.vocalMode === mode));
    document.getElementById('vocal-result').innerHTML = [
      ['Preset', preset.label],
      ['AutoTune', `${preset.autoTuneSpeedMs.toFixed(0)} ms`],
      ['EQ', `Low ${signed(preset.eqLowDb)} · Mid ${signed(preset.eqMidDb)} · Air ${signed(preset.eqHighDb)}`],
      ['Comp', `${preset.compThresholdDb.toFixed(1)} dBFS @ ${preset.compRatio.toFixed(1)}:1`],
      ['FX', `Reverb ${preset.reverbMixPct.toFixed(0)}% · Delay ${preset.delayFeedbackPct.toFixed(0)}%`]
    ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  };
  panel.addEventListener('click', event => { if (event.target.dataset.vocalMode) { mode = event.target.dataset.vocalMode; render(); } });
  panel.addEventListener('input', render);
  render();
}

function signed(n) { return `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)} dB`; }

installVocalScanner();
