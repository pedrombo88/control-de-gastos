/* Check de liberación sin dependencias externas. */
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const files=["recurring.js","stats.js","reconcile.js","smart-import.js","documents.js","backup-crypto.js","goals.js","savings.js","sw.js"];
for(const f of files) new vm.Script(fs.readFileSync(f,"utf8"),{filename:f});
const html=fs.readFileSync("index.html","utf8");
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
for(const [i,src] of inline.entries())new vm.Script(src,{filename:"index.html:inline:"+i});
const nav=[...html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0].matchAll(/data-tab="([^"]+)"/g)||[]].map(x=>x[1]);
assert.deepEqual(nav,["home","transactions","budgets","savings","settings"]);
for(const ref of ["documents.js","backup-crypto.js","smart-import.js","stats.js"])assert(html.includes('src="'+ref+'"'),"Script missing "+ref);
assert(html.includes("saldo-diario-data-v1"),"Legacy storage key must be kept");
assert(html.includes("data-saving-view=\"analysis\""),"Savings analysis panel missing");
assert(html.includes("data-saving-view=\"goals\""),"Savings goals panel missing");
assert(html.includes("sourceDocumentIds"),"Original document references missing");
assert(html.includes("backup-password-form"),"Encrypted backup form missing");
assert(!html.includes("Cargar datos de demostración"),"Destructive demo button must not appear");
const manifest=JSON.parse(fs.readFileSync("manifest.webmanifest","utf8"));
assert.equal(manifest.id,"./");assert.equal(manifest.short_name,"Budviva");
for(const page of ["privacidad.html","soporte.html"])assert(fs.readFileSync(page,"utf8").includes("<html lang=\"es\">"),page+" must exist");
console.log("✅ Budviva Web audit: 5 navigation tabs, JS syntax, source documents, privacy and data compatibility");

const crypto=require("node:crypto");
const vendorManifest=JSON.parse(fs.readFileSync("vendor/manifest.json","utf8"));
assert.equal(vendorManifest.versions["pdfjs-dist"],"6.5.438");
assert.equal(vendorManifest.versions["tesseract.js"],"5.1.1");
for(const entry of vendorManifest.assets){
 const bytes=fs.readFileSync("vendor/"+entry.name);
 assert.equal(bytes.length,entry.size,entry.name+" size");
 assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),entry.sha256,entry.name+" sha256");
}
const importSrc=fs.readFileSync("smart-import.js","utf8");
assert(!/https?:\/\/(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/.test(importSrc),"No external OCR/PDF scripts");
assert(importSrc.includes("pdf/pdf.mjs")&&importSrc.includes("ocr/worker.min.js"));
console.log("✅ Local OCR/PDF assets passed SHA-256 checks");
