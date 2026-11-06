'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('compartidos.js','utf8');
const match=src.match(/async function ensureSession\(\)\{[\s\S]*?\n\}\nasync function sendCode/);
assert(match,'No se encuentra ensureSession');
const functionSource=match[0].slice(0,-'async function sendCode'.length);

test('Una renovación fallida retira inmediatamente todos los datos de Compartidos',async()=>{
  let renders=0,saves=0;
  const factory=new Function('request','persist','renderRoot',
    "let session={access_token:'expired',refresh_token:'stale',expires_at:1},user={id:'u'},household={id:'h'},"+
    "members=[1],expenses=[1],settlements=[1],closureApprovals=[1],currentTransfer={},lastLoadedGeneration=9,inviteCode='secret',loadGeneration=4;"+
    functionSource+";return {run:ensureSession,state:()=>({session,user,household,members,expenses,settlements,closureApprovals,currentTransfer,lastLoadedGeneration,inviteCode,loadGeneration})};"
  );
  const fixture=factory(async()=>{throw Error('refresh refused');},()=>{saves++;},()=>{renders++;});
  await assert.rejects(fixture.run(),/Tu sesión ha caducado/);
  const state=fixture.state();
  for(const key of ['session','user','household','currentTransfer'])assert.equal(state[key],null,key);
  for(const key of ['members','expenses','settlements','closureApprovals'])assert.deepEqual(state[key],[],key);
  assert.equal(state.inviteCode,'');
  assert.equal(state.lastLoadedGeneration,0);
  assert.equal(state.loadGeneration,5);
  assert.equal(renders,1);
  assert.equal(saves,1);
});
test('Una sesión todavía válida no modifica los datos ni consulta el servidor',async()=>{
  let requests=0,renders=0;
  const factory=new Function('request','persist','renderRoot',
    "let session={access_token:'live',refresh_token:'valid',expires_at:Math.floor(Date.now()/1000)+3600},"+
    "user={id:'u'},household={id:'h'},members=[1],expenses=[1],settlements=[1],closureApprovals=[1],"+
    "currentTransfer={},lastLoadedGeneration=9,inviteCode='secret',loadGeneration=4;"+
    functionSource+";return {run:ensureSession,state:()=>({session,expenses})};"
  );
  const fixture=factory(async()=>{requests++;},()=>{},()=>{renders++;});
  await fixture.run();
  assert.equal(fixture.state().session.access_token,'live');
  assert.deepEqual(fixture.state().expenses,[1]);
  assert.equal(requests,0);
  assert.equal(renders,0);
});
