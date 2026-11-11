const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const index=fs.readFileSync('index.html','utf8');
const shared=fs.readFileSync('compartidos.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('CSS del rediseño referenciado después de estilos existentes',()=>{
 assert.match(index,/<\/style>\s*<link rel="stylesheet" href="\.\/budviva-visual\.css\?v=6\.9\.10-ui1">/);
 assert.match(shared,/<\/style><link rel="stylesheet" href="\.\/compartidos-visual\.css\?v=6\.9\.10-ui1">/);
 assert(fs.statSync('budviva-visual.css').size>2000);
 assert(fs.statSync('compartidos-visual.css').size>1000);
});
test('Las dos hojas permanecen disponibles sin conexión',()=>{
 assert(sw.includes("CACHE_PREFIX + '6.9.10'"));
 assert(sw.includes("'./budviva-visual.css'"));
 assert(sw.includes("'./compartidos-visual.css'"));
});
