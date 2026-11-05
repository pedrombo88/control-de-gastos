/* Budviva Compartidos: cliente REST de Supabase, sin dependencias de terceros en tiempo de ejecución. */
(()=>{
'use strict';
const config=window.BUDVIVA_SHARED_CONFIG||{};
const $=id=>document.getElementById(id);
const authKey='budviva-shared-session-v1';
const enc=encodeURIComponent;
let session=null, user=null, household=null, members=[], expenses=[], settlements=[], inviteCode='';
let draftApplied=false, loadGeneration=0, currentTransfer=null;
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
  try{
    const body=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:session.refresh_token},authenticated:false});
    if(!body.access_token||!body.refresh_token)throw Error('La sesión no se ha renovado.');
    session=body;persist();
  }catch(e){
    session=null;persist();const error=new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');error.status=401;throw error;
  }
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
  loadGeneration++;
  if(session){try{await request('/auth/v1/logout',{method:'POST'});}catch(_){}}
  session=null;user=null;household=null;members=[];expenses=[];settlements=[];persist();
  try{sessionStorage.removeItem('budviva-share-draft-v1');}catch(_){}
  renderRoot();
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
  const generation=++loadGeneration;
  if(!session)return renderRoot();
  try{
    await ensureSession();
    if(generation!==loadGeneration||!session)return;
    const who=await request('/auth/v1/user');
    if(generation!==loadGeneration||!session)return;
    user=who;
    const own=await readRows('bv_members','household_id,user_id,display_name','&user_id=eq.'+enc(user.id)+'&limit=1');
    if(generation!==loadGeneration||!session)return;
    if(!own.length){household=null;members=[];renderRoot();return;}
    const id=own[0].household_id;
    const [homes,people,bills,payments]=await Promise.all([
      readRows('bv_households','id,title,owner_id','&id=eq.'+id+'&limit=1'),
      readRows('bv_members','user_id,display_name,joined_at','&household_id=eq.'+id+'&order=joined_at.asc'),
      readAllRows('bv_expenses','id,author_id,payer_id,title,category,amount_cents,share_basis_points_a,spent_on,created_at','&household_id=eq.'+id+'&order=spent_on.desc,id.desc'),
      readAllRows('bv_settlements','id,payer_id,receiver_id,amount_cents,status,created_at,reviewed_at','&household_id=eq.'+id+'&order=created_at.desc,id.desc')
    ]);
    if(generation!==loadGeneration||!session)return;
    household=homes[0]||null;members=people;expenses=bills;settlements=payments;
    if(!household)throw Error('No se puede acceder al hogar.');
    renderRoot();
    $('last-sync').textContent='Actualizado a las '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  }catch(e){
    if(generation!==loadGeneration)return;
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
function activityKey(){return 'budviva-shared-activity-v1:'+user.id+':'+household.id;}
function activityItems(){
  const incoming=expenses.filter(x=>x.author_id!==user.id).map(x=>({
    id:'expense:'+x.id,at:x.created_at,title:'Nuevo gasto compartido',
    detail:x.title+' · '+euro(x.amount_cents)+' · '+label(x.payer_id)
  }));
  const approvals=settlements.filter(x=>x.receiver_id===user.id&&x.status==='pending').map(x=>({
    id:'approval:'+x.id,at:x.created_at,title:'Compensación pendiente de confirmar',
    detail:label(x.payer_id)+' propone '+euro(x.amount_cents)
  }));
  const reviews=settlements.filter(x=>x.payer_id===user.id&&x.status!=='pending').map(x=>({
    id:'review:'+x.id+':'+x.status,at:x.reviewed_at||x.created_at,
    title:x.status==='confirmed'?'Compensación confirmada':'Compensación rechazada',
    detail:euro(x.amount_cents)+' · '+label(x.receiver_id)
  }));
  return [...incoming,...approvals,...reviews].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,40);
}
function renderActivity(){
  const items=activityItems();
  let seen=[];
  try{
    const saved=JSON.parse(localStorage.getItem(activityKey())||'null');
    if(Array.isArray(saved))seen=saved.filter(x=>typeof x==='string').slice(-250);
    else{
      // La primera vez se establece un punto de partida: no avisar de gastos antiguos.
      seen=items.map(x=>x.id);
      localStorage.setItem(activityKey(),JSON.stringify(seen));
    }
  }catch(_){seen=items.map(x=>x.id);}
  const seenSet=new Set(seen);
  const unread=items.filter(x=>!seenSet.has(x.id));
  $('activity-count').textContent=unread.length?'('+unread.length+' nuevos)':'';
  $('activity-read').disabled=!unread.length;
  $('activity-list').innerHTML=items.length?items.slice(0,12).map(x=>
    '<div class="row"><div><strong>'+esc(x.title)+(seenSet.has(x.id)?'':' · Nuevo')+'</strong><small>'+esc(x.detail)+'</small><small>'+new Date(x.at).toLocaleString('es-ES')+'</small></div></div>'
  ).join(''):'<p class="muted">Sin actividad reciente.</p>';
}
function sharedExportData(){
 if(!household||!user)throw Error('Inicia sesión y carga el hogar antes de exportar.');
 if(!navigator.onLine)throw Error('Conéctate a Internet y actualiza el historial antes de exportar.');
 return {
  format:'budviva-shared-export-v1',exportedAt:new Date().toISOString(),
  household:{id:household.id,title:household.title},
  members:members.map(m=>({id:m.user_id,name:m.display_name,joinedAt:m.joined_at})),
  expenses:expenses.map(x=>({id:x.id,date:x.spent_on,concept:x.title,category:x.category,
    payerId:x.payer_id,authorId:x.author_id,amountCents:x.amount_cents,
    shareBasisPointsA:x.share_basis_points_a,createdAt:x.created_at})),
  settlements:settlements.map(x=>({id:x.id,payerId:x.payer_id,receiverId:x.receiver_id,
    amountCents:x.amount_cents,status:x.status,createdAt:x.created_at,reviewedAt:x.reviewed_at}))
 };
}
function saveSharedFile(content,filename,type){
 const blob=new Blob([content],{type});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function csvCell(value){
 const str=String(value??'');
 return '"'+str.replace(/"/g,'""')+'"';
}
function csvSheet(rows){
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
async function exportShared(format){
 await load();
 if(!household||!user)throw Error('No se ha podido actualizar el hogar para exportar.');
 const data=sharedExportData();
 const filename='budviva-compartidos-'+today();
 if(format==='json'){
   saveSharedFile(JSON.stringify(data,null,2),filename+'.json','application/json;charset=utf-8');
 }else{
   const rows=[['Tipo','ID','Fecha','Concepto','Categoría','Pagador','Receptor','Importe EUR','Reparto A (%)','Estado','Fecha de revisión']];
   for(const x of data.expenses)rows.push(['Gasto',x.id,x.date,x.concept,x.category,
     members.find(m=>m.user_id===x.payerId)?.display_name||x.payerId,'',
     (x.amountCents/100).toFixed(2).replace('.',','),x.shareBasisPointsA/100,'','']);
   for(const x of data.settlements)rows.push(['Compensación',x.id,x.createdAt.slice(0,10),'','',
     members.find(m=>m.user_id===x.payerId)?.display_name||x.payerId,
     members.find(m=>m.user_id===x.receiverId)?.display_name||x.receiverId,
     (x.amountCents/100).toFixed(2).replace('.',','),'',x.status,x.reviewedAt||'']);
   saveSharedFile(csvSheet(rows),filename+'.csv','text/csv;charset=utf-8');
 }
 status('Copia '+format.toUpperCase()+' preparada. Revisa la carpeta de descargas del dispositivo.');
}
function renderDashboard(){
  $('home-name').textContent=household.title;
  $('profile-form').elements.display_name.value=members.find(m=>m.user_id===user.id)?.display_name||'';
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
  currentTransfer=null;
  $('settle-exact').disabled=true;
  $('settlement-help').textContent='';
  if(!eligible){
    $('share-comparison').textContent='';
    $('balance-total').textContent='—';$('balance-message').textContent='Esperando al segundo miembro.';
  }else{
    const records=[
      ...expenses.map(x=>({type:'expense',payerId:x.payer_id,amountCents:x.amount_cents,shareBasisPointsA:x.share_basis_points_a})),
      ...settlements.filter(x=>x.status==='confirmed').map(x=>({type:'settlement',payerId:x.payer_id,receiverId:x.receiver_id,amountCents:x.amount_cents}))
    ];
    try{
      const result=window.BudvivaShared.calculate(records,ids);
      currentTransfer=result.transfer;
      $('balance-total').textContent=euro(result.transfer?.amountCents||0);
      $('balance-message').textContent=result.transfer?label(result.transfer.from)+' debe '+euro(result.transfer.amountCents)+' a '+label(result.transfer.to)+'.':'Estáis al día.';
      const pending=settlements.filter(x=>x.status==='pending');
      $('share-comparison').textContent=members.map(m=>m.display_name+': pagó '+euro(result.paidCents[m.user_id])+', le corresponde '+euro(result.shareCents[m.user_id])+' y su saldo es '+(result.netCents[m.user_id]>=0?'+':'−')+euro(Math.abs(result.netCents[m.user_id]))).join(' · ');
      $('settle-exact').disabled=!result.transfer||result.transfer.from!==user.id||pending.some(x=>x.payer_id===user.id);
      $('settlement-help').textContent=pending.some(x=>x.payer_id===user.id)?'Ya tienes una compensación pendiente. Espera a que la otra persona la revise para evitar duplicarla.':result.transfer&&result.transfer.from===user.id?'Puedes proponer la cantidad exacta que debes.':'Solo quien debe dinero puede usar el botón de deuda exacta.';
    }catch(e){fail(e);}
  }
  renderHistory();
  renderActivity();
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
    '<div class="row"><div><strong>'+euro(x.amount_cents)+'</strong><small>'+esc(label(x.payer_id))+' → '+esc(label(x.receiver_id))+'</small><small>'+({pending:'Pendiente de confirmar',confirmed:'Confirmada',rejected:'Rechazada'}[x.status]||'')+(x.status==='pending'?' · propuesta '+new Date(x.created_at).toLocaleDateString('es-ES'):' · '+new Date(x.reviewed_at||x.created_at).toLocaleDateString('es-ES'))+'</small></div>'+
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
onSubmit('profile-form',async f=>{
 const name=f.elements.display_name.value.trim();
 if(!name||name.length>40)throw Error('Introduce un nombre de 1 a 40 caracteres.');
 await request('/rest/v1/bv_members?household_id=eq.'+enc(household.id)+'&user_id=eq.'+enc(user.id),{method:'PATCH',data:{display_name:name}});
 await load();
});
$('settle-exact').addEventListener('click',()=>{
 if(!currentTransfer||currentTransfer.from!==user?.id)return;
 const pending=settlements.some(x=>x.status==='pending'&&x.payer_id===user.id);
 if(pending){status('Tienes una compensación pendiente de confirmar.',true);return;}
 $('settlement-form').elements.amount.value=(currentTransfer.amountCents/100).toFixed(2).replace('.',',');
 $('settlement-form').scrollIntoView({behavior:'smooth',block:'center'});
});
onSubmit('settlement-form',async f=>{
  const payer=user.id,other=members.find(m=>m.user_id!==payer);
  if(!other)throw Error('Necesitas dos personas vinculadas.');
  const amount=moneyToCents(f.elements.amount.value);
  if(settlements.some(x=>x.status==='pending'&&x.payer_id===user.id))throw Error('Ya tienes una compensación pendiente. Espera a su confirmación o rechazo.');
  if(!confirm('¿Proponer una compensación de '+euro(amount)+'? La otra persona deberá confirmarla.'))return;
  await request('/rest/v1/bv_settlements',{method:'POST',data:{household_id:household.id,payer_id:payer,receiver_id:other.user_id,amount_cents:amount,status:'pending'}});
  f.reset();await load();
});
$('invite').addEventListener('click',async()=>{try{inviteCode=await rpc('bv_create_invite',{p_household:household.id});$('invite-code').textContent=inviteCode;setVisible('copy-invite',true);status('Invitación válida durante 48 horas.');}catch(e){fail(e);}});
$('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(inviteCode);status('Código copiado.');}catch(_){status('Selecciona y copia el código mostrado.');}});
$('activity-read').addEventListener('click',()=>{
 if(!user||!household)return;
 const ids=activityItems().map(x=>x.id);
 try{localStorage.setItem(activityKey(),JSON.stringify(ids));}catch(_){status('No se ha podido guardar el estado de lectura.',true);return;}
 renderActivity();
});
for(const format of ['json','csv']){
 $('export-shared-'+format).addEventListener('click',async e=>{
  const button=e.currentTarget;button.disabled=true;
  try{await exportShared(format);}catch(err){fail(err);}
  finally{button.disabled=false;}
 });
}
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