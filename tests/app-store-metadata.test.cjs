/* Budviva: límites de metadatos comerciales Apple. No utiliza credenciales ni App Store Connect. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('docs/APP_STORE_FICHA_ES_2026.json','utf8'));
const site='https://pedrombo88.github.io/control-de-gastos/';
test('Los metadatos cumplen límites de longitud documentados por Apple',()=>{
  assert.equal(data.locale,'es-ES');
  assert.equal(data.appName,'Budviva');
  assert(data.appName.length<=30);
  assert(data.subtitle.length<=30);
  assert(data.promotionalText.length<=170);
  assert(Buffer.byteLength(data.keywords,'utf8')<=100);
  assert(data.description.length<=4000);
});
test('Los enlaces de soporte y privacidad son HTTPS y apuntan a las páginas existentes',()=>{
  const refs=[
    [data.supportURL,'soporte.html'],
    [data.privacyPolicyURL,'privacidad.html'],
    [data.privacyChoicesURL,'datos-y-privacidad.html'],
    [data.marketingURL,'']
  ];
  for(const [uri,path] of refs){
    const url=new URL(uri);
    assert.equal(url.origin,'https://pedrombo88.github.io');
    assert.equal(url.href,site+path);
    if(path)assert(fs.existsSync(path),path+' no existe');
  }
});
test('La ficha no promete funciones inexistentes ni almacena accesos a cuentas de prueba',()=>{
  assert(!/sincroniza automáticamente con otras personas/i.test(data.description) || data.description.includes('No se sincronizan automáticamente'));
  assert.match(data.description,/Safari integrada en la app/);
  assert.match(data.description,/cuenta independiente/);
  assert.match(data.description,/no realiza operaciones bancarias/i);
  const raw=JSON.stringify(data);
  assert(!/sb_secret_|service_role|sk_live_|Bearer\s+eyJ/.test(raw));
  assert.equal(data.availability,'DRAFT_NOT_PUBLISHED');
});
test('Las notas de revisión explican autenticación OTP y cuentas de prueba de forma responsable',()=>{
 assert(data.storeReview.note.includes('contraseña'));
 assert(data.storeReview.credentials.includes('App Store Connect'));
 assert(data.blockers.some(x=>x.includes('Apple Developer')));
});
