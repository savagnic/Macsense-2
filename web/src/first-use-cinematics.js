const selectorMap = [
  ['#play,.tracks,.add-track,#add-audio', 'vertical-daw'],
  ['#record', 'flow-capture'],
  ['#lyrics', 'lyrics-studio'],
  ['#ari-input,#ari-send,.ari-panel', 'ari'],
  ['#genome-list,.genetics-panel', 'sound-genetics'],
  ['#breed,.breed-controls', 'breeding'],
  ['#export-mix', 'export'],
  ['#target-lufs,#ceiling,#warmth,#width,#punch,.master-card', 'mastering']
];

const dockFeatureMap = {
  arrangement: 'arrangement',
  vocal: 'vocal-scanner',
  resurrection: 'resurrection',
  story: 'ari'
};

function trigger(featureId) {
  return Boolean(window.MacSenseCinematics?.playFeatureCinematic?.(featureId));
}

function matchesSelector(event, selector) {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest(selector));
}

export function installFirstUseCinematics(root = document) {
  const onIntent = (event) => {
    const dockButton = event.target instanceof Element ? event.target.closest('[data-feature]') : null;
    if (dockButton?.dataset.feature && dockFeatureMap[dockButton.dataset.feature]) {
      trigger(dockFeatureMap[dockButton.dataset.feature]);
      return;
    }
    for (const [selector, featureId] of selectorMap) {
      if (matchesSelector(event, selector)) {
        trigger(featureId);
        return;
      }
    }
  };
  root.addEventListener('click', onIntent, true);
  root.addEventListener('focusin', onIntent, true);
  root.addEventListener('input', onIntent, true);
  root.addEventListener('change', onIntent, true);
  return () => {
    root.removeEventListener('click', onIntent, true);
    root.removeEventListener('focusin', onIntent, true);
    root.removeEventListener('input', onIntent, true);
    root.removeEventListener('change', onIntent, true);
  };
}

if (typeof document !== 'undefined') installFirstUseCinematics(document);
