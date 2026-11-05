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
  if(!body||typeof body.password!=="string"||body.password.length<8||body.confirm!=="ELIMINAR CUENTA")
    return reply(400,"Debes confirmar la baja e introducir tu contraseña");
  // Confirmar conocimiento de la contraseña de la cuenta, no basta un token de sesión robado.
  const {data:verified,error:verifyError}=await userClient.auth.signInWithPassword({
    email:identity.user.email,password:body.password
  });
  if(verifyError||verified.user?.id!==identity.user.id)return reply(403,"Contraseña incorrecta");
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:members,error:memberError}=await admin.from("bv_members").select("user_id").eq("user_id",identity.user.id).limit(1);
  if(memberError)return reply(503,"No se ha podido verificar la pertenencia a hogares");
  if(members?.length)return reply(409,"Debes salir del hogar o cerrarlo antes de eliminar tu cuenta");
  // Protección adicional: no eliminar usuarios todavía referenciados en libros históricos.
  for(const [table,column] of [["bv_households","owner_id"],["bv_expenses","author_id"],
    ["bv_expenses","payer_id"],["bv_settlements","payer_id"],["bv_settlements","receiver_id"]] as const){
    const {data,error}=await admin.from(table).select("id").eq(column,identity.user.id).limit(1);
    if(error)return reply(503,"No se ha podido completar la verificación de seguridad");
    if(data?.length)return reply(409,"Tu cuenta tiene referencias en un historial compartido; contacta con soporte");
  }
  const {error:deleteError}=await admin.auth.admin.deleteUser(identity.user.id);
  if(deleteError)return reply(503,"No se ha podido eliminar la cuenta. Contacta con soporte.");
  return reply(200,"Cuenta de acceso eliminada");
 }catch(_){return reply(500,"No se ha podido procesar la solicitud");}
});