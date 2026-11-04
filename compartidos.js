/* Budviva Compartidos: cliente REST de Supabase, sin dependencias de terceros en tiempo de ejecución. */
(()=>{
'use strict';
const config=window.BUDVIVA_SHARED_CONFIG||{};
const $=id=>document.getElementById(id);
const authKey='budviva-shared-session-v1';
const enc=encodeURIComponent;
let session=null, user=null, household=null, members=[], expenses=[], settlements=[], inviteCode='';
let draftApplied=false;
const fmt=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
const euro=n=>fmt.format(n/100);
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const setVisible=(id,visible)=>$(id).classList.toggle('hidden',!visible);
const status=(message,error=false)=>{const el=$('status');el.textContent=message;el.className='status'+(error?' error':'');};
const fail=e=>{
 const raw=String(e?.message||e||'Error desconocido');
 const msg=/email address not authorized/i.test(raw)?'El proveedor de correo todavía no está configurado para esta dirección. Si ya tienes una cuenta con contraseña, utiliza el acceso alternativo.':
   /invalid login credentials|invalid credentials/i.test(raw)?'Correo o contraseña incorrectos.':
   /email not confirmed/i.test(raw)?'Todavía tienes que confirmar tu dirección de correo.':
   /token has expired|otp.*expired|invalid.*otp|token.*invalid/i.test(raw)?'El código ha caducado o es incorrecto. Solicita otro.':raw;
 status(msg,true);
};
const moneyToCents=value=>{
  const s=String(value).trim().replace(/\s|€/g,'');
  if(!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(s))throw Error('Introduce un importe válido con dos decimales como máximo.');
  const [whole,decimal='']=s.replace(',','.').split('.');
  const cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)||cents<1||cents>100000000)throw Error('Importe fuera del límite admitido.');
  return cents;
};
async function request(path,{method='GET',data,authenticated=true,prefer}={}){
  if(authenticated)await ensureSession();
  const headers={'apikey':config.publishableKey,'Content-Type':'application/json'};
  if(authenticated)headers.Authorization='Bearer '+session.access_token;
  if(prefer)headers.Prefer=prefer;
  const response=await fetch(config.url.replace(/\/$/,'')+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});
  let body=null;
  try{body=await response.json();}catch(_){}
  if(!response.ok){
    const error=new Error(body?.msg||body?.error_description||body?.message||body?.hint||'Error de conexión ('+response.status+')');
    error.status=response.status;throw error;
  }
  return body;
}
function persist(){if(session)localStorage.setItem(authKey,JSON.stringify(session));else localStorage.removeItem(authKey);}
async function ensureSession(){
  if(!session)throw Error('Necesitas iniciar sesión.');
  if(Date.now()+60000<(session.expires_at||0)*1000)return;
  const body=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:session.refresh_token},authenticated:false});
  session=body;persist();
}
async function sendCode(email){
  await request('/auth/v1/otp',{method:'POST',authenticated:false,data:{email,create_user:true}});
}
async function verifyCode(email,token){
  const body=await request('/auth/v1/verify',{method:'POST',authenticated:false,data:{email,token,type:'email'}});
  if(!body.access_token||!body.user?.id)throw Error('No se ha obtenido sesión.');
  session=body;user=body.user;persist();
}
async function logout(){
  if(session){try{await request('/auth/v1/logout',{method:'POST'});}catch(_){}}
  session=null;user=null;household=null;members=[];expenses=[];settlements=[];persist();renderRoot();
}
async function readRows(table,select,query=''){
  const result=await request('/rest/v1/'+table+'?select='+enc(select)+query);
  return Array.isArray(result)?result:[];
}
async function readAllRows(table,select,filters){
  // Supabase puede limitar las respuestas a 1.000 filas. Paginamos para no calcular deudas incorrectas.
  const PAGE=500,MAX_PAGES=200,all=[];
  for(let n=0;n<MAX_PAGES;n++){
    const batch=await readRows(table,select,filters+'&limit='+PAGE+'&offset='+(n*PAGE));
    all.push(...batch);
    if(batch.length<PAGE)return all;
  }
  throw Error('El historial supera el límite de sincronización. Contacta con soporte antes de utilizar el balance.');
}
async function rpc(name,data){
  return request('/rest/v1/rpc/'+name,{method:'POST',data});
}
async function load(){
  if(!session)return renderRoot();
  try{
    await ensureSession();
    const who=await request('/auth/v1/user');
    user=who;
    const own=await readRows('bv_members','household_id,user_id,display_name','&user_id=eq.'+enc(user.id)+'&limit=1');
    if(!own.length){household=null;members=[];renderRoot();return;}
    const id=own[0].household_id;
    const [homes,people,bills,payments]=await Promise.all([
      readRows('bv_households','id,title,owner_id','&id=eq.'+id+'&limit=1'),
      readRows('bv_members','user_id,display_name,joined_at','&household_id=eq.'+id+'&order=joined_at.asc'),
      readAllRows('bv_expenses','id,author_id,payer_id,title,category,amount_cents,share_basis_points_a,spent_on,created_at','&household_id=eq.'+id+'&order=spent_on.desc,id.desc'),
      readAllRows('bv_settlements','id,payer_id,receiver_id,amount_cents,status,created_at','&household_id=eq.'+id+'&order=created_at.desc,id.desc')
    ]);
    household=homes[0]||null;members=people;expenses=bills;settlements=payments;
    if(!household)throw Error('No se puede acceder al hogar.');
    renderRoot();
  }catch(e){
    if(e?.status===401){session=null;user=null;household=null;members=[];expenses=[];settlements=[];persist();renderRoot();}
    fail(e);
  }
}
function renderRoot(){
  setVisible('not-configured',false);
  setVisible('auth',false);setVisible('setup',false);setVisible('dashboard',false);
  if(!config.url||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url)||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)){
    setVisible('not-configured',true);return;
  }
  if(!session){setVisible('auth',true);return;}
  if(!household){setVisible('setup',true);return;}
  setVisible('dashboard',true);renderDashboard();
}
function label(id){return members.find(m=>m.user_id===id)?.display_name||'Persona';}
async function stableEventId(localId){
 const input=new TextEncoder().encode(user.id+'|budviva-shared-v1|'+localId);
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',input));
 const b=digest.slice(0,16);
 b[6]=(b[6]&15)|0x80;b[8]=(b[8]&63)|0x80;
 const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
function applyDraft(){
 if(draftApplied)return;
 let draft=null;
 try{draft=JSON.parse(sessionStorage.getItem('budviva-share-draft-v1')||'null');}catch(_){}
 if(!draft)return;
 if(typeof draft.id!=='string'||!draft.id||typeof draft.title!=='string'||
     !Number.isInteger(draft.amountCents)||draft.amountCents<=0||
     !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||
     Date.now()-draft.createdAt>24*60*60*1000){
   sessionStorage.removeItem('budviva-share-draft-v1');return;
 }
 const form=$('expense-form');
 form.elements.title.value=draft.title.slice(0,100);
 form.elements.amount.value=(draft.amountCents/100).toFixed(2).replace('.',',');
 form.elements.date.value=draft.date;
 form.dataset.localId=draft.id;
 draftApplied=true;
 status('Gasto personal preparado. Revisa el reparto y pulsa «Guardar gasto compartido». Los cambios posteriores en tu movimiento privado no modifican automáticamente esta copia.');
}
function monthForPeriod(period){
 if(period==='all')return '';
 const [year,month]=today().slice(0,7).split('-').map(Number);
 if(period==='last'){
   const d=new Date(year,month-2,1);
   return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 }
 return today().slice(0,7);
}
function renderDashboard(){
  $('home-name').textContent=household.title;
  const sortedMembers=[...members].sort((a,b)=>a.joined_at.localeCompare(b.joined_at)||a.user_id.localeCompare(b.user_id));
  members=sortedMembers;
  const ids=members.map(m=>m.user_id);
  const eligible=members.length===2;
  const month=monthForPeriod($('summary-period').value);
  const selected=expenses.filter(x=>!month||x.spent_on.startsWith(month));
  const split=eligible?window.BudvivaShared.calculate(selected.map(x=>({type:'expense',payerId:x.payer_id,amountCents:x.amount_cents,shareBasisPointsA:x.share_basis_points_a})),ids):null;
  $('members').innerHTML=members.map(m=>'<div class="stat"><small>'+esc(m.display_name)+(m.user_id===user.id?' (tú)':'')+'</small><b>'+euro(selected.filter(x=>x.payer_id===m.user_id).reduce((s,x)=>s+x.amount_cents,0))+'</b><small>Pagado '+($('summary-period').value==='all'?'en total':$('summary-period').value==='last'?'el mes anterior':'este mes')+'</small>'+(split?'<small>Cuota proporcional: '+euro(split.shareCents[m.user_id])+'</small>':'')+'</div>').join('');
  if(members.length===1)$('members').insertAdjacentHTML('beforeend','<div class="stat"><small>Segunda persona</small><b>Sin vincular</b><small>Comparte una invitación</small></div>');
  setVisible('invite-section',!eligible&&household.owner_id===user.id);
  ['expense-payer','settlement-payer'].forEach(id=>{
    const previous=$(id).value;
    $(id).innerHTML=members.filter(m=>m.user_id===user.id).map(m=>'<option value="'+esc(m.user_id)+'">'+esc(m.display_name)+'</option>').join('');
    $(id).value=ids.includes(previous)?previous:user.id;
  });
  $('shares-help').textContent=eligible?'La primera proporción corresponde a '+members[0].display_name+' y la segunda a '+members[1].display_name+'.':'El 50/50 se activará al vincular a la segunda persona.';
  $('expense-form').querySelector('button').disabled=!eligible;
  $('settlement-form').querySelector('button').disabled=!eligible;
  if(!eligible){
    $('balance-total').textContent='—';$('balance-message').textContent='Esperando al segundo miembro.';
  }else{
    const records=[
      ...expenses.map(x=>({type:'expense',payerId:x.payer_id,amountCents:x.amount_cents,shareBasisPointsA:x.share_basis_points_a})),
      ...settlements.filter(x=>x.status==='confirmed').map(x=>({type:'settlement',payerId:x.payer_id,receiverId:x.receiver_id,amountCents:x.amount_cents}))
    ];
    try{
      const result=window.BudvivaShared.calculate(records,ids);
      $('balance-total').textContent=euro(result.transfer?.amountCents||0);
      $('balance-message').textContent=result.transfer?label(result.transfer.from)+' debe '+euro(result.transfer.amountCents)+' a '+label(result.transfer.to)+'.':'Estáis al día.';
    }catch(e){fail(e);}
  }
  renderHistory();
  applyDraft();
}
function renderHistory(){
  const period=$('period').value, month=today().slice(0,7);
  let target=month;
  if(period==='last'){const [y,m]=month.split('-').map(Number);const d=new Date(y,m-2,1);target=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0')].join('-');}
  const filtered=expenses.filter(x=>period==='all'||x.spent_on.startsWith(target));
  $('expense-list').innerHTML=filtered.length?filtered.map(x=>
    '<div class="row"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.spent_on)+' · '+esc(label(x.payer_id))+' pagó · '+(x.share_basis_points_a/100)+' % / '+((10000-x.share_basis_points_a)/100)+' %</small></div><div><span class="amount">'+euro(x.amount_cents)+'</span>'+ (x.author_id===user.id?'<br><button type="button" class="danger" style="margin-top:5px;padding:4px 9px;min-height:32px" data-remove="'+esc(x.id)+'">Eliminar</button>':'')+'</div></div>'
  ).join(''):'<p class="muted">No hay gastos comunes en este periodo.</p>';
  $('settlement-list').innerHTML=settlements.length?settlements.map(x=>
    '<div class="row"><div><strong>'+euro(x.amount_cents)+'</strong><small>'+esc(label(x.payer_id))+' → '+esc(label(x.receiver_id))+'</small><small>'+({pending:'Pendiente de confirmar',confirmed:'Confirmada',rejected:'Rechazada'}[x.status]||'')+'</small></div>'+
    (x.status==='pending'&&x.receiver_id===user.id?'<div><button data-review="'+esc(x.id)+'" data-accept="true">Aceptar</button> <button class="danger" data-review="'+esc(x.id)+'" data-accept="false">Rechazar</button></div>':'')+'</div>'
  ).join(''):'<p class="muted">Todavía no hay compensaciones.</p>';
}
function onSubmit(id,fn){$(id).addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button[type="submit"],button:not([type])');
  if(btn)btn.disabled=true;
  try{await fn(form);status('Operación completada.');}
  catch(err){fail(err);}
  finally{if(btn)btn.disabled=false;}
});}
onSubmit('send-form',async()=>{
  const email=$('email').value.trim();
  await sendCode(email);
  $('verify-form').hidden=false;status('Código enviado. Revisa tu correo.');
});
onSubmit('verify-form',async()=>{
  await verifyCode($('email').value.trim(),$('otp').value.trim());
  $('verify-form').reset();await load();
});
onSubmit('password-form',async f=>{
 const body=await request('/auth/v1/token?grant_type=password',{
   method:'POST',authenticated:false,
   data:{email:f.elements.email.value.trim(),password:f.elements.password.value}
 });
 if(!body.access_token||!body.user?.id)throw Error('No se ha obtenido sesión.');
 session=body;user=body.user;persist();
 f.reset();await load();
});
onSubmit('create-form',async f=>{
  await rpc('bv_create_household',{p_title:f.elements.title.value.trim(),p_name:f.elements.name.value.trim()});
  f.reset();await load();
});
onSubmit('join-form',async f=>{
  await rpc('bv_join_household',{p_token:f.elements.token.value.trim(),p_name:f.elements.name.value.trim()});
  f.reset();await load();
});
onSubmit('expense-form',async f=>{
  if(members.length!==2)throw Error('Debes vincular antes a la segunda persona.');
  const body={household_id:household.id,author_id:user.id,payer_id:user.id,
    title:f.elements.title.value.trim(),category:'otros',amount_cents:moneyToCents(f.elements.amount.value),
    spent_on:f.elements.date.value,share_basis_points_a:Number(f.elements.share.value),client_event_id:f.dataset.localId?await stableEventId(f.dataset.localId):crypto.randomUUID()};
  if(!body.title||body.title.length>100||!body.spent_on)throw Error('Revisa el concepto y la fecha.');
  await request('/rest/v1/bv_expenses',{method:'POST',data:body});
  if(f.dataset.localId){
    sessionStorage.removeItem('budviva-share-draft-v1');
    delete f.dataset.localId;
    draftApplied=false;
  }
  f.reset();f.elements.date.value=today();await load();
});
onSubmit('settlement-form',async f=>{
  const payer=user.id,other=members.find(m=>m.user_id!==payer);
  if(!other)throw Error('Necesitas dos personas vinculadas.');
  const amount=moneyToCents(f.elements.amount.value);
  if(!confirm('¿Proponer una compensación de '+euro(amount)+'? La otra persona deberá confirmarla.'))return;
  await request('/rest/v1/bv_settlements',{method:'POST',data:{household_id:household.id,payer_id:payer,receiver_id:other.user_id,amount_cents:amount,status:'pending'}});
  f.reset();await load();
});
$('invite').addEventListener('click',async()=>{try{inviteCode=await rpc('bv_create_invite',{p_household:household.id});$('invite-code').textContent=inviteCode;setVisible('copy-invite',true);status('Invitación válida durante 48 horas.');}catch(e){fail(e);}});
$('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(inviteCode);status('Código copiado.');}catch(_){status('Selecciona y copia el código mostrado.');}});
$('refresh').addEventListener('click',()=>load());
$('period').addEventListener('change',renderHistory);
$('summary-period').addEventListener('change',()=>{if(household)renderDashboard();});
$('logout').addEventListener('click',logout);
$('setup-logout').addEventListener('click',logout);
$('expense-list').addEventListener('click',async e=>{
 const id=e.target.closest('[data-remove]')?.dataset.remove;if(!id)return;
 if(!confirm('¿Eliminar este gasto compartido? Se recalculará la deuda de ambos.'))return;
 try{await request('/rest/v1/bv_expenses?id=eq.'+enc(id),{method:'DELETE'});await load();status('Gasto eliminado.');}catch(err){fail(err);}
});
$('settlement-list').addEventListener('click',async e=>{
 const btn=e.target.closest('[data-review]');if(!btn)return;
 const accept=btn.dataset.accept==='true';
 if(!confirm(accept?'¿Confirmar que has recibido este pago?':'¿Rechazar esta compensación?'))return;
 try{await rpc('bv_review_settlement',{p_id:btn.dataset.review,p_accept:accept});await load();status('Compensación revisada.');}catch(err){fail(err);}
});
$('expense-form').elements.date.value=today();
try{session=JSON.parse(localStorage.getItem(authKey)||'null');}catch(_){session=null;}
if(session)load();else renderRoot();
window.addEventListener('visibilitychange',()=>{if(!document.hidden&&session&&household)load();});
// Refresco incremental de lectura. No mantiene conexiones ni consume datos cuando la pestaña está oculta.
setInterval(()=>{if(!document.hidden&&session&&household)void load();},30000);
})();