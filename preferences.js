/* Preferencias visuales V6. Independiente de los movimientos. */
(function(root){
'use strict';
const KEY='control-gastos-preferencias-v6';
const THEMES=['auto','light','dark','premium','natural'];
const LANGS=['es','en','fr','de','it','pt'];
const dictionaries={"en":{"Inicio":"Home","Movimientos":"Transactions","Presupuestos":"Budgets","Recurrentes":"Recurring","Ajustes":"Settings","Gasto":"Expense","Ingreso":"Income","Ingresos":"Income","Gastos":"Expenses","Saldo":"Balance","Categoría":"Category","Fecha":"Date","Importe":"Amount","Concepto":"Description","Tarjeta":"Card","Efectivo":"Cash","Otro":"Other","Guardar movimiento":"Save transaction","Nuevo movimiento":"New transaction","Eliminar":"Delete","Método de pago":"Payment method","Nota (opcional)":"Note (optional)","Presupuesto mensual":"Monthly budget","Límite mensual":"Monthly limit","Quitar límite":"Remove limit","Guardar presupuesto":"Save budget","Nuevo recurrente":"New recurring transaction","Frecuencia":"Frequency","Mensual":"Monthly","Semanal":"Weekly","Anual":"Yearly","Diaria":"Daily","Fecha de inicio":"Start date","Método":"Method","Regla activa":"Active rule","Eliminar regla":"Delete rule","Guardar regla":"Save rule","Estadísticas":"Statistics","Plan de ahorro":"Savings plan","Tus datos":"Your data","Aplicación":"Application","PREFERENCIAS":"PREFERENCES","TU EVOLUCIÓN":"YOUR TRENDS","LECTURA INTELIGENTE":"SMART IMPORT","Importar gastos":"Import expenses","Ingresos y gastos":"Income and expenses","Desglose por categorías":"Breakdown by category","Necesarios":"Essential","No necesarios":"Non-essential","Sin evaluar":"Not assessed","Comparativa mensual":"Monthly comparison","Detalle por mes":"Monthly details","Balance":"Balance","Ahorro sobre ingresos":"Savings rate","Ahorro simulado / mes*":"Estimated monthly savings*","Proyección anual*":"Annual projection*","Productos prescindibles más caros":"Most expensive non-essential items","Categorías con más compras prescindibles":"Categories with most non-essential spending","Guardar":"Save","Cancelar":"Cancel","Aceptar":"Accept","Buscar movimientos":"Search transactions","Sin movimientos":"No transactions","Este mes":"This month"},"fr":{"Inicio":"Accueil","Movimientos":"Opérations","Presupuestos":"Budgets","Recurrentes":"Récurrents","Ajustes":"Paramètres","Gasto":"Dépense","Ingreso":"Revenu","Ingresos":"Revenus","Gastos":"Dépenses","Saldo":"Solde","Categoría":"Catégorie","Fecha":"Date","Importe":"Montant","Concepto":"Libellé","Tarjeta":"Carte","Efectivo":"Espèces","Otro":"Autre","Guardar movimiento":"Enregistrer l'opération","Nuevo movimiento":"Nouvelle opération","Eliminar":"Supprimer","Método de pago":"Mode de paiement","Nota (opcional)":"Note (facultative)","Presupuesto mensual":"Budget mensuel","Límite mensual":"Plafond mensuel","Quitar límite":"Supprimer le plafond","Guardar presupuesto":"Enregistrer le budget","Nuevo recurrente":"Nouvelle opération récurrente","Frecuencia":"Fréquence","Mensual":"Mensuel","Semanal":"Hebdomadaire","Anual":"Annuel","Diaria":"Quotidien","Fecha de inicio":"Date de début","Método":"Mode","Regla activa":"Règle active","Eliminar regla":"Supprimer la règle","Guardar regla":"Enregistrer la règle","Estadísticas":"Statistiques","Plan de ahorro":"Plan d'épargne","Tus datos":"Vos données","Aplicación":"Application","PREFERENCIAS":"PRÉFÉRENCES","TU EVOLUCIÓN":"VOTRE ÉVOLUTION","Importar gastos":"Importer des dépenses","Ingresos y gastos":"Revenus et dépenses","Desglose por categorías":"Répartition par catégorie","Necesarios":"Essentiels","No necesarios":"Non essentiels","Sin evaluar":"Non évalués","Comparativa mensual":"Comparaison mensuelle","Detalle por mes":"Détails par mois","Balance":"Solde","Proyección anual*":"Projection annuelle*","Guardar":"Enregistrer","Cancelar":"Annuler","Aceptar":"Valider"},"de":{"Inicio":"Start","Movimientos":"Buchungen","Presupuestos":"Budgets","Recurrentes":"Wiederkehrend","Ajustes":"Einstellungen","Gasto":"Ausgabe","Ingreso":"Einnahme","Ingresos":"Einnahmen","Gastos":"Ausgaben","Saldo":"Kontostand","Categoría":"Kategorie","Fecha":"Datum","Importe":"Betrag","Concepto":"Beschreibung","Tarjeta":"Karte","Efectivo":"Bargeld","Otro":"Sonstiges","Guardar movimiento":"Buchung speichern","Nuevo movimiento":"Neue Buchung","Eliminar":"Löschen","Método de pago":"Zahlungsart","Nota (opcional)":"Notiz (optional)","Presupuesto mensual":"Monatsbudget","Límite mensual":"Monatslimit","Quitar límite":"Limit entfernen","Guardar presupuesto":"Budget speichern","Nuevo recurrente":"Neue wiederkehrende Buchung","Frecuencia":"Häufigkeit","Mensual":"Monatlich","Semanal":"Wöchentlich","Anual":"Jährlich","Diaria":"Täglich","Fecha de inicio":"Startdatum","Método":"Methode","Regla activa":"Aktive Regel","Eliminar regla":"Regel löschen","Guardar regla":"Regel speichern","Estadísticas":"Statistiken","Plan de ahorro":"Sparplan","Tus datos":"Deine Daten","Aplicación":"App","PREFERENCIAS":"EINSTELLUNGEN","TU EVOLUCIÓN":"DEINE ENTWICKLUNG","Importar gastos":"Ausgaben importieren","Ingresos y gastos":"Einnahmen und Ausgaben","Desglose por categorías":"Nach Kategorien","Necesarios":"Notwendig","No necesarios":"Nicht notwendig","Sin evaluar":"Nicht bewertet","Comparativa mensual":"Monatsvergleich","Detalle por mes":"Monatsdetails","Balance":"Saldo","Proyección anual*":"Jahresprognose*","Guardar":"Speichern","Cancelar":"Abbrechen","Aceptar":"Bestätigen"},"it":{"Inicio":"Home","Movimientos":"Movimenti","Presupuestos":"Budget","Recurrentes":"Ricorrenti","Ajustes":"Impostazioni","Gasto":"Spesa","Ingreso":"Entrata","Ingresos":"Entrate","Gastos":"Spese","Saldo":"Saldo","Categoría":"Categoria","Fecha":"Data","Importe":"Importo","Concepto":"Descrizione","Tarjeta":"Carta","Efectivo":"Contanti","Otro":"Altro","Guardar movimiento":"Salva movimento","Nuevo movimiento":"Nuovo movimento","Eliminar":"Elimina","Método de pago":"Metodo di pagamento","Nota (opcional)":"Nota (facoltativa)","Presupuesto mensual":"Budget mensile","Límite mensual":"Limite mensile","Quitar límite":"Rimuovi limite","Guardar presupuesto":"Salva budget","Nuevo recurrente":"Nuovo ricorrente","Frecuencia":"Frequenza","Mensual":"Mensile","Semanal":"Settimanale","Anual":"Annuale","Diaria":"Giornaliera","Fecha de inicio":"Data di inizio","Método":"Metodo","Regla activa":"Regola attiva","Eliminar regla":"Elimina regola","Guardar regla":"Salva regola","Estadísticas":"Statistiche","Plan de ahorro":"Piano di risparmio","Tus datos":"I tuoi dati","Aplicación":"Applicazione","PREFERENCIAS":"PREFERENZE","TU EVOLUCIÓN":"LA TUA EVOLUZIONE","Importar gastos":"Importa spese","Ingresos y gastos":"Entrate e spese","Desglose por categorías":"Dettaglio per categoria","Necesarios":"Necessari","No necesarios":"Non necessari","Sin evaluar":"Non valutati","Comparativa mensual":"Confronto mensile","Detalle por mes":"Dettaglio mensile","Balance":"Saldo","Proyección anual*":"Proiezione annuale*","Guardar":"Salva","Cancelar":"Annulla","Aceptar":"Conferma"},"pt":{"Inicio":"Início","Movimientos":"Movimentos","Presupuestos":"Orçamentos","Recurrentes":"Recorrentes","Ajustes":"Definições","Gasto":"Despesa","Ingreso":"Receita","Ingresos":"Receitas","Gastos":"Despesas","Saldo":"Saldo","Categoría":"Categoria","Fecha":"Data","Importe":"Valor","Concepto":"Descrição","Tarjeta":"Cartão","Efectivo":"Dinheiro","Otro":"Outro","Guardar movimiento":"Guardar movimento","Nuevo movimiento":"Novo movimento","Eliminar":"Eliminar","Método de pago":"Método de pagamento","Nota (opcional)":"Nota (opcional)","Presupuesto mensual":"Orçamento mensal","Límite mensual":"Limite mensal","Quitar límite":"Remover limite","Guardar presupuesto":"Guardar orçamento","Nuevo recurrente":"Novo recorrente","Frecuencia":"Frequência","Mensual":"Mensal","Semanal":"Semanal","Anual":"Anual","Diaria":"Diária","Fecha de inicio":"Data de início","Método":"Método","Regla activa":"Regra ativa","Eliminar regla":"Eliminar regra","Guardar regla":"Guardar regra","Estadísticas":"Estatísticas","Plan de ahorro":"Plano de poupança","Tus datos":"Os teus dados","Aplicación":"Aplicação","PREFERENCIAS":"PREFERÊNCIAS","TU EVOLUCIÓN":"A TUA EVOLUÇÃO","Importar gastos":"Importar despesas","Ingresos y gastos":"Receitas e despesas","Desglose por categorías":"Detalhe por categoria","Necesarios":"Necessários","No necesarios":"Não necessários","Sin evaluar":"Não avaliados","Comparativa mensual":"Comparação mensal","Detalle por mes":"Detalhe mensal","Balance":"Saldo","Proyección anual*":"Projeção anual*","Guardar":"Guardar","Cancelar":"Cancelar","Aceptar":"Confirmar"}};
const names={es:'Español',en:'English',fr:'Français',de:'Deutsch',it:'Italiano',pt:'Português'};
const themeNames={auto:'Automático',light:'Claro',dark:'Oscuro',premium:'Premium',natural:'Natural'};
let state={theme:'auto',language:'es'};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(THEMES.includes(saved.theme))state.theme=saved.theme;if(LANGS.includes(saved.language))state.language=saved.language;}catch(e){}
const dark=()=>root.matchMedia&&root.matchMedia('(prefers-color-scheme: dark)').matches;
function apply(){
 const active=state.theme==='auto'?(dark()?'dark':'light'):state.theme;
 document.documentElement.dataset.cgTheme=active;
 document.documentElement.lang=state.language;
 document.documentElement.style.colorScheme=active==='dark'||active==='premium'?'dark':'light';
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=active==='dark'?'#111b29':active==='premium'?'#111c31':active==='natural'?'#e8efe5':'#12263a';
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
function setTheme(value){if(!THEMES.includes(value))return;state.theme=value;save();apply();}
function setLanguage(value){if(!LANGS.includes(value))return;state.language=value;save();apply();translate(document.body);}
function t(value){return dictionaries[state.language]?.[value]||value;}
const originals=new WeakMap();
function translate(rootNode){
 if(!rootNode)return;
 const dictionary=dictionaries[state.language]||{};
 const walker=document.createTreeWalker(rootNode,NodeFilter.SHOW_TEXT,{
  acceptNode(node){
   const el=node.parentElement;
   if(!el||el.closest('script,style,textarea,[data-no-translate],input'))return NodeFilter.FILTER_REJECT;
   return NodeFilter.FILTER_ACCEPT;
  }
 });
 let node;
 while((node=walker.nextNode())){
  const raw=originals.has(node)?originals.get(node):node.nodeValue;
  if(!originals.has(node))originals.set(node,raw);
  const trimmed=raw.trim();
  node.nodeValue=dictionary[trimmed]?raw.replace(trimmed,dictionary[trimmed]):raw;
 }
 rootNode.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach(el=>{
  for(const attr of ['placeholder','aria-label','title']){
   const key='cgOriginal'+attr;
   const value=el.dataset[key]||el.getAttribute(attr);
   if(!el.dataset[key]&&value)el.dataset[key]=value;
   if(value)el.setAttribute(attr,dictionary[value]||value);
  }
 });
}
function controls(){
 return '<section class="card settings-card cg-personalize"><h2>🎨 Apariencia e idioma</h2><p class="muted">Personaliza la aplicación. Las preferencias se guardan sin modificar tus movimientos.</p>'
 +'<label for="cg-theme-select">Tema de visualización</label><select id="cg-theme-select" aria-label="Tema de visualización">'+THEMES.map(v=>'<option value="'+v+'"'+(state.theme===v?' selected':'')+'>'+themeNames[v]+'</option>').join('')+'</select>'
 +'<div class="cg-theme-previews">'+THEMES.map(v=>'<button type="button" data-cg-theme="'+v+'" class="cg-theme-choice'+(state.theme===v?' is-selected':'')+'" aria-pressed="'+(state.theme===v)+'"><span class="cg-theme-swatch cg-swatch-'+v+'"><i></i><i></i><i></i></span><small>'+themeNames[v]+'</small></button>').join('')+'</div>'
 +'<label for="cg-language-select">Idioma de la aplicación</label><select id="cg-language-select" aria-label="Idioma de la aplicación">'+LANGS.map(v=>'<option value="'+v+'"'+(state.language===v?' selected':'')+'>'+names[v]+'</option>').join('')+'</select>'
 +'<p class="footnote">Traducción inicial de la navegación y los controles principales. Se ampliará a todos los mensajes y estadísticas en próximas versiones.</p></section>';
}
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='cg-theme-select')setTheme(el.value);
 if(el.id==='cg-language-select')setLanguage(el.value);
});
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-cg-theme]');
 if(!el)return;
 setTheme(el.dataset.cgTheme);
 document.querySelectorAll('[data-cg-theme]').forEach(b=>{const selected=b.dataset.cgTheme===state.theme;b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',String(selected));});
 const select=document.getElementById('cg-theme-select');if(select)select.value=state.theme;
});
if(root.matchMedia){const media=root.matchMedia('(prefers-color-scheme: dark)');if(media.addEventListener)media.addEventListener('change',()=>{if(state.theme==='auto')apply();});}
apply();
root.CGPreferences={get:()=>({...state}),setTheme,setLanguage,apply,translate,controls,t};
})(window);