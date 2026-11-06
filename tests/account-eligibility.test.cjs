/* Tests aislados del contrato Edge: NUNCA llaman a Supabase real ni eliminan usuarios. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('backend/functions/bv-delete-account/index.ts','utf8')
  .replace(/^import .*;\n/,'')
  .replaceAll(')!;',');')
  .replace('status:number,message:string','status,message')
  .replace('req:Request','req')
  .replace(/\s+as const/g,'');
function fixture({member=false,history=false,auth=true,badPassword=false,badOtp=false,otpOtherUser=false,dbError=false}={}){
  let handler=null,deleted=0,logins=0,reads=0,otpChecks=0;
  const deno={env:{get(name){
    return ({SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public_test',SUPABASE_SERVICE_ROLE_KEY:'private_test'})[name];
  }},serve(fn){handler=fn;}};
  const fakeUser={id:'user-001',email:'test@example.invalid'};
  function createClient(_url,key){
    if(key==='private_test'){
      return {auth:{admin:{async deleteUser(){deleted++;return {error:null};}}},
        from(table){return {select(_fields){return {eq(column,_value){return {async limit(){
          reads++;
          if(dbError)return {data:null,error:{message:'db error'}};
          if(table==='bv_members'&&member)return {data:[{user_id:fakeUser.id}],error:null};
          if(history&&table==='bv_expenses'&&column==='author_id')return {data:[{id:'expense'}],error:null};
          return {data:[],error:null};
        }};}};}};}
      };
    }
    return {auth:{
      async getUser(token){return token==='good'&&auth?{data:{user:fakeUser},error:null}:{data:{user:null},error:{message:'Unauthorized'}};},
      async signInWithPassword(input){logins++;return badPassword||input.password!=='safe-password'?{data:{user:null},error:{message:'invalid'}}:{data:{user:fakeUser},error:null};},
      async verifyOtp(input){otpChecks++;return badOtp||input.email!==fakeUser.email||input.type!=='email'||input.token!=='123456'
        ?{data:{user:null},error:{message:'invalid'}}
        :{data:{user:otpOtherUser?{id:'other-user'}:fakeUser},error:null};}
    }};
  }
  new Function('createClient','Deno','Request','Response',source)(createClient,deno,Request,Response);
  assert.equal(typeof handler,'function');
  async function post(body,authorization='Bearer good'){
    const headers={'Content-Type':'application/json'};
    if(authorization)headers.Authorization=authorization;
    const response=await handler(new Request('https://test.invalid/functions/v1/bv-delete-account',
      {method:'POST',headers,body:JSON.stringify(body)}));
    return {status:response.status,body:await response.json()};
  }
  return {post,stats:()=>({deleted,logins,reads,otpChecks})};
}
test('read-only: usuario anónimo rechazado sin consultar la base de datos',async()=>{
  const x=fixture();const r=await x.post({action:'check'},'');
  assert.equal(r.status,401);assert.deepEqual(x.stats(),{deleted:0,logins:0,reads:0,otpChecks:0});
});
test('read-only: sesión inválida rechazada sin tocar datos',async()=>{
  const x=fixture({auth:false});const r=await x.post({action:'check'});
  assert.equal(r.status,401);assert.equal(x.stats().deleted,0);
});
test('read-only: Compartidos existente bloquea la baja y no borra datos',async()=>{
  const x=fixture({member:true});const r=await x.post({action:'check'});
  assert.equal(r.status,409);assert.match(r.body.message,/Compartidos/);
  assert.equal(x.stats().deleted,0);assert.equal(x.stats().logins,0);
});
test('read-only: referencias históricas también bloquean la baja',async()=>{
  const x=fixture({history:true});const r=await x.post({action:'check'});
  assert.equal(r.status,409);assert.equal(x.stats().deleted,0);
});
test('read-only: usuario sin referencias es apto sin borrar ni validar contraseña',async()=>{
  const x=fixture();const r=await x.post({action:'check'});
  assert.equal(r.status,200);assert.match(r.body.message,/no se ha borrado/i);
  assert.equal(x.stats().deleted,0);assert.equal(x.stats().logins,0);
});
test('read-only: fallo de base de datos bloquea la baja por defecto',async()=>{
  const x=fixture({dbError:true});const r=await x.post({action:'check'});
  assert.equal(r.status,503);assert.equal(x.stats().deleted,0);
});
test('eliminación: exige contraseña actual y confirmación exacta',async()=>{
  const x=fixture();const r=await x.post({password:'safe-password',confirm:'no'});
  assert.equal(r.status,400);assert.equal(x.stats().deleted,0);
});
test('eliminación: contraseña inválida no elimina ninguna cuenta',async()=>{
  const x=fixture({badPassword:true});const r=await x.post({password:'safe-password',confirm:'ELIMINAR CUENTA'});
  assert.equal(r.status,403);assert.equal(x.stats().deleted,0);
});
test('eliminación: el bloqueo de Compartidos se aplica también al borrado real',async()=>{
  const x=fixture({member:true});const r=await x.post({password:'safe-password',confirm:'ELIMINAR CUENTA'});
  assert.equal(r.status,409);assert.equal(x.stats().deleted,0);
});
test('eliminación: únicamente el recorrido autorizado llama al simulador de borrado',async()=>{
  const x=fixture();const r=await x.post({password:'safe-password',confirm:'ELIMINAR CUENTA'});
  assert.equal(r.status,200);assert.equal(x.stats().deleted,1);
});

test('OTP: formato inválido o confirmación incompleta no verifican ni borran',async()=>{
  for(const body of [
    {method:'email_otp',otp:'12345',confirm:'ELIMINAR CUENTA'},
    {method:'email_otp',otp:'123456',confirm:'NO'},
    {method:'email_otp',otp:123456,confirm:'ELIMINAR CUENTA'},
    {method:'unknown',otp:'123456',confirm:'ELIMINAR CUENTA'}
  ]){
    const x=fixture();const r=await x.post(body);
    assert.equal(r.status,400);assert.equal(x.stats().deleted,0);assert.equal(x.stats().otpChecks,0);
  }
});
test('OTP: código caducado o erróneo no elimina la cuenta',async()=>{
  const x=fixture({badOtp:true});
  const r=await x.post({method:'email_otp',otp:'123456',confirm:'ELIMINAR CUENTA'});
  assert.equal(r.status,403);assert.equal(x.stats().otpChecks,1);assert.equal(x.stats().deleted,0);
});
test('OTP: código válido de otra cuenta no permite eliminar',async()=>{
  const x=fixture({otpOtherUser:true});
  const r=await x.post({method:'email_otp',otp:'123456',confirm:'ELIMINAR CUENTA'});
  assert.equal(r.status,403);assert.equal(x.stats().deleted,0);
});
test('OTP: vinculación a Compartidos impide incluso verificar el código',async()=>{
  const x=fixture({member:true});
  const r=await x.post({method:'email_otp',otp:'123456',confirm:'ELIMINAR CUENTA'});
  assert.equal(r.status,409);assert.equal(x.stats().otpChecks,0);assert.equal(x.stats().deleted,0);
});
test('OTP: fallo de BD bloquea la baja antes de verificar el código',async()=>{
  const x=fixture({dbError:true});
  const r=await x.post({method:'email_otp',otp:'123456',confirm:'ELIMINAR CUENTA'});
  assert.equal(r.status,503);assert.equal(x.stats().otpChecks,0);assert.equal(x.stats().deleted,0);
});
test('OTP: únicamente código de correo validado para la misma cuenta permite el borrado simulado',async()=>{
  const x=fixture();
  const r=await x.post({method:'email_otp',otp:'123456',confirm:'ELIMINAR CUENTA'});
  assert.equal(r.status,200);assert.equal(x.stats().otpChecks,1);assert.equal(x.stats().logins,0);assert.equal(x.stats().deleted,1);
});
