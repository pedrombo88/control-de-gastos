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
test('La beta no anuncia un buzón privado sin verificación de entrega',()=>{
  assert.match(script,/const verified=false;/);
  assert.match(script,/const address='';/);
  assert(support.includes('id="private-support-link"'));
  const actual=run(script);
  assert.equal(actual.link.hidden,true);
  assert.equal(actual.link.href,'');
  assert.match(actual.state.textContent,/Todavía no hay un buzón/);
});
test('Solo un alias verificado del dominio Budviva habilita el contacto',()=>{
  const hypothetical=script.replace('const verified=false;','const verified=true;')
    .replace("const address='';","const address='soporte@budviva.com';");
  const value=run(hypothetical);
  assert.equal(value.link.hidden,false);
  assert.match(value.link.href,/^mailto:soporte@budviva\.com\?subject=/);
  assert.match(value.state.textContent,/correo privado/);
});
test('Se bloquean direcciones arbitrarias y cuentas sin confirmación',()=>{
  const unverified=script.replace("const address='';","const address='soporte@budviva.com';");
  assert.equal(run(unverified).link.hidden,true);
  const foreign=script.replace('const verified=false;','const verified=true;')
    .replace("const address='';","const address='inbox@example.com';");
  assert.equal(run(foreign).link.hidden,true);
  const unsafe=script.replace('const verified=false;','const verified=true;')
    .replace("const address='';","const address='test@budviva.com?subject=spam';");
  assert.equal(run(unsafe).link.hidden,true);
});
test('Los mensajes no se envían a ningún servicio externo desde JavaScript',()=>{
  assert(!script.includes('fetch('));
  assert(!script.includes('XMLHttpRequest'));
  assert(!script.includes('localStorage'));
  assert(!script.includes('sessionStorage'));
  assert(!script.includes('service_role'));
});
