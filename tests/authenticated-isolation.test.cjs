/* Budviva: verificación RLS autenticada, exclusivamente GET. No cambia ni revela gastos. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('shared-config.js','utf8'),context);
const {url,publishableKey}=context.window.BUDVIVA_SHARED_CONFIG;
const names=['BUDVIVA_TEST_TOKEN_A','BUDVIVA_TEST_TOKEN_B','BUDVIVA_TEST_GROUP_A','BUDVIVA_TEST_GROUP_B'];
const present=names.filter(name=>Boolean(process.env[name]));
const enabled=present.length===names.length;
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const users=enabled?[
  {token:process.env.BUDVIVA_TEST_TOKEN_A,group:process.env.BUDVIVA_TEST_GROUP_A},
  {token:process.env.BUDVIVA_TEST_TOKEN_B,group:process.env.BUDVIVA_TEST_GROUP_B}
]:[];
async function rows(user,table,filter){
  const endpoint=new URL(url+'/rest/v1/'+table);
  endpoint.searchParams.set('select','*');
  endpoint.searchParams.set('limit','1000');
  if(filter)endpoint.searchParams.set(filter.column,'eq.'+filter.value);
  const response=await fetch(endpoint,{
    method:'GET',headers:{apikey:publishableKey,Authorization:'Bearer '+user.token,Accept:'application/json'},
    signal:AbortSignal.timeout(15000),cache:'no-store'
  });
  assert.equal(response.status,200,table+': HTTP '+response.status+'; se esperaba 200');
  const body=await response.json();
  assert(Array.isArray(body),table+': respuesta de formato inesperado');
  return body;
}
test('Prueba autenticada: configuración completa y grupos distintos',()=>{
  assert(present.length===0||enabled,'Debes proporcionar ambos tokens y ambos ID de grupo');
  if(!enabled)return;
  assert(uuid.test(users[0].group)&&uuid.test(users[1].group),'Los grupos deben ser UUID válidos');
  assert.notEqual(users[0].group,users[1].group,'Se requieren grupos distintos');
  assert.notEqual(users[0].token,users[1].token,'Se requieren dos sesiones diferentes');
});
for(const [index,other] of [[0,1],[1,0]]){
  test('Usuario '+(index===0?'A':'B')+': solo puede leer su grupo',{skip:!enabled},async()=>{
    const own=await rows(users[index],'bv_households',{column:'id',value:users[index].group});
    assert.equal(own.length,1,'El usuario no puede leer su propio grupo');
    const foreign=await rows(users[index],'bv_households',{column:'id',value:users[other].group});
    assert.equal(foreign.length,0,'Acceso indebido a otro grupo');
  });
  for(const table of ['bv_members','bv_expenses','bv_settlements','bv_household_closure_approvals']){
    test('Usuario '+(index===0?'A':'B')+': aislamiento de '+table,{skip:!enabled},async()=>{
      const foreign=await rows(users[index],table,{column:'household_id',value:users[other].group});
      assert.equal(foreign.length,0,'Fuga entre grupos: '+table);
    });
  }
}
for(const [index,user] of users.entries()){
  test('Invitaciones privadas inaccesibles: '+(index===0?'A':'B'),async()=>{
    const endpoint=new URL(url+'/rest/v1/bv_invitations');
    endpoint.searchParams.set('select','id');
    endpoint.searchParams.set('limit','1');
    const response=await fetch(endpoint,{
      headers:{apikey:publishableKey,Authorization:'Bearer '+user.token,Accept:'application/json'},
      signal:AbortSignal.timeout(15000),cache:'no-store'
    });
    assert([200,401,403].includes(response.status),'Estado inesperado: '+response.status);
    if(response.status===200)assert.equal((await response.json()).length,0,'Invitaciones expuestas');
  });
}

// Prueba adicional: un grupo compartido con dos miembros y una cuenta ajena.
// Solo se ejecuta cuando los tres valores se facilitan en variables de entorno
// privadas. No almacenes JWT ni identificadores de sesión en el repositorio.
const outsiderNames=[
  'BUDVIVA_TEST_TOKEN_MEMBER','BUDVIVA_TEST_TOKEN_OUTSIDER','BUDVIVA_TEST_GROUP_SHARED'
];
const outsiderPresent=outsiderNames.filter(name=>Boolean(process.env[name]));
const outsiderEnabled=outsiderPresent.length===outsiderNames.length;
const ownShared=outsiderEnabled?{
  token:process.env.BUDVIVA_TEST_TOKEN_MEMBER,
  group:process.env.BUDVIVA_TEST_GROUP_SHARED
}:null;
const outsider=outsiderEnabled?{
  token:process.env.BUDVIVA_TEST_TOKEN_OUTSIDER,
  group:process.env.BUDVIVA_TEST_GROUP_SHARED
}:null;

test('Prueba de aislamiento de un grupo: configuración íntegra',()=>{
  assert(outsiderPresent.length===0||outsiderEnabled,
    'Faltan variables de entorno del miembro, el usuario externo o el grupo');
  if(!outsiderEnabled)return;
  assert(uuid.test(ownShared.group),'El grupo debe tener un UUID válido');
  assert.notEqual(ownShared.token,outsider.token,'Deben usarse sesiones de personas diferentes');
});

test('Miembro real autenticado: puede leer su grupo',{skip:!outsiderEnabled},async()=>{
  const own=await rows(ownShared,'bv_households',{column:'id',value:ownShared.group});
  assert.equal(own.length,1,'El miembro no puede leer su propio grupo');
  const members=await rows(ownShared,'bv_members',{column:'household_id',value:ownShared.group});
  assert(members.length>=1&&members.length<=2,'Composición de grupo inesperada');
});

for(const table of [
  'bv_households','bv_members','bv_expenses','bv_settlements',
  'bv_household_closure_approvals'
]){
  test('Cuenta ajena: no puede leer '+table,{skip:!outsiderEnabled},async()=>{
    const filter={
      column:table==='bv_households'?'id':'household_id',
      value:outsider.group
    };
    const foreign=await rows(outsider,table,filter);
    assert.equal(foreign.length,0,'Exposición indebida a un usuario ajeno: '+table);
  });
}
