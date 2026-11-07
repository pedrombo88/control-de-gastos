/* Budviva: soporte privado visible solamente tras verificación del alias del dominio. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('support-contact.js','utf8');
const support=fs.readFileSync('soporte.html','utf8');
function run(source){
  const link={hidden:true,href:'#',removeAttribute(name){if(name==='href')this.href='';}};
  const state={textContent:''};
  const document={getElementById(id){
    return id==='private-support-link'?link:id==='private-support-state'?state:null;
  }};
  vm.runInNewContext(source,{document,encodeURIComponent},{timeout:1000});
  return {link,state};
}
test('El buzón de soporte verificado se anuncia únicamente como alias del dominio',()=>{
  assert.match(script,/const verified=true;/);
  assert.match(script,/const address='soporte@budviva.com';/);
  assert(support.includes('id="private-support-link"'));
  const result=run(script);
  assert.equal(result.link.hidden,false);
  assert.match(result.link.href,/^mailto:soporte@budviva\.com\?subject=/);
  assert.match(result.state.textContent,/correo privado/);
});
test('El soporte desactivado no muestra alias aunque esté en configuración',()=>{
  const unverified=script.replace('const verified=true;','const verified=false;');
  assert.equal(run(unverified).link.hidden,true);
});
test('No se aceptan direcciones de otros dominios ni inyección de parámetros',()=>{
  const foreign=script.replace("const address='soporte@budviva.com';","const address='inbox@example.com';");
  assert.equal(run(foreign).link.hidden,true);
  const unsafe=script.replace("const address='soporte@budviva.com';","const address='test@budviva.com?subject=spam';");
  assert.equal(run(unsafe).link.hidden,true);
});
test('Los mensajes no se envían a ningún servicio externo desde JavaScript',()=>{
  assert(!script.includes('fetch('));
  assert(!script.includes('XMLHttpRequest'));
  assert(!script.includes('localStorage'));
  assert(!script.includes('sessionStorage'));
  assert(!script.includes('service_role'));
});
