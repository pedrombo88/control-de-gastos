/* Budviva: documentos originales locales — IndexedDB, sin subir archivos. */
(function(root){
"use strict";
const DB_NAME="budviva-originales-v1", STORE="documents", VERSION=1;
const MAX_FILE=15*1024*1024,MAX_BACKUP=75*1024*1024;
const MIMES=["image/jpeg","image/png","image/webp","image/bmp","application/pdf","text/csv","text/plain","application/vnd.ms-excel"];
const extOK=/\.(?:jpe?g|png|webp|bmp|pdf|csv|txt)$/i;
function opening(){
 return new Promise((resolve,reject)=>{
   if(!("indexedDB" in root))return reject(new Error("Este navegador no permite almacenar documentos."));
   const req=indexedDB.open(DB_NAME,VERSION);
   req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const os=db.createObjectStore(STORE,{keyPath:"id"});os.createIndex("byTransaction","transactionIds",{multiEntry:true});}};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error("No se pudo abrir el almacén de documentos."));
   req.onblocked=()=>reject(Error("Cierra otras ventanas de Budviva para actualizar el almacén."));
 });
}
async function query(mode,fn){
 const db=await opening();
 return new Promise((resolve,reject)=>{
   let settled=false;const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
   let output;
   try{output=fn(store,tx);}catch(error){db.close();reject(error);return;}
   tx.oncomplete=()=>{db.close();if(!settled)resolve(output)};
   tx.onerror=()=>{db.close();if(!settled){settled=true;reject(tx.error||Error("No se pudo guardar el documento."));}};
   tx.onabort=()=>{db.close();if(!settled){settled=true;reject(tx.error||Error("Se canceló la operación de documentos."));}};
 });
}
async function getAll(){
 const db=await opening();
 return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).getAll();
   req.onsuccess=()=>{db.close();resolve(req.result||[])};
   req.onerror=()=>{db.close();reject(req.error||Error("No se pudieron leer los documentos."));};
 });
}
async function get(id){
 const db=await opening();
 return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).get(id);
   req.onsuccess=()=>{db.close();resolve(req.result||null)};
   req.onerror=()=>{db.close();reject(req.error||Error("Documento inaccesible."));};
 });
}
async function listForTransaction(id){
 const docs=await getAll();
 return docs.filter(d=>Array.isArray(d.transactionIds)&&d.transactionIds.includes(id))
            .map(d=>({id:d.id,name:d.name,type:d.type,size:d.size,createdAt:d.createdAt}));
}
function validFile(file){
 if(!file||typeof file.name!=="string"||!(file instanceof Blob)||file.size<1||file.size>MAX_FILE)throw Error("Archivo no válido o mayor de 15 MB.");
 const type=String(file.type||"").toLowerCase();
 if(!extOK.test(file.name)||type&&!(MIMES.includes(type)||type.startsWith("image/")))throw Error("Formato original no admitido.");
}
function record(file,ids){
 validFile(file);
 const id=(root.crypto?.randomUUID?.()||"doc-"+Date.now()+"-"+Math.random().toString(36).slice(2));
 return {id,name:file.name.slice(0,160),type:String(file.type||"application/octet-stream").slice(0,100),size:file.size,
   createdAt:new Date().toISOString(),transactionIds:[...new Set(ids.filter(x=>typeof x==="string"&&x.length>0&&x.length<100))],blob:file};
}
async function saveFile(file,transactionIds){
 const r=record(file,transactionIds);
 await query("readwrite",store=>{store.add(r);});
 return r.id;
}
async function remove(id){
 await query("readwrite",store=>store.delete(id));
}
async function clear(){
 await query("readwrite",store=>store.clear());
}
async function base64Of(blob){
 return new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
   reader.onerror=()=>reject(Error("No se pudo incluir un documento en la copia."));
   reader.readAsDataURL(blob);
 });
}
function bytesFromBase64(value){
 if(typeof value!=="string"||!/^[a-zA-Z0-9+/]*={0,2}$/.test(value)||value.length>MAX_FILE*4/3+16)throw Error("Datos de documento corruptos.");
 const decoded=atob(value);
 const out=new Uint8Array(decoded.length);for(let i=0;i<decoded.length;i++)out[i]=decoded.charCodeAt(i);
 return out;
}
async function exportBundle(){
 const docs=await getAll();
 const total=docs.reduce((n,d)=>n+d.size,0);
 if(total>MAX_BACKUP)throw Error("Los originales superan 75 MB. Reduce los documentos guardados antes de exportar.");
 const out=[];
 for(const d of docs){
   if(!(d.blob instanceof Blob)||d.size!==d.blob.size)throw Error("Un documento guardado está dañado. No se puede crear una copia incompleta.");
   out.push({id:d.id,name:d.name,type:d.type,size:d.size,createdAt:d.createdAt,transactionIds:d.transactionIds,base64:await base64Of(d.blob)});
 }
 return out;
}
function decodeBundle(bundle){
 if(!Array.isArray(bundle)||bundle.length>200)throw Error("El archivo incluye demasiados documentos.");
 const ids=new Set();let bytes=0;
 return bundle.map(d=>{
   if(!d||typeof d.id!=="string"||!d.id||d.id.length>150||ids.has(d.id)||typeof d.name!=="string"||d.name.length>160||
      typeof d.type!=="string"||d.type.length>100||!Number.isSafeInteger(d.size)||d.size<1||d.size>MAX_FILE||
      !Array.isArray(d.transactionIds)||d.transactionIds.length>500||d.transactionIds.some(x=>typeof x!=="string"||x.length>100))throw Error("Metadatos de documento no válidos.");
   ids.add(d.id);
   const bytesData=bytesFromBase64(d.base64);if(bytesData.length!==d.size)throw Error("El tamaño de un documento no coincide con su copia.");
   bytes+=d.size;if(bytes>MAX_BACKUP)throw Error("La copia excede el límite de documentos (75 MB).");
   return {id:d.id,name:d.name,type:d.type,size:d.size,createdAt:String(d.createdAt||""),transactionIds:[...new Set(d.transactionIds)],blob:new Blob([bytesData],{type:d.type})};
 });
}
async function replaceAll(records){
 if(!Array.isArray(records))throw Error("Documentos no válidos.");
 await query("readwrite",store=>{store.clear();for(const r of records)store.add(r);});
}
async function sizeInfo(){
 const docs=await getAll();return {count:docs.length,totalBytes:docs.reduce((n,d)=>n+d.size,0)};
}
root.BudvivaDocuments={saveFile,remove,clear,get,getAll,listForTransaction,exportBundle,decodeBundle,replaceAll,sizeInfo,MAX_FILE,MAX_BACKUP};
})(window);
