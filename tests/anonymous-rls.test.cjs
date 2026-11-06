/* Comprobación real de lectura anónima: SOLO GET, sin usuarios ni modificaciones. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const enabled=process.env.BUDVIVA_LIVE_SMOKE==='1';
const context={window:{}};
vm.runInNewContext(fs.readFileSync('shared-config.js','utf8'),context);
const config=context.window.BUDVIVA_SHARED_CONFIG;
const tables=[
  'bv_households',
  'bv_members',
  'bv_expenses',
  'bv_settlements',
  'bv_invitations',
  'bv_household_closure_approvals'
];
test('La configuración pública no contiene una clave administrativa',()=>{
  assert.match(config.url,/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
  assert.match(config.publishableKey,/^sb_publishable_/);
  assert(!fs.readFileSync('shared-config.js','utf8').includes('SUPABASE_SERVICE_ROLE_KEY'));
});
for(const table of tables){
  test('Supabase no revela '+table+' a usuarios sin sesión', {skip:!enabled},async()=>{
    const url=config.url+'/rest/v1/'+table+'?select=*&limit=1';
    const response=await fetch(url,{
      method:'GET',
      headers:{apikey:config.publishableKey,Accept:'application/json'},
      cache:'no-store',
      signal:AbortSignal.timeout(12000)
    });
    if(response.status===200){
      const body=await response.json();
      assert(Array.isArray(body),table+': respuesta inesperada');
      assert.equal(body.length,0,table+': se han expuesto filas a una petición anónima');
    }else{
      assert([401,403,404].includes(response.status),table+': HTTP '+response.status);
    }
  });
}
