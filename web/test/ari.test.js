import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAriCommands, stripAriCommands, executeAriCommand } from '../src/ari.js';

test('self-closing Ari commands parse without leaking executable XML into chat', () => {
  const raw='push it harder <ari_command type="set_tempo" bpm="142"/> then widen it';
  assert.deepEqual(parseAriCommands(raw),[{type:'set_tempo',bpm:'142'}]);
  assert.equal(stripAriCommands(raw),'push it harder  then widen it');
});

test('Android legacy JSON command protocol remains supported', () => {
  const raw='I would move it. <ari_command>{"type":"update_bpm","bpm_value":138,"explanation":"more urgency"}</ari_command>';
  assert.deepEqual(parseAriCommands(raw),[{type:'update_bpm',bpm_value:138,explanation:'more urgency'}]);
  assert.equal(stripAriCommands(raw),'I would move it.');
});

test('unknown Ari commands fail closed', () => {
  assert.throws(()=>executeAriCommand({type:'delete_everything'},{}),/Unsupported Ari command/);
});

test('track mutations are delegated, not silently executed', () => {
  let seen;
  executeAriCommand({type:'set_track_state',track_id:'t1',muted:'true',solo:'false',volume:'0.7',pan:'-0.2'},{setTrackState:(id,p)=>seen={id,p}});
  assert.equal(seen.id,'t1'); assert.equal(seen.p.muted,true); assert.equal(seen.p.volume,.7); assert.equal(seen.p.pan,-.2);
});

test('full Android command vocabulary delegates to explicit handlers', () => {
  const seen=[];
  const handlers={
    setTempo:v=>seen.push(['tempo',v]),
    rewriteLyrics:(v,why,id)=>seen.push(['lyrics',v,why,id]),
    reorderSections:v=>seen.push(['order',v]),
    setMasterPreset:v=>seen.push(['preset',v]),
    updateEffects:(id,v)=>seen.push(['effects',id,v]),
    breedSounds:(a,b,_traits,bias,tags)=>seen.push(['breed',a,b,bias,tags]),
    resurrectSound:(id,tags)=>seen.push(['resurrect',id,tags])
  };
  executeAriCommand({type:'update_bpm',bpm_value:141},handlers);
  executeAriCommand({type:'update_lyrics',value:'new hook',explanation:'stronger',section_id:'hook'},handlers);
  executeAriCommand({type:'reorder_sections',section_order:['hook','verse1']},handlers);
  executeAriCommand({type:'apply_preset',preset_name:'streaming_clean'},handlers);
  executeAriCommand({type:'update_effects',section_id:'hook',reverb:.4,delay:.2},handlers);
  executeAriCommand({type:'breed_sounds',parent_take_id:'a',parent_take_id_2:'b',trait_bias:.7,tags:['hybrid']},handlers);
  executeAriCommand({type:'resurrect_sound',take_id:'old',tags:['reborn']},handlers);
  assert.equal(seen.length,7);
  assert.deepEqual(seen[0],['tempo',141]);
  assert.deepEqual(seen[2],['order',['hook','verse1']]);
  assert.deepEqual(seen[6],['resurrect','old',['reborn']]);
});
