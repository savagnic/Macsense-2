import assert from 'node:assert/strict';
import test from 'node:test';
import { makeGenome, newProject } from '../src/domain.js';
import { breedFamilySound, buildFamilyTree, evolveSound, resurrectSound } from '../src/sound-family.js';

test('SoundGenome families track breeding, resurrection, and evolution lineage', () => {
  const project = newProject('Family proof');
  const root = makeGenome({ sourceId: 'root-vocal', transient: .6, harmonicity: .7, brightness: .5, dynamics: .8, stereoWidth: .3, confidence: .95 });
  const ref = makeGenome({ sourceId: 'air-reference', transient: .4, harmonicity: .65, brightness: .92, dynamics: .5, stereoWidth: .82, confidence: .9 });
  project.genomes.push(root, ref);

  const bred = breedFamilySound(project, root.sourceId, ref.sourceId, ['brightness', 'stereoWidth']);
  assert.equal(bred.child.parents.length, 2);
  assert.equal(bred.child.brightness, ref.brightness);
  assert.equal(bred.child.stereoWidth, ref.stereoWidth);
  assert.equal(project.lineage.at(-1).type, 'breed');

  const resurrected = resurrectSound(project, root.sourceId, ['hook-ghost']);
  assert.deepEqual(resurrected.child.parents, [root.sourceId]);
  assert.ok(resurrected.child.tags.includes('resurrection'));
  assert.equal(project.lineage.at(-1).type, 'resurrection');

  const evolved = evolveSound(project, resurrected.child.sourceId, 'cinematic');
  assert.deepEqual(evolved.child.parents, [resurrected.child.sourceId]);
  assert.ok(evolved.child.tags.includes('evolution'));
  assert.ok(evolved.child.stereoWidth >= resurrected.child.stereoWidth);

  const tree = buildFamilyTree(project);
  assert.ok(tree.length >= 1);
  assert.ok(tree.some(family => family.events.some(event => event.type === 'resurrection')));
  assert.ok(tree.some(family => family.members.some(member => member.sourceId === evolved.child.sourceId)));
});
