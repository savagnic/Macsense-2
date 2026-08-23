import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGenome, breedGenomes, genomeDistance } from '../src/domain.js';

test('SoundGenome matches Android normalized trait semantics', () => {
  const g = makeGenome({ sourceId: 'a', transient: 2, harmonicity: -.5, brightness: .4, dynamics: .6, stereoWidth: .2, confidence: .9 });
  assert.equal(g.transient, 1); assert.equal(g.harmonicity, 0); assert.equal(g.brightness, .4); assert.equal(g.confidence, .9);
});

test('breeding inherits selected traits and records both parents', () => {
  const a = makeGenome({ sourceId:'a', transient:.1, harmonicity:.2, brightness:.3, dynamics:.4, stereoWidth:.5, confidence:.9 });
  const b = makeGenome({ sourceId:'b', transient:.9, harmonicity:.8, brightness:.7, dynamics:.6, stereoWidth:.5, confidence:.7 });
  const c = breedGenomes(a,b,['brightness','dynamics']);
  assert.equal(c.transient,.1); assert.equal(c.brightness,.7); assert.equal(c.dynamics,.6); assert.deepEqual(c.parents,['a','b']); assert.equal(c.confidence,.7);
});

test('genome distance is zero for identical sounds', () => {
  const a = makeGenome({sourceId:'a',transient:.1,harmonicity:.2,brightness:.3,dynamics:.4,stereoWidth:.5});
  assert.equal(genomeDistance(a,{...a}),0);
});
