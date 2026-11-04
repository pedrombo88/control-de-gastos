/* Finance V6: preferencias locales, temas e idioma. No toca movimientos. */
(function(root){
"use strict";
const KEY="finance-ui-preferences-v1";
const THEMES=["violet-studio","auto","black-yellow","black-purple","white-blue","white-red","natural","premium"];
const LANGS=["es","en","fr","de","it","pt"];
let state={theme:"violet-studio",language:"es"};
try{const p=JSON.parse(localStorage.getItem(KEY)||"{}");if(THEMES.includes(p.theme))state.theme=p.theme;else if(p.theme==="dark")state.theme="black-purple";else if(p.theme==="light"||p.theme==="ocean")state.theme="white-blue";else if(p.theme==="sand")state.theme="white-red";if(LANGS.includes(p.language))state.language=p.language;}catch(e){}
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
const otherDictionaries={"fr":{"Inicio":"Accueil","Movimientos":"Opérations","Presupuestos":"Budgets","Recurrentes":"Récurrents","Ajustes":"Paramètres","Gasto":"Dépense","Ingreso":"Revenu","Ingresos":"Revenus","Gastos":"Dépenses","Saldo":"Solde","Categoría":"Catégorie","Fecha":"Date","Importe":"Montant","Concepto":"Libellé","Tarjeta":"Carte","Efectivo":"Espèces","Otro":"Autre","Guardar movimiento":"Enregistrer l'opération","Nuevo movimiento":"Nouvelle opération","Eliminar":"Supprimer","Método de pago":"Mode de paiement","Nota (opcional)":"Note (facultative)","Presupuesto mensual":"Budget mensuel","Límite mensual":"Plafond mensuel","Quitar límite":"Supprimer le plafond","Guardar presupuesto":"Enregistrer le budget","Nuevo recurrente":"Nouvelle opération récurrente","Frecuencia":"Fréquence","Mensual":"Mensuel","Semanal":"Hebdomadaire","Anual":"Annuel","Diaria":"Quotidien","Fecha de inicio":"Date de début","Método":"Mode","Regla activa":"Règle active","Eliminar regla":"Supprimer la règle","Guardar regla":"Enregistrer la règle","Estadísticas":"Statistiques","Plan de ahorro":"Plan d'épargne","Tus datos":"Vos données","Aplicación":"Application","PREFERENCIAS":"PRÉFÉRENCES","TU EVOLUCIÓN":"VOTRE ÉVOLUTION","Importar gastos":"Importer des dépenses","Ingresos y gastos":"Revenus et dépenses","Desglose por categorías":"Répartition par catégorie","Necesarios":"Essentiels","No necesarios":"Non essentiels","Sin evaluar":"Non évalués","Comparativa mensual":"Comparaison mensuelle","Detalle por mes":"Détails par mois","Balance":"Solde","Proyección anual*":"Projection annuelle*","Guardar":"Enregistrer","Cancelar":"Annuler","Aceptar":"Valider"},"de":{"Inicio":"Start","Movimientos":"Buchungen","Presupuestos":"Budgets","Recurrentes":"Wiederkehrend","Ajustes":"Einstellungen","Gasto":"Ausgabe","Ingreso":"Einnahme","Ingresos":"Einnahmen","Gastos":"Ausgaben","Saldo":"Kontostand","Categoría":"Kategorie","Fecha":"Datum","Importe":"Betrag","Concepto":"Beschreibung","Tarjeta":"Karte","Efectivo":"Bargeld","Otro":"Sonstiges","Guardar movimiento":"Buchung speichern","Nuevo movimiento":"Neue Buchung","Eliminar":"Löschen","Método de pago":"Zahlungsart","Nota (opcional)":"Notiz (optional)","Presupuesto mensual":"Monatsbudget","Límite mensual":"Monatslimit","Quitar límite":"Limit entfernen","Guardar presupuesto":"Budget speichern","Nuevo recurrente":"Neue wiederkehrende Buchung","Frecuencia":"Häufigkeit","Mensual":"Monatlich","Semanal":"Wöchentlich","Anual":"Jährlich","Diaria":"Täglich","Fecha de inicio":"Startdatum","Método":"Methode","Regla activa":"Aktive Regel","Eliminar regla":"Regel löschen","Guardar regla":"Regel speichern","Estadísticas":"Statistiken","Plan de ahorro":"Sparplan","Tus datos":"Deine Daten","Aplicación":"App","PREFERENCIAS":"EINSTELLUNGEN","TU EVOLUCIÓN":"DEINE ENTWICKLUNG","Importar gastos":"Ausgaben importieren","Ingresos y gastos":"Einnahmen und Ausgaben","Desglose por categorías":"Nach Kategorien","Necesarios":"Notwendig","No necesarios":"Nicht notwendig","Sin evaluar":"Nicht bewertet","Comparativa mensual":"Monatsvergleich","Detalle por mes":"Monatsdetails","Balance":"Saldo","Proyección anual*":"Jahresprognose*","Guardar":"Speichern","Cancelar":"Abbrechen","Aceptar":"Bestätigen"},"it":{"Inicio":"Home","Movimientos":"Movimenti","Presupuestos":"Budget","Recurrentes":"Ricorrenti","Ajustes":"Impostazioni","Gasto":"Spesa","Ingreso":"Entrata","Ingresos":"Entrate","Gastos":"Spese","Saldo":"Saldo","Categoría":"Categoria","Fecha":"Data","Importe":"Importo","Concepto":"Descrizione","Tarjeta":"Carta","Efectivo":"Contanti","Otro":"Altro","Guardar movimiento":"Salva movimento","Nuevo movimiento":"Nuovo movimento","Eliminar":"Elimina","Método de pago":"Metodo di pagamento","Nota (opcional)":"Nota (facoltativa)","Presupuesto mensual":"Budget mensile","Límite mensual":"Limite mensile","Quitar límite":"Rimuovi limite","Guardar presupuesto":"Salva budget","Nuevo recurrente":"Nuovo ricorrente","Frecuencia":"Frequenza","Mensual":"Mensile","Semanal":"Settimanale","Anual":"Annuale","Diaria":"Giornaliera","Fecha de inicio":"Data di inizio","Método":"Metodo","Regla activa":"Regola attiva","Eliminar regla":"Elimina regola","Guardar regla":"Salva regola","Estadísticas":"Statistiche","Plan de ahorro":"Piano di risparmio","Tus datos":"I tuoi dati","Aplicación":"Applicazione","PREFERENCIAS":"PREFERENZE","TU EVOLUCIÓN":"LA TUA EVOLUZIONE","Importar gastos":"Importa spese","Ingresos y gastos":"Entrate e spese","Desglose por categorías":"Dettaglio per categoria","Necesarios":"Necessari","No necesarios":"Non necessari","Sin evaluar":"Non valutati","Comparativa mensual":"Confronto mensile","Detalle por mes":"Dettaglio mensile","Balance":"Saldo","Proyección anual*":"Proiezione annuale*","Guardar":"Salva","Cancelar":"Annulla","Aceptar":"Conferma"},"pt":{"Inicio":"Início","Movimientos":"Movimentos","Presupuestos":"Orçamentos","Recurrentes":"Recorrentes","Ajustes":"Definições","Gasto":"Despesa","Ingreso":"Receita","Ingresos":"Receitas","Gastos":"Despesas","Saldo":"Saldo","Categoría":"Categoria","Fecha":"Data","Importe":"Valor","Concepto":"Descrição","Tarjeta":"Cartão","Efectivo":"Dinheiro","Otro":"Outro","Guardar movimiento":"Guardar movimento","Nuevo movimiento":"Novo movimento","Eliminar":"Eliminar","Método de pago":"Método de pagamento","Nota (opcional)":"Nota (opcional)","Presupuesto mensual":"Orçamento mensal","Límite mensual":"Limite mensal","Quitar límite":"Remover limite","Guardar presupuesto":"Guardar orçamento","Nuevo recurrente":"Novo recorrente","Frecuencia":"Frequência","Mensual":"Mensal","Semanal":"Semanal","Anual":"Anual","Diaria":"Diária","Fecha de inicio":"Data de início","Método":"Método","Regla activa":"Regra ativa","Eliminar regla":"Eliminar regra","Guardar regla":"Guardar regra","Estadísticas":"Estatísticas","Plan de ahorro":"Plano de poupança","Tus datos":"Os teus dados","Aplicación":"Aplicação","PREFERENCIAS":"PREFERÊNCIAS","TU EVOLUCIÓN":"A TUA EVOLUÇÃO","Importar gastos":"Importar despesas","Ingresos y gastos":"Receitas e despesas","Desglose por categorías":"Detalhe por categoria","Necesarios":"Necessários","No necesarios":"Não necessários","Sin evaluar":"Não avaliados","Comparativa mensual":"Comparação mensal","Detalle por mes":"Detalhe mensal","Balance":"Saldo","Proyección anual*":"Projeção anual*","Guardar":"Guardar","Cancelar":"Cancelar","Aceptar":"Confirmar"}};
const languageNames={es:"Español",en:"English",fr:"Français",de:"Deutsch",it:"Italiano",pt:"Português"};
const reverse=Object.fromEntries(Object.entries(dictionary).map(([k,v])=>[v,k]));
function translateText(text){const t=text.trim();if(!t)return text;const out=state.language==="es"?(reverse[t]||null):state.language==="en"?dictionary[t]:otherDictionaries[state.language]?.[t];if(!out)return text;const start=text.indexOf(t);return text.slice(0,start)+out+text.slice(start+t.length);}
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
 document.documentElement.dataset.financeTheme=state.theme==="auto"?(root.matchMedia&&root.matchMedia("(prefers-color-scheme: dark)").matches?"black-purple":"white-blue"):state.theme;
 document.documentElement.lang=state.language;
 document.querySelector('meta[name="theme-color"]')?.setAttribute("content",(state.theme.startsWith("black")||state.theme==="premium")?"#090b10":"#f7f9fc");
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
 const themes=[["violet-studio",en?"Studio Violet":"Violeta Studio","✦"],["auto",en?"Automatic":"Automático","◐"],["natural",en?"Natural":"Natural","●"],["premium",en?"Premium":"Premium","●"],["black-yellow",en?"Black & Yellow":"Negro y Amarillo","●"],["black-purple",en?"Black & Purple":"Negro y Morado","●"],["white-blue",en?"White & Blue":"Blanco y Azul","●"],["white-red",en?"White & Red":"Blanco y Rojo","●"]];
 return '<div class="finance-pref-head"><span class="finance-pref-symbol">✦</span><div><strong>'+(en?"Appearance & language":"Apariencia e idioma")+'</strong><small>'+(en?"Personalise your Finance experience":"Personaliza tu experiencia en Finance")+'</small></div></div>'+
 '<div class="finance-pref-label">'+(en?"Display theme":"Tema de visualización")+'</div>'+
 '<div class="finance-theme-grid" role="group" aria-label="'+(en?"Display theme":"Tema de visualización")+'">'+themes.map(([id,label,emoji])=>'<button type="button" class="finance-theme-choice'+(state.theme===id?' selected':'')+'" data-finance-theme="'+id+'" aria-pressed="'+(state.theme===id)+'"><span class="finance-theme-icon finance-swatch finance-swatch-'+id+'">'+emoji+'</span><span>'+label+'</span><span class="finance-theme-check">'+(state.theme===id?"✓":"")+'</span></button>').join("")+'</div>'+
 '<label class="finance-pref-label" for="finance-language">'+(en?"Language":"Idioma")+'</label>'+
 '<select id="finance-language" class="finance-language-select" data-finance-language>'+LANGS.map(code=>'<option value="'+code+'"'+(state.language===code?' selected':'')+'>'+languageNames[code]+'</option>').join('')+'</select>'+ 
 '<p class="finance-pref-note">'+(en?"Your preference is saved on this device. Transaction data is never changed. Some import formats and specialised screens still use Spanish.":"Tu preferencia se guarda en este dispositivo. No modifica los movimientos. Algunos formatos de importación y pantallas especializadas siguen en español.")+'</p>';
}
function mountSettings(){return '<section class="card finance-preferences" id="finance-preferences">'+renderControls()+'</section>';}
document.addEventListener("click",e=>{const b=e.target.closest("[data-finance-theme]");if(b){setTheme(b.dataset.financeTheme);}});
document.addEventListener("change",e=>{if(e.target.matches("[data-finance-language]")){setLanguage(e.target.value);root.dispatchEvent(new Event("finance-language-changed"));}});
root.CGFinanceUI={get:()=>({...state}),apply,setTheme,setLanguage,mountSettings,localize};
if(root.matchMedia){const m=root.matchMedia("(prefers-color-scheme: dark)");m.addEventListener?.("change",()=>{if(state.theme==="auto")apply();});}
document.addEventListener("DOMContentLoaded",apply);
})(window);