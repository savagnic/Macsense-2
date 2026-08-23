import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAriCommands, stripAriCommands, executeAriCommand } from '../src/ari.js';

test('Ari commands parse without leaking executable XML into chat', () => {
  const raw='push it harder <ari_command type="set_tempo" bpm="142"/> then widen it';
  assert.deepEqual(parseAriCommands(raw),[{type:'set_tempo',bpm:'142'}]);
  assert.equal(stripAriCommands(raw),'push it harder  then widen it');
});

test('unknown Ari commands fail closed', () => {
  assert.throws(()=>executeAriCommand({type:'delete_everything'},{}),/Unsupported Ari command/);
});

test('track mutations are delegated, not silently executed', () => {
  let seen;
  executeAriCommand({type:'set_track_state',track_id:'t1',muted:'true',solo:'false',volume:'0.7',pan:'-0.2'},{setTrackState:(id,p)=>seen={id,p}});
  assert.equal(seen.id,'t1'); assert.equal(seen.p.muted,true); assert.equal(seen.p.volume,.7); assert.equal(seen.p.pan,-.2);
});
