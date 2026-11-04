"use strict";
// Build reproducible, same-origin OCR/PDF assets from pinned NPM packages.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const tmp=path.join(process.cwd(),".vendor-tmp","node_modules");
const out=path.join(process.cwd(),"vendor");
const src=(...p)=>path.join(tmp,...p);
const dest=(...p)=>path.join(out,...p);
function copy(from,to){
 if(!fs.existsSync(from))throw Error("Missing build resource: "+from);
 fs.mkdirSync(path.dirname(to),{recursive:true});
 fs.copyFileSync(from,to);
 return {name:path.relative(out,to).replaceAll(path.sep,"/"),
   size:fs.statSync(to).size,
   sha256:crypto.createHash("sha256").update(fs.readFileSync(to)).digest("hex")};
}
const assets=[
 copy(src("tesseract.js","dist","tesseract.min.js"),dest("ocr","tesseract.min.js")),
 copy(src("tesseract.js","dist","worker.min.js"),dest("ocr","worker.min.js")),
 copy(src("pdfjs-dist","legacy","build","pdf.mjs"),dest("pdf","pdf.mjs")),
 copy(src("pdfjs-dist","legacy","build","pdf.worker.mjs"),dest("pdf","pdf.worker.mjs")),
 copy(src("@tesseract.js-data","spa","4.0.0_best_int","spa.traineddata.gz"),dest("lang","spa.traineddata.gz"))
];
const core=src("tesseract.js-core");
const coreFiles=fs.readdirSync(core).filter(n=>/^tesseract-core.*\.(wasm|js)$/.test(n));
if(coreFiles.length<8)throw Error("Missing Tesseract WASM variants: "+coreFiles.join(","));
for(const name of coreFiles)assets.push(copy(path.join(core,name),dest("core",name)));
const notes=[
 "# Bibliotecas OCR/PDF empaquetadas localmente",
 "",
 "Versiones fijadas: tesseract.js 5.1.1, tesseract.js-core 5.0.0,",
 "@tesseract.js-data/spa 1.0.0, pdfjs-dist 6.5.438.",
 "No activar estas bibliotecas antes de comprobar la carga en Safari.",
 ""
];
for(const [dir,tag] of [["tesseract.js","tesseract.js"],["tesseract.js-core","tesseract.js-core"],["pdfjs-dist","pdfjs-dist"]]){
 const license=["LICENSE","LICENSE.md","LICENSE.txt"].map(n=>src(dir,n)).find(file=>fs.existsSync(file));
 if(license)assets.push(copy(license,dest("licenses",tag+".txt")));
 else notes.push("Pendiente comprobar la licencia de "+tag+".");
}
fs.writeFileSync(dest("NOTICE.md"),notes.join("\n"));
fs.writeFileSync(dest("manifest.json"),JSON.stringify({
 versions:{"tesseract.js":"5.1.1","tesseract.js-core":"5.0.0",
 "pdfjs-dist":"6.5.438","spa":"1.0.0"},
 assets,generatedBy:"tools/build-vendor.cjs"
},null,2)+"\n");
console.log("Prepared",assets.length,"vendor files with SHA-256 and notices");
