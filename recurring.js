/* Control de Gastos V2 — reglas recurrentes locales, sin servidor. */
(function(root){
"use strict";
const frequencies={daily:"Cada día",weekly:"Cada semana",monthly:"Cada mes",yearly:"Cada año"};
const MAX_RULES=200;
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const dayAt=(date,n)=>{const [y,m,d]=date.split("-").map(Number);const x=new Date(y,m-1,d,12);x.setDate(x.getDate()+n);return iso(x);};
const dateFor=(rule,n)=>{
  const [y,m,d]=rule.start.split("-").map(Number);
  if(rule.frequency==="daily")return dayAt(rule.start,n);
  if(rule.frequency==="weekly")return dayAt(rule.start,n*7);
  const shift=rule.frequency==="monthly"?n:n*12;
  const first=new Date(y,m-1+shift,1,12);
  const last=new Date(first.getFullYear(),first.getMonth()+1,0,12).getDate();
  first.setDate(Math.min(d,last));return iso(first);
};
const nextDate=(rule,after)=>{
  if(!rule.active)return null;
  // Búsqueda con límite para evitar bucles o fechas infinitas.
  let n=0;
  if(rule.frequency==="daily"){const delta=Math.floor((Date.parse(after+"T12:00:00Z")-Date.parse(rule.start+"T12:00:00Z"))/86400000);n=Math.max(0,delta-2);}
  if(rule.frequency==="weekly"){const delta=Math.floor((Date.parse(after+"T12:00:00Z")-Date.parse(rule.start+"T12:00:00Z"))/86400000);n=Math.max(0,Math.floor(delta/7)-1);}
  if(rule.frequency==="monthly"||rule.frequency==="yearly"){const [y,m]=after.split("-").map(Number),[sy,sm]=rule.start.split("-").map(Number);const delta=(y-sy)*12+(m-sm);n=Math.max(0,(rule.frequency==="monthly"?delta:Math.floor(delta/12))-1);}
  for(let i=0;i<5;i++){const date=dateFor(rule,n+i);if(date>after&&date<="2100-12-31")return date;}
  return null;
};
const estimateMonthly=rule=>Math.round(rule.amount*({daily:30,weekly:52/12,monthly:1,yearly:1/12}[rule.frequency]||0));
function build(ctx){
 const {getData,save,render,CAT,h,money,parseMoney,isRealDate,uid,toast,localDate}=ctx;
 const tag=(v)=>h(v);
 const rules=()=>getData().recurring;
 const find=id=>rules().find(x=>x.id===id);
 let editing=null;
 const dlg=document.getElementById("recurring-dialog");
 const form=document.getElementById("recurring-form");
 const monthlyLabel=()=>{const expense=rules().filter(x=>x.active&&x.type==="expense").reduce((v,r)=>v+estimateMonthly(r),0);const income=rules().filter(x=>x.active&&x.type==="income").reduce((v,r)=>v+estimateMonthly(r),0);return {expense,income};};
 const renderPage=()=>{
   const items=rules().slice().sort((a,b)=>(Number(b.active)-Number(a.active))||a.start.localeCompare(b.start));
   const totals=monthlyLabel();
   const rows=items.map(r=>{
     const cat=CAT.find(c=>c.id===r.category);
     const when=nextDate(r,localDate());
     return '<article class="rec-item"><span class="rec-emoji" aria-hidden="true">'+(cat?.name?.slice(0,1)||'R')+'</span><div class="rec-body"><strong>'+tag(r.title)+'</strong><small>'+tag(frequencies[r.frequency])+' · '+tag(cat?.name||"Otros")+'</small><small>'+(r.active?(when?'Próximo: '+tag(when.split("-").reverse().join("/")):'Sin próximos cargos'):'En pausa')+'</small></div><div class="rec-end"><strong class="'+(r.type==="income"?"positive":"")+'">'+(r.type==="income"?"+":"−")+tag(money(r.amount))+'</strong><button class="small-action" type="button" data-rec-edit="'+tag(r.id)+'" aria-label="Editar '+tag(r.title)+'">Editar</button></div></article>';
   }).join("");
   return '<div class="view-heading"><div><div class="eyebrow">AUTOMATIZA TUS FINANZAS</div><h1 class="page-title">Recurrentes</h1></div></div>'
    +'<div class="card rec-summary"><div><small>Gastos previstos / mes*</small><strong>'+tag(money(totals.expense))+'</strong></div><div><small>Ingresos previstos / mes*</small><strong class="positive">'+tag(money(totals.income))+'</strong></div></div>'
    +'<button class="primary-btn rec-new" type="button" data-rec-new>Nuevo movimiento recurrente</button>'
    +'<div class="section-heading"><h2>Mis reglas ('+items.length+')</h2></div>'
    +'<section class="card rec-list">'+(rows||'<div class="empty"><div class="empty-icon">↻</div><strong>Sin movimientos recurrentes</strong><p>Crea una regla para registrar automáticamente la nómina, alquiler o suscripciones cuando llegue su fecha.</p></div>')+'</section>'
    +'<p class="footnote">*Estimación mensual: 30 días por mes y 52 semanas al año. Los vencimientos desde el día en que creas o editas una regla se registran al abrir la aplicación; no se ejecutan en segundo plano. Editar o pausar una regla no modifica los movimientos anteriores.</p>';
 };
 function changeType(type,selected){
   form.dataset.type=type;
   form.querySelectorAll("[data-rec-type]").forEach(btn=>{const on=btn.dataset.recType===type;btn.classList.toggle("is-active",on);btn.setAttribute("aria-pressed",String(on));});
   const cat=form.elements.category;
   cat.innerHTML=CAT.filter(c=>c.type===type).map(c=>'<option value="'+c.id+'">'+tag(c.name)+"</option>").join("");
   if(selected&&Array.from(cat.options).some(x=>x.value===selected))cat.value=selected;
 }
 function open(id=null){
   const rule=id?find(id):null;if(id&&!rule)return toast("Regla no encontrada");
   editing=rule?.id||null;form.reset();
   changeType(rule?.type||"expense",rule?.category);
   form.elements.amount.value=rule?String((rule.amount/100).toFixed(2)).replace(".",","):"";
   form.elements.title.value=rule?.title||"";
   form.elements.start.value=rule?.start||localDate();
   form.elements.frequency.value=rule?.frequency||"monthly";
   form.elements.method.value=rule?.method||"card";
   form.elements.active.checked=rule?.active??true;
   document.getElementById("recurring-dialog-title").textContent=rule?"Editar recurrente":"Nuevo recurrente";
   document.getElementById("rec-delete").hidden=!rule;
   document.getElementById("rec-error").hidden=true;
   dlg.showModal();
 }
 function sync(){
   const data=getData();
   if(!Array.isArray(data.recurring)||!data.recurring.length)return 0;
   const today=localDate();
   const keys=new Set(data.transactions.filter(t=>t.recurringId&&t.occurrenceDate).map(t=>t.recurringId+"|"+t.occurrenceDate));
   const skips=new Set(data.recurringSkips||[]);
   const created=[];
   const firstAllowed=dayAt(today,-366*2);
   for(const rule of data.recurring){
     if(!rule.active||rule.start>today)continue;
     // A la primera sincronización, por seguridad solo se generan dos años de histórico.
     let n=0;
     // Saltar directamente a los últimos dos años, incluso si la regla comenzó hace décadas.
     if(rule.start<firstAllowed){
       const [y,m]=firstAllowed.split("-").map(Number);
       const [sy,sm]=rule.start.split("-").map(Number);
       const months=(y-sy)*12+(m-sm);
       if(rule.frequency==="monthly")n=Math.max(0,months-1);
       else if(rule.frequency==="yearly")n=Math.max(0,Math.floor(months/12)-1);
       else {
         const days=Math.floor((Date.parse(firstAllowed+"T12:00:00Z")-Date.parse(rule.start+"T12:00:00Z"))/86400000);
         n=Math.max(0,Math.floor(days/(rule.frequency==="weekly"?7:1))-1);
       }
     }
     const max=n+(rule.frequency==="daily"?750:rule.frequency==="weekly"?110:rule.frequency==="monthly"?26:4);
     for(;n<max;n++){
       const date=dateFor(rule,n);
       if(date>today)break;
       if(date<firstAllowed || date<(rule.from||rule.start))continue;
       const key=rule.id+"|"+date;
       if(keys.has(key)||skips.has(key))continue;
       const item={id:uid(),type:rule.type,amount:rule.amount,date,title:rule.title,category:rule.category,method:rule.method,note:"Movimiento recurrente",recurringId:rule.id,occurrenceDate:date};
       created.push(item);keys.add(key);
       if(created.length>=1500)break;
     }
     if(created.length>=1500)break;
   }
   if(!created.length)return 0;
   data.transactions.push(...created);
   if(!save()){data.transactions.splice(-created.length,created.length);return 0;}
   return created.length;
 }
 form.addEventListener("submit",e=>{
   e.preventDefault();const error=document.getElementById("rec-error");
   const type=form.dataset.type,amount=parseMoney(form.elements.amount.value),title=form.elements.title.value.trim(),start=form.elements.start.value,category=form.elements.category.value;
   if(!amount||!title||!isRealDate(start)||!CAT.some(c=>c.id===category&&c.type===type)||!(form.elements.frequency.value in frequencies)){
     error.textContent="Revisa el concepto, importe, fecha, categoría y frecuencia.";error.hidden=false;return;
   }
   const data=getData(),snapshot=data.recurring.slice();
   if(!editing&&data.recurring.length>=MAX_RULES){error.textContent="Has alcanzado el límite de 200 reglas.";error.hidden=false;return;}
   const next={id:editing||uid(),title:title.slice(0,90),amount,type,start,category,frequency:form.elements.frequency.value,method:form.elements.method.value,active:form.elements.active.checked,from:localDate()};
   if(editing){const pos=data.recurring.findIndex(x=>x.id===editing);if(pos<0)return;data.recurring[pos]=next;}
   else data.recurring.push(next);
   if(!save()){data.recurring=snapshot;return;}
   dlg.close();const count=sync();render();toast(count?count+" movimientos recurrentes registrados":"Regla guardada correctamente");
 });
 document.getElementById("rec-delete").addEventListener("click",()=>{
   if(!editing||!confirm("¿Eliminar la regla? Los movimientos ya registrados se conservarán."))return;
   const data=getData(),snapshot=data.recurring;data.recurring=data.recurring.filter(r=>r.id!==editing);
   if(!save()){data.recurring=snapshot;return;}
   dlg.close();render();toast("Regla eliminada");
 });
 document.addEventListener("click",e=>{
   const add=e.target.closest("[data-rec-new]");if(add){open();return;}
   const edit=e.target.closest("[data-rec-edit]");if(edit){open(edit.dataset.recEdit);return;}
   const typ=e.target.closest("[data-rec-type]");if(typ){changeType(typ.dataset.recType);return;}
 });
 dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close();});
 window.addEventListener("focus",()=>{const count=sync();if(count)render();});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){const count=sync();if(count)render();}});
 return {renderPage,sync,open,monthlyLabel,nextDate,estimateMonthly};
}
root.CGRecurring={build,dateFor,nextDate,frequencies};
})(window);