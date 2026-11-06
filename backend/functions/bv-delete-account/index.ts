import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const url=Deno.env.get("SUPABASE_URL")!;
const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const headers={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"https://pedrombo88.github.io","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type"};
function reply(status:number,message:string){return new Response(JSON.stringify({message}),{status,headers});}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,"Método no permitido");
 try{
  const bearer=req.headers.get("Authorization")||"";
  if(!bearer.startsWith("Bearer "))return reply(401,"Sesión requerida");
  const token=bearer.slice(7);
  const userClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authError}=await userClient.auth.getUser(token);
  if(authError||!identity.user?.email)return reply(401,"Sesión no válida");
  const body=await req.json().catch(()=>null);
  // Comprobación no destructiva: disponible con sesión propia. Nunca borra cuentas.
  const checkOnly=body?.action==="check";
  // La baja por correo requiere un código OTP de un solo uso, verificado en Auth.
  // Nunca se permite borrar únicamente por tener una sesión abierta.
  const emailOtp=body?.method==="email_otp";
  if(!checkOnly&&(!body||body.confirm!=="ELIMINAR CUENTA"||
    (body.method!==undefined&&body.method!=="password"&&body.method!=="email_otp")||
    (emailOtp?typeof body.otp!=="string"||!/^[0-9]{6,8}$/.test(body.otp):
      typeof body.password!=="string"||body.password.length<8)))
    return reply(400,"Debes confirmar la baja e identificarte con contraseña o código de correo válido");
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:members,error:memberError}=await admin.from("bv_members").select("user_id").eq("user_id",identity.user.id).limit(1);
  if(memberError)return reply(503,"No se ha podido verificar la pertenencia a grupos compartidos");
  if(members?.length)return reply(409,"Tu cuenta está vinculada a Compartidos. Para eliminarla, primero debes salir del grupo o cerrarlo.");
  // Protección adicional: bloquear la baja si existe cualquier referencia financiera.
  for(const [table,column] of [["bv_households","owner_id"],["bv_household_closure_approvals","user_id"],["bv_expenses","author_id"],
    ["bv_expenses","payer_id"],["bv_settlements","payer_id"],["bv_settlements","receiver_id"]] as const){
    const {data,error}=await admin.from(table).select("id").eq(column,identity.user.id).limit(1);
    if(error)return reply(503,"No se ha podido completar la verificación de seguridad");
    if(data?.length)return reply(409,"Tu cuenta figura en un historial compartido y no puede eliminarse todavía.");
  }
  if(checkOnly)return reply(200,"Comprobación superada: no hay referencias compartidas que bloqueen la baja. No se ha borrado nada.");
  // Reautenticación obligatoria: contraseña actual o OTP recibido en el correo
  // verificado del usuario. Supabase Auth valida caducidad y uso único del OTP.
  const {data:verified,error:verifyError}=emailOtp
    ?await userClient.auth.verifyOtp({email:identity.user.email,token:body.otp,type:"email"})
    :await userClient.auth.signInWithPassword({email:identity.user.email,password:body.password});
  if(verifyError||verified.user?.id!==identity.user.id)
    return reply(403,emailOtp?"Código de correo incorrecto o caducado":"Contraseña incorrecta");
  const {error:deleteError}=await admin.auth.admin.deleteUser(identity.user.id);
  if(deleteError)return reply(503,"No se ha podido eliminar la cuenta. Contacta con soporte.");
  return reply(200,"Cuenta de acceso eliminada");
 }catch(_){return reply(500,"No se ha podido procesar la solicitud");}
});