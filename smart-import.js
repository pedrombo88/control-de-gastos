/* Control de Gastos — Importador de tickets y extractos.
   Procesamiento local. Nunca se guardan archivos ni se envían a un servidor propio.
   OCR (Tesseract) y PDF.js se descargan de CDNs externos cuando se utilizan. */
(function(root){
"use strict";
const moneyToCents=s=>{
 let t=String(s||"").replace(/[\s€]/g,"").replace(/[−–]/g,"-").replace(/^\+/,"");
 const parens=/^\([\d.,]+\)$/.test(t),trailingMinus=/^[\d.,]+-$/.test(t);
 if(parens)t="-"+t.slice(1,-1);
 if(trailingMinus)t="-"+t.slice(0,-1);
 if(!/^-?[\d.,]+$/.test(t))return null;
 const comma=t.lastIndexOf(","),dot=t.lastIndexOf(".");
 if(comma>=0&&dot>=0){t=comma>dot?t.replace(/\./g,"").replace(",","."):t.replace(/,/g,"");}
 else if(comma>=0){t=/,\d{1,2}$/.test(t)?t.replace(",","."):t.replace(/,/g,"");}
 else if(dot>=0&&/\.\d{3}$/.test(t))t=t.replace(/\./g,"");
 const n=Number(t);return Number.isFinite(n)&&Math.abs(n)<=99999999?Math.round(n*100):null;
};
const isoDate=(s,fallbackYear)=>{
 const v=String(s||"").trim();
 let d,m,y;
 let a=v.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/);
 if(a){d=+a[1];m=+a[2];y=a[3]?+a[3]:fallbackYear;}
 else {a=v.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);if(!a)return null;y=+a[1];m=+a[2];d=+a[3];}
 if(y<100)y+=y>=70?1900:2000;
 if(!y||y<2000||y>2100)return null;
 const date=new Date(y,m-1,d,12);
 if(date.getFullYear()!==y||date.getMonth()+1!==m||date.getDate()!==d)return null;
 return y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
};
const patterns={
 date:/\b(?:\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?|\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})\b/,
 amount:/[+\-−]?\s*\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{2})\s*€?|[+\-−]?\s*\d+[,.]\d{2}\s*€?/
};
const guessCategory=(description,type)=>{
 if(type==="income")return /n[oó]mina|salario|empresa|pago haberes/i.test(description)?"nomina":"otros-ingresos";
 const rules=[
 ["alimentacion",/mercadona|carrefour|lidl|aldi|dia\b|eroski|alcampo|supermercado|alimentaci[oó]n|panader[ií]a|fruter[ií]a|bonarea|hipermercado/i],
 ["transporte",/repsol|cepsa|moeve|gasolinera|gas[oó]leo|combustible|autopista|parking|peaje|renfe|cabify|uber|bolt|transporte/i],
 ["hogar",/iberdrola|endesa|naturgy|electricidad|gas natural|alquiler|hipoteca|comunidad propietarios|agua|suministros|leroy merlin/i],
 ["salud",/farmacia|dentista|cl[ií]nica|m[eé]dico|hospital|salud|[oó]ptica/i],
 ["suscripciones",/netflix|spotify|disney|hbo|amazon prime|suscripci[oó]n|apple\.com\/bill/i],
 ["ocio",/cine|restaurante|bar\b|cafeter[ií]a|teatro|museo|entradas/i],
 ["educacion",/colegio|academia|universidad|escuela|libros escolares/i],
 ["compras",/zara|pull.bear|bershka|primark|ikea|decathlon|mediamarkt|tienda/i]
 ];
 return rules.find(([,rx])=>rx.test(description))?.[0]||"otros";
};

const NECESSITY=["pending","necessary","optional"];
function parseReceiptItems(text){
 const rows=[];
 const skip=/\b(?:SUBTOTAL|TOTAL|IMPORTE|A PAGAR|PAGADO|EFECTIVO|TARJETA|CAMBIO|IVA|I\.V\.A|BASE IMPONIBLE|AHORRO|DESCUENTO|FECHA|HORA|CAJERO|CLIENTE|TICKET|FACTURA|OPERACI[OÓ]N|GRACIAS|PRECIO UNITARIO|UNIDADES|ART[IÍ]CULOS|REDONDEO|DEVOLUCI[OÓ]N|NIF|CIF|N[ÚU]MERO|SUMA|SALDO|C[OÓ]DIGO QR)\b/i;
 for(const raw of String(text||"").split(/\r?\n/)){
  const line=raw.replace(/\s+/g," ").trim();
  if(!line||skip.test(line))continue;
  // Solo líneas que terminan en importe con dos decimales; nunca inventar productos.
  const match=line.match(/^(.{2,90}?)\s+(-?\d{1,6}[.,]\d{2})\s*€?$/);
  if(!match)continue;
  const amount=moneyToCents(match[2]);
  if(!Number.isSafeInteger(amount)||amount<=0||amount>99999999)continue;
  let name=match[1].replace(/^\s*\d+\s*[xX*]\s*/,"").trim();
  // Algunos tickets incluyen códigos EAN o el precio unitario antes del nombre.
  name=name.replace(/^\d{8,14}\s+/,"").replace(/\s+\d+[xX*]\s*[\d.,]+$/,"").trim();
  if(!/[A-Za-zÁÉÍÓÚáéíóúÑñ]{2}/.test(name)||skip.test(name))continue;
  rows.push({id:"p-"+rows.length,name:name.slice(0,90),amount,quantity:1,necessity:"pending"});
  if(rows.length>=120)break;
 }
 return rows;
}
function receiptSummary(items,total){
 let necessary=0,optional=0,pending=0;
 for(const i of (Array.isArray(items)?items:[])){
  if(!i||!Number.isSafeInteger(i.amount)||i.amount<=0)continue;
  if(i.necessity==="necessary")necessary+=i.amount;
  else if(i.necessity==="optional")optional+=i.amount;
  else pending+=i.amount;
 }
 return {necessary,optional,pending,itemsTotal:necessary+optional+pending,difference:total-necessary-optional-pending};
}
function parseReceipt(text,now){
 const lines=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const year=+(now||new Date().toISOString().slice(0,10)).slice(0,4);
 const candidates=lines.filter(x=>/\b(?:TOTAL(?:\s+A\s+PAGAR)?|IMPORTE(?:\s+TOTAL)?|PAGADO|A\s+PAGAR)\b/i.test(x)&&!/\b(?:SUBTOTAL|TOTAL\s+IVA|TOTAL\s+ART[IÍ]CULOS|AHORRO)\b/i.test(x));
 const getAmounts=line=>[...line.matchAll(new RegExp(patterns.amount.source,"g"))].map(m=>moneyToCents(m[0])).filter(v=>v!==null&&v>0);
 const totalCandidates=candidates.flatMap(x=>getAmounts(x));
 const total=totalCandidates.length?totalCandidates[totalCandidates.length-1]:null;
 const dateMatches=lines.flatMap(x=>[...x.matchAll(new RegExp(patterns.date.source,"g"))].map(m=>isoDate(m[0],year))).filter(Boolean);
 const merchant=lines.find(x=>/[a-záéíóúñ]{3}/i.test(x)&&!/\b(?:factura|ticket|fecha|hora|nif|cif|copia|venta|cliente|operaci[oó]n|direcci[oó]n|cajero)\b/i.test(x))||"Ticket";
 return [{date:dateMatches[0]||now||"",title:merchant.slice(0,90),amount:total,type:"expense",category:guessCategory(merchant,"expense"),note:"Importado de ticket",confidence:total?"media":"baja",items:parseReceiptItems(text)}];
}
function parseStatement(text,now){
 const year=+(now||new Date().toISOString().slice(0,10)).slice(0,4);
 const lines=String(text||"").split(/\r?\n/).map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean);
 const rows=[];
 const dateAtStart=/^(\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?|\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})\s+(.+)$/;
 for(const line of lines){
  const match=line.match(dateAtStart);if(!match)continue;
  const date=isoDate(match[1],year);if(!date)continue;
  const rest=match[2];
  const vals=[...rest.matchAll(new RegExp(patterns.amount.source,"g"))].map(m=>({raw:m[0],value:moneyToCents(m[0]),index:m.index}));
  const valid=vals.filter(x=>x.value!==null);
  if(!valid.length)continue;
  // Con columnas "importe | saldo", el saldo suele ser la última columna.
  // No se adivina el movimiento: se exige revisión.
  const hasBalance=/\bSALDO\b/i.test(lines.slice(0,12).join(" "));
  const chosen=hasBalance&&valid.length>1?valid[valid.length-2]:valid[valid.length-1];
  let amount=chosen.value;
  const prefix=rest.slice(0,chosen.index).trim().replace(/[;|]+$/,"").trim();
  const title=prefix.replace(/^[\d/\-. ]{2,12}\s+/,"").slice(0,90)||"Movimiento bancario";
  const type=amount<0?"expense":"income";
  rows.push({date,title,amount:Math.abs(amount),type,category:guessCategory(title,type),note:"Importado de extracto",confidence:"baja",raw:line});
 }
 return rows;
}
function parseCSV(text,now){
 const lines=String(text||"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<2)return [];
 const delimiter=[";","\t",","].sort((a,b)=>lines[0].split(b).length-lines[0].split(a).length)[0];
 const split=(line)=>{let out=[],cur="",quote=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quote&&line[i+1]==='"'){cur+='"';i++;}else quote=!quote;}else if(c===delimiter&&!quote){out.push(cur.trim());cur="";}else cur+=c;}out.push(cur.trim());return out;};
 const header=split(lines[0]).map(x=>x.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,""));
 const find=(words)=>header.findIndex(h=>words.some(w=>h===w||h.startsWith(w)));
 const dateI=find(["fecha","date","fvalor","fechavalor"]);
 const descI=find(["concepto","descripcion","detalle","movimiento","description","comercio"]);
 const amountI=find(["importe","amount","cantidad","valor"]);
 const debitI=find(["cargo","debe","debito","debit","salida"]);
 const creditI=find(["abono","haber","credito","credit","entrada"]);
 if(dateI<0||descI<0||(amountI<0&&(debitI<0||creditI<0)))return [];
 const year=+(now||new Date().toISOString().slice(0,10)).slice(0,4);
 const result=[];
 for(const line of lines.slice(1,2001)){
  const cols=split(line);const date=isoDate(cols[dateI],year);
  const title=String(cols[descI]||"").trim().slice(0,90);
  if(!date||!title)continue;
  let cents;
  if(amountI>=0)cents=moneyToCents(cols[amountI]);
  else {const debit=moneyToCents(cols[debitI])||0,credit=moneyToCents(cols[creditI])||0;cents=credit?Math.abs(credit):-Math.abs(debit);}
  if(cents===null||cents===0)continue;
  const type=cents<0?"expense":"income";
  result.push({date,title,amount:Math.abs(cents),type,category:guessCategory(title,type),note:"Importado de CSV",confidence:"alta"});
 }
 return result;
}
function fingerprint(item){
 return [item.date,item.type,item.amount,String(item.title||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/[^a-z0-9]/g,"").slice(0,60)].join("|");
}
function build(ctx){
 const {getData,save,render,CAT,h,money,parseMoney,isRealDate,uid,toast,localDate}=ctx;
 const state={rows:[],source:"",busy:false,raw:""};
 const fileInput=document.getElementById("smart-import-file");
 const cameraInput=document.getElementById("smart-import-camera");
 const status=document.getElementById("smart-import-status");
 const loading=message=>{state.busy=true;status.hidden=false;status.textContent=message;};
 const finish=()=>{state.busy=false;};
 const valid=(r)=>r&&["income","expense"].includes(r.type)&&isRealDate(r.date)&&Number.isSafeInteger(r.amount)&&r.amount>0&&r.amount<=9999999999&&String(r.title||"").trim()&&CAT.some(c=>c.id===r.category&&c.type===r.type);
 const escape=(s)=>h(String(s||""));
 const duplicates=()=>new Set(getData().transactions.map(fingerprint));
 const reconciliation=root.CGReconcile;
 const makeTx=r=>({id:uid(),date:r.date,title:r.title.trim().slice(0,90),amount:r.amount,type:r.type,category:r.category,method:"card",note:r.note||"",importSource:Array.isArray(r.items)?"ticket":"bank",...(Array.isArray(r.items)?{receiptItems:r.items.filter(item=>item&&String(item.name||"").trim()&&Number.isSafeInteger(item.amount)&&item.amount>0).slice(0,120).map(item=>({name:item.name.trim().slice(0,90),amount:item.amount,quantity:1,necessity:NECESSITY.includes(item.necessity)?item.necessity:"pending"}))}:{})});
 const matchFor=r=>reconciliation&&valid(r)?reconciliation.candidates({...makeTx(r),id:r.id},getData().transactions):[];
 const linkedTo=r=>matchFor(r).find(tx=>tx.id===r.linkTo)||null;
 const openFile=(camera)=>{(camera?cameraInput:fileInput).click();};
 const processText=(text,kind,source)=>{
  status.hidden=false;
  state.raw=String(text||"").slice(0,400000);
  state.source=source;
  state.rows=(kind==="ticket"?parseReceipt(state.raw,localDate()):kind==="csv"?parseCSV(state.raw,localDate()):parseStatement(state.raw,localDate())).slice(0,500).map((r,i)=>({...r,id:"import-"+i,selected:!!valid(r)&&r.confidence==="alta",allowDuplicate:false}));
  status.textContent=state.rows.length?state.rows.length+" posibles movimientos detectados. Revisa cada uno antes de guardar.":"No se han identificado movimientos. Prueba otro archivo o revisa el texto.";
  render();
 };
 const script=(url,check)=>new Promise((resolve,reject)=>{
  if(check())return resolve();
  const el=document.createElement("script");el.src=url;el.async=true;el.onload=()=>check()?resolve():reject(new Error("La librería no se ha cargado."));el.onerror=()=>reject(new Error("No se pudo descargar la librería. Comprueba la conexión."));document.head.appendChild(el);
 });
 async function recognizeImage(file){
  await script("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",()=>!!root.Tesseract?.createWorker);
  status.textContent="Leyendo imagen. Puede tardar unos segundos…";
  const worker=await root.Tesseract.createWorker("spa",1,{logger:msg=>{if(msg.status==="recognizing text")status.textContent="Reconociendo texto: "+Math.round((msg.progress||0)*100)+" %";}});
  try{const result=await worker.recognize(file);return result.data.text||"";}finally{await worker.terminate();}
 }
 async function pdfText(file){
  await script("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",()=>!!root.pdfjsLib?.getDocument);
  root.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const bytes=await file.arrayBuffer();const doc=await root.pdfjsLib.getDocument({data:bytes}).promise;
  if(doc.numPages>30)throw new Error("Por seguridad, se admiten PDF de hasta 30 páginas.");
  const pages=[];
  for(let n=1;n<=doc.numPages;n++){
   status.textContent="Leyendo página "+n+" de "+doc.numPages;
   const page=await doc.getPage(n),content=await page.getTextContent();
   // Reagrupar elementos por coordenada vertical y luego horizontal.
   const lines=new Map();
   for(const item of content.items){
    const y=Math.round(item.transform?.[5]||0),x=item.transform?.[4]||0;
    const key=[...lines.keys()].find(k=>Math.abs(k-y)<=2)??y;
    if(!lines.has(key))lines.set(key,[]);
    lines.get(key).push({x,text:item.str});
   }
   let text=[...lines.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.x-b.x).map(t=>t.text).join(" ")).join("\n");
   if(text.trim().length<25){
     if(doc.numPages>10)throw new Error("El PDF escaneado supera las 10 páginas admitidas para OCR. Divídelo en varios archivos.");
     await script("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",()=>!!root.Tesseract?.createWorker);
     const viewport=page.getViewport({scale:1.5});
     const canvas=document.createElement("canvas");
     canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
     const context=canvas.getContext("2d",{willReadFrequently:true});
     await page.render({canvasContext:context,viewport}).promise;
     status.textContent="Reconociendo página escaneada "+n+" de "+doc.numPages;
     const worker=await root.Tesseract.createWorker("spa");
     try{const result=await worker.recognize(canvas);text=result.data.text||"";}finally{await worker.terminate();canvas.width=0;canvas.height=0;}
   }
   pages.push(text);
  }
  return pages.join("\n");
 }
 async function handle(file,mode){
  if(!file||state.busy)return;
  if(file.size>15*1024*1024){status.hidden=false;status.textContent="El archivo supera el máximo de 15 MB.";return;}
  loading("Preparando "+file.name+"…");
  try{
   const type=file.type||"",name=file.name.toLowerCase();
   let text="",kind=mode==="ticket"?"ticket":"statement";
   if(type.startsWith("image/")||/\.(jpe?g|png|webp|bmp)$/i.test(name)){
    text=await recognizeImage(file);
   }else if(type==="application/pdf"||name.endsWith(".pdf")){
    text=await pdfText(file);
    if(text.trim().length<20)throw new Error("No se ha podido extraer texto legible del PDF, ni mediante OCR.");
   }else if(/\.(csv|txt)$/i.test(name)||type.includes("csv")||type==="text/plain"){
    text=await file.text();kind=name.endsWith(".csv")?"csv":kind;
   }else throw new Error("Formato no admitido. Usa JPG, PNG, PDF con texto, CSV o TXT.");
   if(!text.trim())throw new Error("No se ha encontrado texto legible.");
   processText(text,kind,file.name);
  }catch(e){status.hidden=false;status.textContent="No se pudo leer: "+e.message;state.rows=[];render();}
  finally{finish();}
 }


 function savedReceiptHTML(t){
  if(!Array.isArray(t.receiptItems))return "";
  const sum=receiptSummary(t.receiptItems,t.amount);
  const rows=t.receiptItems.map((item,j)=>{
   const opts=[["pending","Sin clasificar"],["necessary","Necesario"],["optional","No necesario"]].map(([value,label])=>'<option value="'+value+'" '+(item.necessity===value?"selected":"")+'>'+label+'</option>').join("");
   return '<div class="receipt-saved-row"><span>'+escape(item.name)+'</span><b>'+escape(money(item.amount))+'</b><select data-saved-product-necessity="'+j+'" data-saved-receipt-id="'+escape(t.id)+'" aria-label="Necesidad de '+escape(item.name)+'">'+opts+'</select></div>';
  }).join("");
  return '<section class="card receipt-saved-panel"><div class="section-heading"><h2>Productos de '+escape(t.title)+'</h2></div>'
    +'<p class="receipt-hint">Total del ticket: '+escape(money(t.amount))+'. Los productos no se suman otra vez a tus gastos.</p>'
    +rows
    +'<div class="receipt-totals"><span>Necesarios: <b>'+escape(money(sum.necessary))+'</b></span><span>No necesarios: <b>'+escape(money(sum.optional))+'</b></span><span>Sin clasificar: <b>'+escape(money(sum.pending))+'</b></span>'
    +(sum.difference?'<span class="receipt-difference">Sin desglosar: <b>'+escape(money(sum.difference))+'</b></span>':'')+'</div></section>';
 }
 function receiptItemsHTML(r,index){
  if(!Array.isArray(r.items))return "";
  const sum=receiptSummary(r.items,r.amount||0);
  const productRows=r.items.map((item,j)=>{
   const options=[["pending","Sin clasificar"],["necessary","Necesario"],["optional","No necesario"]].map(([v,label])=>'<option value="'+v+'" '+(item.necessity===v?"selected":"")+'>'+label+'</option>').join("");
   return '<div class="receipt-product-row" data-product-index="'+j+'"><input aria-label="Nombre del producto" data-receipt-field="name" maxlength="90" value="'+escape(item.name)+'"><input aria-label="Precio del producto en euros" data-receipt-field="amount" inputmode="decimal" value="'+escape((item.amount/100).toFixed(2).replace(".",","))+'"><select aria-label="Clasificar necesidad" data-receipt-field="necessity">'+options+'</select><button type="button" data-receipt-delete="'+j+'" aria-label="Eliminar producto">✕</button></div>';
  }).join("");
  return '<details class="receipt-breakdown" '+(r.items.length?"open":"")+'><summary>Productos del ticket ('+r.items.length+')</summary>'
    +'<p class="receipt-hint">Clasifica cada producto como necesario o no necesario. El balance contabiliza únicamente el total del ticket.</p>'
    +'<div class="receipt-product-list">'+productRows+'</div>'
    +'<button type="button" class="small-action" data-receipt-add="'+index+'">＋ Añadir producto</button>'
    +'<div class="receipt-totals"><span>Necesarios: <b>'+escape(money(sum.necessary))+'</b></span><span>No necesarios: <b>'+escape(money(sum.optional))+'</b></span><span>Sin clasificar: <b>'+escape(money(sum.pending))+'</b></span>'
    +(sum.difference?'<span class="receipt-difference">Diferencia sin desglosar: <b>'+escape(money(sum.difference))+'</b></span>':'')
    +'</div></details>';
 }
 function rowHTML(r,i,dupes){
  const duplicate=dupes.has(fingerprint(r));
  const isValid=valid(r);
  const matches=matchFor(r),linked=linkedTo(r);
  const duplicateDisabled=duplicate&&!r.allowDuplicate&&!linked;
  const opts=CAT.filter(c=>c.type===r.type).map(c=>'<option value="'+escape(c.id)+'" '+(c.id===r.category?"selected":"")+'>'+escape(c.name)+'</option>').join("");
  return '<article class="smart-import-row" data-import-row="'+i+'"><label class="smart-import-select"><input type="checkbox" data-import-select="'+i+'" '+(r.selected&&!duplicateDisabled&&isValid?"checked":"")+' '+(duplicateDisabled||!isValid?"disabled":"")+'><span>'+escape(r.confidence==="baja"?"Revisión necesaria":r.confidence==="alta"?"Datos estructurados":"Revisa los datos")+'</span></label>'
   +(matches.length?'<div class="smart-import-warning v5-match-warning"><strong>Posible compra ya registrada</strong><p>Si el ticket y el cargo del banco son la misma compra, vincúlalos: solo contará una vez.</p><label>Vincular con movimiento existente<select data-import-link="'+i+'"><option value="">No vincular</option>'+matches.map(tx=>'<option value="'+escape(tx.id)+'" '+(r.linkTo===tx.id?'selected':'')+'>'+escape(tx.date+' · '+tx.title+' · '+money(tx.amount)+' · '+(tx.matchStrength==="alta"?"comercio coincidente":"revisar coincidencia"))+'</option>').join("")+'</select></label></div>':"")
   +(duplicate?'<div class="smart-import-warning">Posible duplicado del historial. <label><input type="checkbox" data-import-allow-duplicate="'+i+'" '+(r.allowDuplicate?"checked":"")+'> Es una compra distinta: importar igualmente</label></div>':"")
   +'<div class="smart-import-fields"><label>Fecha<input type="date" data-import-field="date" value="'+escape(r.date)+'"></label><label>Concepto<input type="text" maxlength="90" data-import-field="title" value="'+escape(r.title)+'"></label>'
   +'<label>Importe (€)<input type="text" inputmode="decimal" data-import-field="amount" value="'+(r.amount?escape((r.amount/100).toFixed(2).replace(".",",")):"")+'" placeholder="Revisar"></label>'
   +'<label>Tipo<select data-import-field="type"><option value="expense" '+(r.type==="expense"?"selected":"")+'>Gasto</option><option value="income" '+(r.type==="income"?"selected":"")+'>Ingreso</option></select></label>'
   +'<label class="smart-import-wide">Categoría<select data-import-field="category">'+opts+'</select></label></div>'
   +(r.type==="expense"?receiptItemsHTML(r,i):"")
   +'<button type="button" class="smart-import-confirm '+(r.selected&&!duplicateDisabled?'confirmed':'')+'" data-import-confirm="'+i+'" '+(duplicateDisabled||!isValid?'disabled':'')+'>'
   +(r.selected&&!duplicateDisabled?'Movimiento seleccionado · Quitar':'Seleccionar este movimiento para guardar')+'</button></article>';
 }
 const renderPage=()=>{
  const dupes=duplicates();
  const rows=state.rows.map((r,i)=>rowHTML(r,i,dupes)).join("");
  const chosen=state.rows.filter(r=>r.selected&&valid(r)&&(!dupes.has(fingerprint(r))||r.allowDuplicate||linkedTo(r)));
  return '<div class="view-heading"><div><div class="eyebrow">LECTURA INTELIGENTE</div><h1 class="page-title">Importar movimientos</h1></div></div>'
  +'<section class="card smart-import-intro"><strong>Tickets y extractos bancarios</strong><p>Haz una foto, sube una imagen o selecciona un PDF o CSV. El sistema propone los movimientos y tú decides cuáles guardar. Revisa los cargos y abonos: algunos extractos no indican claramente el signo.</p>'
  +'<div class="smart-import-actions"><button type="button" class="primary-btn" data-import-camera>Hacer foto de ticket</button><button type="button" class="small-action" data-import-pick>Seleccionar foto, PDF o CSV</button></div>'
  +'<div class="smart-import-modes"><label><input type="radio" name="smart-import-mode" value="ticket" checked> Ticket de compra</label><label><input type="radio" name="smart-import-mode" value="statement"> Extracto bancario</label></div></section>'
  +'<p class="footnote">Las imágenes y los documentos se procesan en el iPhone. Para el reconocimiento de fotos se descarga una librería OCR externa. Los documentos no se suben a nuestros servidores. Comprueba importes y fechas: el reconocimiento automático puede equivocarse.</p>'
  +(state.rows.length?'<section class="card smart-import-review"><div class="section-heading"><h2>Revisar '+state.rows.length+' movimientos</h2></div><p class="muted">Seleccionados: <strong>'+chosen.length+'</strong>. Los duplicados sospechosos se excluyen por defecto, salvo que confirmes que son compras diferentes.</p>'+rows+'<p class="smart-import-confirm-help" role="status">'+(chosen.length?''+chosen.length+' movimiento(s) confirmado(s).':'Revisa los datos y pulsa «Seleccionar este movimiento para guardar» debajo del desglose.')+'</p><button type="button" class="primary-btn smart-import-save" data-import-save '+(chosen.length?"":"disabled")+'>Guardar '+chosen.length+' movimientos</button></section>':'<section class="card smart-import-empty"><strong>Tu importación aparecerá aquí</strong><p>Los tickets suelen crear un gasto por el total. Los extractos pueden contener varios movimientos.</p></section>');
 };
 const updateRow=(target)=>{
  const row=target.closest("[data-import-row]");if(!row)return;
  const i=Number(row.dataset.importRow),r=state.rows[i];if(!r)return;
  const field=target.dataset.importField;
  if(target.hasAttribute("data-import-select"))r.selected=target.checked;
  else if(field==="amount")r.amount=parseMoney(target.value);
  else if(field==="type"){r.type=target.value;r.category=r.type==="expense"?"otros":"otros-ingresos";}
  else if(field)r[field]=target.value;
  if(field==="type"||field==="date"||field==="title"||field==="amount")render();
 };

 function updateProduct(target){
  const row=target.closest("[data-import-row]"),prod=target.closest("[data-product-index]");
  if(!row||!prod)return;
  const r=state.rows[Number(row.dataset.importRow)],i=Number(prod.dataset.productIndex);
  if(!r||!Array.isArray(r.items)||!r.items[i])return;
  const field=target.dataset.receiptField;
  if(field==="name")r.items[i].name=target.value.slice(0,90);
  if(field==="amount"){const cents=parseMoney(target.value);if(cents)r.items[i].amount=cents;}
  if(field==="necessity"&&NECESSITY.includes(target.value))r.items[i].necessity=target.value;
  // No repintar el campo mientras se escribe: se actualiza al salir del control.
  if(field==="necessity"||field==="amount")render();
 }
 function saveSelected(){
  const data=getData(),dupes=duplicates(),batch=new Set(),newTx=[],updates=[],usedLinks=new Set();
  for(const r of state.rows){
   if(!r.selected||!valid(r))continue;
   const key=fingerprint(r),linked=linkedTo(r);
   if(linked){
    if(usedLinks.has(linked.id)){toast("Dos movimientos intentan vincularse al mismo gasto. Revísalos.");return;}
    usedLinks.add(linked.id);
    try{updates.push({id:linked.id,tx:reconciliation.reconcile(linked,makeTx(r))});}
    catch(error){toast(error.message);return;}
    continue;
   }
   if((dupes.has(key)||batch.has(key))&&!r.allowDuplicate)continue;
   batch.add(key);newTx.push(makeTx(r));
  }
  if(!newTx.length&&!updates.length){toast("No hay movimientos nuevos válidos para guardar");return;}
  const old=data.transactions;
  data.transactions=[...old.map(tx=>updates.find(u=>u.id===tx.id)?.tx||tx),...newTx];
  if(!save()){data.transactions=old;return;}
  state.rows=[];state.raw="";status.hidden=false;status.textContent=newTx.length+" movimientos nuevos y "+updates.length+" vinculados a gastos existentes.";
  toast(newTx.length+" nuevos · "+updates.length+" conciliados");render();
 }
 document.addEventListener("click",e=>{
  if(e.target.closest("[data-import-camera]")){openFile(true);return;}
  if(e.target.closest("[data-import-pick]")){openFile(false);return;}
  const confirmation=e.target.closest("[data-import-confirm]");
  if(confirmation){
    const index=Number(confirmation.dataset.importConfirm),row=state.rows[index];
    if(!row||!valid(row))return;
    if(duplicates().has(fingerprint(row))&&!row.allowDuplicate&&!linkedTo(row)){toast("Posible duplicado: confirma antes que es un gasto distinto.");return;}
    row.selected=!row.selected;
    render();
    return;
  }
  if(e.target.closest("[data-import-save]")){saveSelected();return;}
  const add=e.target.closest("[data-receipt-add]");
  if(add){const r=state.rows[Number(add.dataset.receiptAdd)];if(r&&Array.isArray(r.items)){r.items.push({id:"p-"+uid(),name:"Nuevo producto",amount:1,quantity:1,necessity:"pending"});render();}return;}
  const del=e.target.closest("[data-receipt-delete]");
  if(del){const row=del.closest("[data-import-row]");const r=state.rows[Number(row?.dataset.importRow)];if(r&&Array.isArray(r.items)){r.items.splice(Number(del.dataset.receiptDelete),1);render();}return;}
 });
 document.addEventListener("change",e=>{
  if(e.target===fileInput||e.target===cameraInput){
   const mode=document.querySelector('input[name="smart-import-mode"]:checked')?.value||"ticket";
   handle(e.target.files?.[0],mode);e.target.value="";return;
  }
  if(e.target.matches("[data-import-link]")){
   const row=state.rows[Number(e.target.dataset.importLink)];
   if(!row)return;
   row.linkTo=e.target.value||null;
   if(row.linkTo)row.selected=true;
   render();return;
  }
  if(e.target.matches("[data-import-select]")){
   const row=state.rows[Number(e.target.dataset.importSelect)];
   if(!row)return;
   row.selected=e.target.checked;render();return;
  }
  if(e.target.matches("[data-import-allow-duplicate]")){
   const row=state.rows[Number(e.target.dataset.importAllowDuplicate)];
   if(!row)return;
   row.allowDuplicate=e.target.checked;
   if(!row.allowDuplicate)row.selected=false;
   render();return;
  }
  if(e.target.matches("[data-saved-product-necessity]")){
   const tx=getData().transactions.find(t=>t.id===e.target.dataset.savedReceiptId);
   const item=tx?.receiptItems?.[Number(e.target.dataset.savedProductNecessity)];
   if(!item||!NECESSITY.includes(e.target.value))return;
   const prev=item.necessity;item.necessity=e.target.value;
   if(!save()){item.necessity=prev;return;}
   render();toast("Producto clasificado");return;
  }
  if(e.target.closest("[data-product-index]")&&e.target.dataset.receiptField){updateProduct(e.target);return;}
  if(e.target.closest("[data-import-row]"))updateRow(e.target);
 });
 return {renderPage,renderSavedReceipt:savedReceiptHTML,handle,parseReceipt,parseStatement,parseCSV};
}
root.CGSmartImport={moneyToCents,isoDate,parseReceipt,parseReceiptItems,receiptSummary,parseStatement,parseCSV,fingerprint,guessCategory,build};
})(window);