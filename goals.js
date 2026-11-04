/* Budviva V5.7 — objetivos de ahorro reales, independientes del saldo */
(function(root){
"use strict";
const total=g=>(g.contributions||[]).reduce((s,c)=>s+c.amount,0);
function status(g,today){
 const saved=total(g),remaining=Math.max(0,g.target-saved),progress=Math.min(1,saved/g.target);
 const toDays=s=>Date.parse(s+"T12:00:00Z")/86400000;
 const remainingDays=Math.max(0,toDays(g.dueDate)-toDays(today));
 const elapsed=Math.max(0,Math.min(1,(toDays(today)-toDays(g.createdAt))/Math.max(1,toDays(g.dueDate)-toDays(g.createdAt))));
 const monthly=remaining?Math.ceil(remaining/Math.max(1,remainingDays/30.4375)):0;
 let state="ok",message="Vas siguiendo tu plan";
 if(remaining===0){state="done";message="¡Objetivo conseguido!";}
 else if(today>g.dueDate){state="late";message="Fecha superada · ahorro pendiente";}
 else if(today===g.dueDate){state="late";message="La fecha límite es hoy";}
 else if(today>g.createdAt&&saved+g.target*.05<g.target*elapsed){state="behind";message="Por debajo del ritmo previsto";}
 return {saved,remaining,progress,monthly,state,message};
}
function build(ctx){
 const {getData,save,render,money,parseMoney,isRealDate,uid,h,toast,localDate}=ctx;
 const goalDlg=document.getElementById("goal-dialog"),goalForm=document.getElementById("goal-form");
 const moneyDlg=document.getElementById("goal-money-dialog"),moneyForm=document.getElementById("goal-money-form");
 let editing=null,depositing=null;
 const list=()=>getData().savingsGoals;
 const find=id=>list().find(g=>g.id===id);
 const dateFmt=d=>new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(new Date(d+"T12:00:00"));
 function formError(id,msg){const el=document.getElementById(id);el.textContent=msg;el.hidden=false;}
 function change(fn){
   const backup=JSON.stringify(list());fn();
   if(!save()){getData().savingsGoals=JSON.parse(backup);render();return false;}
   render();return true;
 }
 function renderPanel(){
   const goals=list(),today=localDate(),sum=goals.reduce((n,g)=>n+total(g),0);
   const entries=goals.slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map(g=>{
     const st=status(g,today),pct=Math.round(st.progress*100);
     const history=g.contributions.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
     return '<article class="goal-item"><div class="goal-item-top"><div class="goal-item-title"><strong>'+h(g.title)+'</strong><small>Objetivo: '+h(dateFmt(g.dueDate))+'</small></div><button type="button" class="goal-edit" data-goal-edit="'+h(g.id)+'">Editar</button></div>'+
     '<div class="goal-numbers"><strong>'+h(money(st.saved))+'</strong><span>de '+h(money(g.target))+'</span></div>'+
     '<div class="goal-progress" role="progressbar" aria-label="Progreso de '+h(g.title)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div>'+
     '<div class="goal-bottom"><span>'+pct+' % conseguido</span><span>Faltan '+h(money(st.remaining))+'</span></div>'+
     '<div class="goal-status goal-status-'+st.state+'">'+h(st.message)+'</div>'+
     (st.remaining?'<p class="goal-monthly">Para cumplir la meta: <strong>'+h(money(st.monthly))+' / mes</strong></p>':'')+
     '<button class="goal-add" type="button" data-goal-add="'+h(g.id)+'">+ Registrar aportación</button>'+
     (history.length?'<details class="goal-history"><summary>Historial de aportaciones ('+history.length+')</summary>'+
       history.slice(0,30).map(c=>'<div class="goal-history-row"><span>'+h(dateFmt(c.date))+(c.note?' · '+h(c.note):'')+'</span><b>'+h(money(c.amount))+'</b><button type="button" data-goal-delete-entry="'+h(c.id)+'" data-goal-id="'+h(g.id)+'" aria-label="Eliminar aportación">✕</button></div>').join('')+
       (history.length>30?'<p class="muted">Se muestran las 30 aportaciones más recientes.</p>':'')+'</details>':'')+'</article>';
   }).join('');
   return '<section class="goals-section" aria-label="Objetivos de ahorro"><div class="section-heading"><h2>Mis objetivos de ahorro</h2><button type="button" class="text-link" data-goal-new>+ Nuevo</button></div>'+
   '<div class="goals-total"><div><small>Ahorro real registrado</small><strong>'+h(money(sum))+'</strong></div><span>'+goals.length+' '+(goals.length===1?'objetivo':'objetivos')+'</span></div>'+
   (entries?'<div class="goals-items">'+entries+'</div>':'<section class="card goal-empty"><div class="goal-symbol">◎</div><strong>Crea tu primera meta</strong><p>Decide cuánto quieres ahorrar y hasta cuándo. Después registra las aportaciones que realmente reserves.</p><button type="button" class="primary-btn" data-goal-new>Crear objetivo</button></section>')+
   '<p class="footnote">Las aportaciones son apuntes de ahorro real que introduces manualmente. No modifican tus movimientos, saldo ni cuentas bancarias. Comprueba que has reservado ese dinero.</p></section>';
 }
 function renderHome(){
   const goals=list();if(!goals.length)return '';
   const g=goals.filter(x=>total(x)<x.target).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]||goals[0],st=status(g,localDate());
   return '<div class="section-heading"><h2>Objetivos de ahorro</h2><button type="button" class="text-link" data-action="savings">Ver metas →</button></div>'+
     '<section class="card goal-home"><div><strong>'+h(g.title)+'</strong><b>'+Math.round(st.progress*100)+' %</b></div>'+
     '<div class="goal-progress"><span style="width:'+Math.round(st.progress*100)+'%"></span></div><small>'+h(money(st.saved))+' de '+h(money(g.target))+' ahorrados</small></section>';
 }
 function openGoal(id){
   const g=id?find(id):null;if(id&&!g)return;
   editing=g?g.id:null;goalForm.reset();
   goalForm.elements.title.value=g?g.title:'';
   goalForm.elements.target.value=g?String((g.target/100).toFixed(2)).replace('.',','):'';
   const due=new Date();due.setFullYear(due.getFullYear()+1);
   goalForm.elements.dueDate.value=g?g.dueDate:localDate(due);
   document.getElementById("goal-heading").textContent=g?"Editar objetivo":"Nuevo objetivo";
   document.getElementById("goal-remove").hidden=!g;
   document.getElementById("goal-form-error").hidden=true;
   goalDlg.showModal();
 }
 function openMoney(id){
   const g=find(id);if(!g)return;depositing=id;moneyForm.reset();
   moneyForm.elements.date.value=localDate();
   document.getElementById("goal-money-heading").textContent="Ahorrar para "+g.title;
   document.getElementById("goal-money-error").hidden=true;moneyDlg.showModal();
 }
 goalForm.addEventListener("submit",event=>{
   event.preventDefault();
   const title=goalForm.elements.title.value.trim(),target=parseMoney(goalForm.elements.target.value),dueDate=goalForm.elements.dueDate.value;
   if(!title||title.length>65||!target||!isRealDate(dueDate)||(!editing&&dueDate<localDate()))return formError("goal-form-error","Introduce un nombre, un importe válido y una fecha de hoy o posterior.");
   const g=editing?find(editing):null;if(editing&&!g)return formError("goal-form-error","Objetivo no encontrado.");
   if(!g&&list().length>=60)return formError("goal-form-error","Máximo 60 objetivos.");
   const ok=change(()=>{
     if(g){g.title=title;g.target=target;g.dueDate=dueDate;}
     else list().push({id:uid(),title,target,dueDate,createdAt:localDate(),contributions:[]});
   });
   if(ok){goalDlg.close();toast(g?"Objetivo actualizado":"Objetivo creado");}
 });
 moneyForm.addEventListener("submit",event=>{
   event.preventDefault();
   const g=find(depositing),amount=parseMoney(moneyForm.elements.amount.value),date=moneyForm.elements.date.value,note=moneyForm.elements.note.value.trim();
   if(!g)return formError("goal-money-error","Objetivo no encontrado.");
   if(!amount||!isRealDate(date)||date>localDate()||note.length>90)return formError("goal-money-error","Revisa el importe y la fecha (no puede ser futura).");
   if(g.contributions.length>=500)return formError("goal-money-error","Máximo 500 aportaciones por objetivo.");
   if(total(g)+amount>9999999999)return formError("goal-money-error","Importe acumulado demasiado grande.");
   if(change(()=>g.contributions.push({id:uid(),amount,date,note:note.slice(0,90)}))){moneyDlg.close();toast("Aportación registrada");}
 });
 document.getElementById("goal-remove").addEventListener("click",()=>{
   const g=find(editing);if(!g||!confirm('¿Eliminar «'+g.title+'» y todas sus aportaciones?'))return;
   if(change(()=>{getData().savingsGoals=list().filter(x=>x.id!==g.id);})){goalDlg.close();toast("Objetivo eliminado");}
 });
 document.addEventListener("click",event=>{
   const el=event.target.closest("[data-goal-new],[data-goal-edit],[data-goal-add],[data-goal-delete-entry]");
   if(!el)return;
   if(el.hasAttribute("data-goal-new"))return openGoal();
   if(el.hasAttribute("data-goal-edit"))return openGoal(el.dataset.goalEdit);
   if(el.hasAttribute("data-goal-add"))return openMoney(el.dataset.goalAdd);
   if(el.hasAttribute("data-goal-delete-entry")){
     const g=find(el.dataset.goalId),c=g?.contributions.find(x=>x.id===el.dataset.goalDeleteEntry);
     if(!c||!confirm("¿Eliminar esta aportación de "+money(c.amount)+"?"))return;
     if(change(()=>{g.contributions=g.contributions.filter(x=>x.id!==c.id);})){toast("Aportación eliminada");}
   }
 });
 [goalDlg,moneyDlg].forEach(d=>d.addEventListener("click",event=>{if(event.target===d)d.close();}));
 return {renderPanel,renderHome};
}
root.BudvivaGoals={build,total,status};
})(window);
