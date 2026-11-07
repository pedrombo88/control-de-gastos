/* Budviva: gate preventivo para no publicar secretos en GitHub Pages.
 * Analiza los recursos que la PWA entrega al navegador.
 * No intenta leer claves privadas ni requiere credenciales. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const PUBLIC_FILES=[
  'index.html','compartidos.html','privacidad.html','soporte.html','datos-y-privacidad.html',
  'recurring.js','stats.js','reconcile.js','smart-import.js',
  'documents.js','backup-crypto.js','sw.js','shared-expenses.js',
  'compartidos.js','shared-config.js','manifest.webmanifest'
];
const forbiddenPatterns=[
  {name:'Supabase service_role JWT',rx:/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,verify:(token)=>{
    try{
      const body=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      return JSON.parse(Buffer.from(body,'base64').toString('utf8')).role==='service_role';
    }catch{return false;}
  }},
  {name:'Supabase secret key',rx:/sb_secret_[A-Za-z0-9_-]{12,}/g},
  {name:'GitHub personal access token',rx:/gh[pousr]_[A-Za-z0-9_]{30,}/g},
  {name:'GitHub fine-grained token',rx:/github_pat_[A-Za-z0-9_]{20,}/g},
  {name:'Stripe secret key',rx:/sk_(?:live|test)_[A-Za-z0-9]{16,}/g},
  {name:'AWS access key ID',rx:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g},
  {name:'PEM private key',rx:/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g}
];

function findSecrets(source){
  const findings=[];
  for(const {name,rx,verify} of forbiddenPatterns){
    for(const match of source.matchAll(rx)){
      if(!verify||verify(match[0])) findings.push({name,index:match.index});
    }
  }
  return findings;
}

test('Detector reconoce secretos reales y no confunde claves públicas',()=>{
  const payload=Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url');
  assert(findSecrets('eyJhbGciOiJIUzI1NiJ9.'+payload+'.firma').some(x=>x.name==='Supabase service_role JWT'));
  assert(findSecrets('sb_secret_'+'A'.repeat(24)).length>0);
  assert.equal(findSecrets('sb_publishable_'+'A'.repeat(24)).length,0);
  assert.equal(findSecrets('const SUPABASE_SERVICE_ROLE_KEY = "not used in browser";').length,0);
});

for(const file of PUBLIC_FILES){
  test('Sin credenciales privadas publicadas: '+file,()=>{
    const source=fs.readFileSync(path.join(ROOT,file),'utf8');
    const findings=findSecrets(source);
    assert.deepEqual(findings,[],file+': posible secreto privado expuesto ('+findings.map(x=>x.name).join(', ')+')');
  });
}

test('La configuración de Compartidos emplea exclusivamente clave publicable',()=>{
  const source=fs.readFileSync(path.join(ROOT,'shared-config.js'),'utf8');
  assert.match(source,/publishableKey/);
  assert.match(source,/sb_publishable_/);
  assert.doesNotMatch(source,/sb_secret_/);
});
