/* Conciliación de tickets y movimientos bancarios. No fusiona automáticamente. */
(function(root){
"use strict";
const dateDay=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||"")))return null;const n=Date.parse(s+"T12:00:00Z");return Number.isFinite(n)?Math.floor(n/86400000):null;};
const clean=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\b(s l|sl|sa|s a|compra|pago|tarjeta|tpv|comercio|operacion|oper|contactless|visa|mastercard|debito|credito|de|del|en|el|la|los|las|a|por|euros|eur|tienda|supermercado)\b/g," ").replace(/\s+/g," ").trim();
const tokens=s=>clean(s).split(" ").filter(x=>x.length>=3);
function sourceOf(tx){return tx?.importSource||(Array.isArray(tx?.receiptItems)?"ticket":"unknown");}
function candidates(incoming,existing,limit=5){
 if(!incoming||incoming.type!=="expense"||!Number.isSafeInteger(incoming.amount)||incoming.amount<=0)return [];
 const day=dateDay(incoming.date);if(day===null)return [];
 const src=sourceOf(incoming);
 return (existing||[]).filter(tx=>{
   if(!tx||tx.type!=="expense"||tx.id===incoming.id||tx.amount!==incoming.amount)return false;
   if(src==="ticket"&&Array.isArray(tx.receiptItems)&&tx.receiptItems.length)return false;
   if(src==="bank"&&sourceOf(tx)==="bank")return false;
   return true;
 }).map(tx=>{
   const d=dateDay(tx.date);if(d===null)return null;
   const days=Math.abs(d-day);if(days>3)return null;
   const a=tokens(incoming.title),b=tokens(tx.title);
   const overlap=a.some(word=>b.some(other=>word===other||(word.length>=5&&other.length>=5&&(word.startsWith(other)||other.startsWith(word)))));
   // Solo propone vinculación de confianza alta con nombre de comercio y fecha compatibles.
   // Si el banco muestra "Pago tarjeta" sin comercio, se ofrece revisar la coincidencia.
   const strong=overlap&&days<=3;
   const review=days<=1;
   if(!strong&&!review)return null;
   return {...tx,matchDays:days,matchStrength:strong?"alta":"revisar"};
 }).filter(Boolean).sort((a,b)=>(a.matchStrength==="alta"?0:1)-(b.matchStrength==="alta"?0:1)||a.matchDays-b.matchDays).slice(0,limit);
}
function reconcile(existing,incoming){
 if(!existing||!incoming||existing.type!=="expense"||incoming.type!=="expense"||existing.amount!==incoming.amount)throw Error("No se puede conciliar: importes o tipos diferentes");
 const d1=dateDay(existing.date),d2=dateDay(incoming.date);
 if(d1===null||d2===null||Math.abs(d1-d2)>3)throw Error("Las fechas no son compatibles");
 if(sourceOf(incoming)==="ticket"&&Array.isArray(existing.receiptItems)&&existing.receiptItems.length)throw Error("Este gasto ya tiene productos");
 if(sourceOf(incoming)==="bank"&&sourceOf(existing)==="bank")throw Error("No se pueden vincular dos movimientos bancarios");
 const ticket=sourceOf(incoming)==="ticket"?incoming:sourceOf(existing)==="ticket"?existing:null;
 const bank=sourceOf(incoming)==="bank"?incoming:sourceOf(existing)==="bank"?existing:null;
 return {...existing,
   ...(ticket&&Array.isArray(ticket.receiptItems)?{receiptItems:ticket.receiptItems}:{}),
   ...(ticket&&bank?{importSource:"linked",bankDescription:String(bank.title||"").slice(0,90),ticketDescription:String(ticket.title||"").slice(0,90)}:{}),
   ...(sourceOf(existing)==="unknown"&&ticket?{importSource:"linked"}:{}),
   reconciledAt:new Date().toISOString(),
   reconciledSources:[...new Set([sourceOf(existing),sourceOf(incoming)])]
 };
}
root.CGReconcile={dateDay,clean,sourceOf,candidates,reconcile};
})(window);