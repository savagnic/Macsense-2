import assert from 'node:assert/strict';

class FakeElement {
  constructor(selector, dataset = {}) { this.selector = selector; this.dataset = dataset; }
  closest(selector) {
    if (selector.includes('[data-feature]') && this.dataset.feature) return this;
    return selector.split(',').map(s => s.trim()).includes(this.selector) ? this : null;
  }
}

globalThis.Element = FakeElement;

const { installFirstUseCinematics } = await import('../src/first-use-cinematics.js');

const listeners = {};
const root = {
  addEventListener(type, fn) { listeners[type] = fn; },
  removeEventListener(type) { delete listeners[type]; }
};
const played = [];
globalThis.window = { MacSenseCinematics: { playFeatureCinematic: id => { played.push(id); return true; } } };

const cleanup = installFirstUseCinematics(root);
listeners.click({ target: new FakeElement('#record') });
listeners.focusin({ target: new FakeElement('#lyrics') });
listeners.click({ target: new FakeElement('button', { feature: 'vocal' }) });
listeners.click({ target: new FakeElement('button', { feature: 'resurrection' }) });

assert.deepEqual(played, ['flow-capture', 'lyrics-studio', 'vocal-scanner', 'resurrection']);
cleanup();
assert.equal(listeners.click, undefined);

console.log('first-use cinematics: ok');
