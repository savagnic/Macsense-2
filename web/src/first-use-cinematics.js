const selectorMap = [
  ['#commercial-deck,#commercial-start-cinema,#commercial-run-proof', 'proof-mode'],
  ['#play,.tracks,.add-track,#add-audio', 'vertical-daw'],
  ['#record', 'flow-capture'],
  ['#song-revision-studio,#revision-bars,#revision-rewrite,#revision-export', 'bar-revision'],
  ['#lyrics', 'bar-revision'],
  ['#ari-input,#ari-send,.ari-panel', 'ari'],
  ['#genome-list,.genetics-panel,#sound-family-studio', 'sound-genetics'],
  ['#breed,.breed-controls,#family-breed', 'breeding'],
  ['#family-resurrect,#resurrect-sound', 'resurrection'],
  ['#legal-engine-pack,#engine-pack-split,#engine-pack-export', 'engine-pack'],
  ['#export-mix', 'export'],
  ['#target-lufs,#ceiling,#warmth,#width,#punch,.master-card', 'mastering']
];

const dockFeatureMap = {
  proof: 'proof-mode',
  vocal: 'vocal-scanner',
  resurrection: 'resurrection',
  story: 'ari',
  revision: 'bar-revision',
  engine: 'engine-pack'
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
