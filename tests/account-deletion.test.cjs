/* Pruebas no destructivas: no se crea ni elimina ninguna cuenta. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const edge=fs.readFileSync('backend/functions/bv-delete-account/index.ts','utf8');
const html=fs.readFileSync('compartidos.html','utf8');
const js=fs.readFileSync('compartidos.js','utf8');
test('Eliminación: sesión, confirmación y reautenticación con contraseña u OTP obligatorias',()=>{
  for(const token of ['auth.getUser(token)','signInWithPassword','auth.verifyOtp','verified.user?.id!==identity.user.id','body.confirm!=="ELIMINAR CUENTA"'])assert(edge.includes(token),token);
});
test('Eliminación: el servidor comprueba las referencias compartidas',()=>{
  for(const name of ['bv_members','bv_households','bv_expenses','bv_settlements','author_id','payer_id','receiver_id'])assert(edge.includes(name),name);
  assert(edge.indexOf('admin.auth.admin.deleteUser')>edge.indexOf('for(const [table,column]'));
});
test('OTP: la verificación usa exclusivamente el correo de la identidad autenticada',()=>{
  assert(edge.includes('email:identity.user.email,token:body.otp,type:"email"'));
  assert(edge.includes('typeof body.otp!=="string"'));
  assert(edge.includes('body.method!=="email_otp"'));
  assert(edge.indexOf('verified.user?.id!==identity.user.id')<edge.indexOf('auth.admin.deleteUser'));
});
test('Eliminación: CORS y control de métodos',()=>{
  assert(edge.includes('req.method==="OPTIONS"'));
  assert(edge.includes('Access-Control-Allow-Origin'));
  assert(edge.includes('Access-Control-Allow-Headers'));
  assert(edge.includes('req.method!=="POST"'));
});
test('Eliminación: UI protegida y sin clave administrativa',()=>{
  assert(html.includes('id="delete-account-form"'));
  assert(js.includes("onSubmit('delete-account-form'"));
  assert(js.includes("'/functions/v1/bv-delete-account'"));
  assert(js.includes("confirmation!=='ELIMINAR CUENTA'"));
  assert(!js.includes('SUPABASE_SERVICE_ROLE_KEY'));
});
test('Comprobación segura: acción de solo lectura disponible también con Compartidos',()=>{
  assert(edge.includes('const checkOnly=body?.action==="check"'));
  assert(edge.includes('if(checkOnly)return reply(200'));
  assert(edge.indexOf('if(checkOnly)return reply(200')<edge.indexOf('auth.admin.deleteUser'));
  assert.equal((html.match(/data-account-check class=/g)||[]).length,2);
  assert(js.includes("body:JSON.stringify({action:'check'})"));
  assert(js.includes('response.status!==200&&response.status!==409'));
});
test('Eliminación: no se utiliza la cuenta real en las pruebas',()=>{
  assert(!edge.includes('pedrombo88@'));
});
test('Endpoint público: comprobación opcional sin credenciales ni borrado',async(t)=>{
  if(process.env.BUDVIVA_LIVE_SMOKE!=='1')return t.skip('Activa BUDVIVA_LIVE_SMOKE=1 para comprobar el endpoint');
  const url='https://bsvtttcuqamjifnpuzlj.supabase.co/functions/v1/bv-delete-account';
  const options=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://pedrombo88.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'},signal:AbortSignal.timeout(10000)});
  assert.equal(options.status,204);
  assert.equal(options.headers.get('access-control-allow-origin'),'https://pedrombo88.github.io');
  const response=await fetch(url,{method:'POST',headers:{Origin:'https://pedrombo88.github.io','Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,401);
  const preview=await fetch(url,{method:'POST',
    headers:{Origin:'https://pedrombo88.github.io','Content-Type':'application/json'},
    body:JSON.stringify({action:'check'}),signal:AbortSignal.timeout(10000)});
  assert.equal(preview.status,401,'Check-only must reject anonymous sessions');
  const otpAttempt=await fetch(url,{method:'POST',
    headers:{Origin:'https://pedrombo88.github.io','Content-Type':'application/json'},
    body:JSON.stringify({method:'email_otp',otp:'000000',confirm:'ELIMINAR CUENTA'}),
    signal:AbortSignal.timeout(10000)});
  assert.equal(otpAttempt.status,401,'OTP deletion must reject anonymous sessions');


});
