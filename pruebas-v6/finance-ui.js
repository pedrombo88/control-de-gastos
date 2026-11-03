/* Finance V6: preferencias locales, temas e idioma. No toca movimientos. */
(function(root){
"use strict";
const KEY="finance-ui-preferences-v1";
const THEMES=["light","dark","ocean","sand"];
const LANGS=["es","en"];
let state={theme:"light",language:"es"};
try{const p=JSON.parse(localStorage.getItem(KEY)||"{}");if(THEMES.includes(p.theme))state.theme=p.theme;if(LANGS.includes(p.language))state.language=p.language;}catch(e){}
const dictionary={
"Ajustes":"Settings","Inicio":"Home","Movimientos":"Transactions","Presupuestos":"Budgets","Recurrentes":"Recurring","Estadísticas":"Analytics",
"Nuevo movimiento":"New transaction","Gasto":"Expense","Ingreso":"Income","Gastos":"Expenses","Ingresos":"Income","Guardar":"Save","Cancelar":"Cancel",
"Hoy":"Today","Este mes":"This month","Mes anterior":"Previous month","Saldo":"Balance","Balance total":"Total balance",
"Añadir movimiento":"Add transaction","Añadir gasto":"Add expense","Añadir ingreso":"Add income",
"Importar gastos":"Import expenses","Importar tickets y extractos":"Import receipts and statements",
"Estadísticas avanzadas":"Advanced analytics","Plan de ahorro":"Savings plan",
"Ver productos y necesidades":"View items and needs","Productos necesarios":"Essential items","No necesarios":"Non-essential",
"Descargar copia de seguridad":"Download backup","Restaurar copia":"Restore backup","Exportar movimientos a CSV":"Export transactions to CSV",
"Instalar en el iPhone":"Install on iPhone","Cargar datos de demostración":"Load demo data","Borrar todos mis datos":"Delete all my data",
"Tus datos":"Your data","Aplicación":"Application","Privacidad por diseño":"Privacy by design",
"Para usarla como una app":"Use it as an app","Categoría":"Category","Fecha":"Date","Importe":"Amount",
"Concepto":"Description","Nota":"Note","Método de pago":"Payment method","Tarjeta":"Card","Efectivo":"Cash",
"Filtrar":"Filter","Todos":"All","Todos los movimientos":"All transactions","Ver todos":"View all",
"Necesarios y no necesarios":"Essential vs non-essential","Productos prescindibles más caros":"Top non-essential purchases",
"Categorías con más compras prescindibles":"Non-essential purchases by category",
"PREFERENCIAS":"PREFERENCES","RESUMEN":"OVERVIEW","MOVIMIENTOS":"TRANSACTIONS",
"Guardar movimientos":"Save transactions","Revisar movimientos":"Review transactions",
"Seleccionar este movimiento para guardar":"Select this transaction to save",
"Configuración":"Settings","Mes":"Month","Año":"Year","Eliminar":"Delete","Editar":"Edit",
"Volver":"Back","Cerrar":"Close","Aceptar":"Confirm","Continuar":"Continue",
"Buscar movimientos":"Search transactions","Últimos movimientos":"Recent transactions",
"Sin movimientos":"No transactions","Total":"Total","Pendiente":"Pending"
};
const reverse=Object.fromEntries(Object.entries(dictionary).map(([k,v])=>[v,k]));
function translateText(text){const t=text.trim();if(!t)return text;const out=state.language==="en"?dictionary[t]:reverse[t];if(!out)return text;const start=text.indexOf(t);return text.slice(0,start)+out+text.slice(start+t.length);}
function localize(container){
 if(!container)return;
 const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
 let node;while((node=walker.nextNode())){
   if(!node.parentElement||node.parentElement.closest("script,style,textarea,option,.movement-list,.transaction-item,.receipt-item,.saving-leaderboard-row,[data-user-content]"))continue;
   if(!node.parentElement.closest("button,label,h1,h2,h3,.nav-item,.eyebrow,.section-heading,.settings-card,.sheet-heading,.tag"))continue;
   const next=translateText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;
 }
}
function apply(){
 document.documentElement.dataset.financeTheme=state.theme;
 document.documentElement.lang=state.language==="en"?"en":"es";
 document.querySelector('meta[name="theme-color"]')?.setAttribute("content",state.theme==="dark"?"#0c1624":state.theme==="ocean"?"#0b4055":state.theme==="sand"?"#705439":"#102f41");
 const panel=document.querySelector("#finance-preferences");
 if(panel)panel.innerHTML=renderControls();
 localize(document.getElementById("page-content"));
 localize(document.querySelector(".bottom-nav"));
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}apply();}
function setTheme(v){if(!THEMES.includes(v))return false;state.theme=v;persist();return true;}
function setLanguage(v){if(!LANGS.includes(v))return false;state.language=v;persist();return true;}
function renderControls(){
 const en=state.language==="en";
 const themes=[["light",en?"Light":"Claro","☀️"],["dark",en?"Dark":"Oscuro","🌙"],["ocean",en?"Ocean":"Océano","🌊"],["sand",en?"Sand":"Arena","🏜️"]];
 return '<div class="finance-pref-head"><span class="finance-pref-symbol">✦</span><div><strong>'+(en?"Appearance & language":"Apariencia e idioma")+'</strong><small>'+(en?"Personalise your Finance experience":"Personaliza tu experiencia en Finance")+'</small></div></div>'+
 '<div class="finance-pref-label">'+(en?"Display theme":"Tema de visualización")+'</div>'+
 '<div class="finance-theme-grid" role="group" aria-label="'+(en?"Display theme":"Tema de visualización")+'">'+themes.map(([id,label,emoji])=>'<button type="button" class="finance-theme-choice'+(state.theme===id?' selected':'')+'" data-finance-theme="'+id+'" aria-pressed="'+(state.theme===id)+'"><span class="finance-theme-icon">'+emoji+'</span><span>'+label+'</span><span class="finance-theme-check">'+(state.theme===id?"✓":"")+'</span></button>').join("")+'</div>'+
 '<label class="finance-pref-label" for="finance-language">'+(en?"Language":"Idioma")+'</label>'+
 '<select id="finance-language" class="finance-language-select" data-finance-language><option value="es"'+(state.language==="es"?" selected":"")+'>Español</option><option value="en"'+(state.language==="en"?" selected":"")+'>English</option></select>'+
 '<p class="finance-pref-note">'+(en?"Your preference is saved on this device. Transaction data is never changed. Some import formats and specialised screens still use Spanish.":"Tu preferencia se guarda en este dispositivo. No modifica los movimientos. Algunos formatos de importación y pantallas especializadas siguen en español.")+'</p>';
}
function mountSettings(){return '<section class="card finance-preferences" id="finance-preferences">'+renderControls()+'</section>';}
document.addEventListener("click",e=>{const b=e.target.closest("[data-finance-theme]");if(b){setTheme(b.dataset.financeTheme);}});
document.addEventListener("change",e=>{if(e.target.matches("[data-finance-language]")){setLanguage(e.target.value);root.dispatchEvent(new Event("finance-language-changed"));}});
root.CGFinanceUI={get:()=>({...state}),apply,setTheme,setLanguage,mountSettings,localize};
document.addEventListener("DOMContentLoaded",apply);
})(window);