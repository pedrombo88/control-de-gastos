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
    "let refreshPromise=null,session={access_token:'expired',refresh_token:'stale',expires_at:1},user={id:'u'},household={id:'h'},"+
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
    "let refreshPromise=null,session={access_token:'live',refresh_token:'valid',expires_at:Math.floor(Date.now()/1000)+3600},"+
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

test('Las renovaciones simultáneas comparten una única petición a Auth',async()=>{
  let requests=0,saves=0,release;
  const factory=new Function('request','persist','renderRoot',
    "let refreshPromise=null,session={access_token:'old',refresh_token:'one-use',expires_at:1},"+
    "user={id:'u'},household=null,members=[],expenses=[],settlements=[],closureApprovals=[],"+
    "currentTransfer=null,lastLoadedGeneration=0,inviteCode='',loadGeneration=0;"+
    functionSource+";return {run:ensureSession,state:()=>({session,refreshPromise})};"
  );
  const gate=new Promise(resolve=>{release=resolve;});
  const fixture=factory(async()=>{requests++;await gate;return {
    access_token:'new',refresh_token:'new-refresh',expires_at:Math.floor(Date.now()/1000)+3600
  };},()=>{saves++;},()=>{});
  const attempts=[fixture.run(),fixture.run(),fixture.run()];
  assert.equal(requests,1,'Deben compartir la renovación en curso');
  release();
  await Promise.all(attempts);
  assert.equal(requests,1);
  assert.equal(saves,1);
  assert.equal(fixture.state().session.access_token,'new');
  assert.equal(fixture.state().refreshPromise,null);
});

test('Una renovación tardía no restaura la cuenta cerrada en otra pestaña',async()=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const factory=new Function('request','persist','renderRoot',
    "let refreshPromise=null,session={access_token:'old',refresh_token:'one-use',expires_at:1},"+
    "user={id:'u'},household=null,members=[],expenses=[],settlements=[],closureApprovals=[],"+
    "currentTransfer=null,lastLoadedGeneration=0,inviteCode='',loadGeneration=0;"+
    functionSource+";return {run:ensureSession,clear:()=>{session=null;},state:()=>session};"
  );
  const fixture=factory(async()=>{await gate;return {
    access_token:'new',refresh_token:'new-refresh',expires_at:Math.floor(Date.now()/1000)+3600
  };},()=>{},()=>{});
  const pending=fixture.run();
  fixture.clear();
  release();
  await assert.rejects(pending,/sesión ha caducado/);
  assert.equal(fixture.state(),null);
});
