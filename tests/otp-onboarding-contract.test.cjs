/* Budviva: contrato de alta por correo OTP, sin servicios externos ni cuentas reales. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const client=fs.readFileSync('compartidos.js','utf8');
const ui=fs.readFileSync('compartidos.html','utf8');
const loginTemplate=fs.readFileSync('backend/email-templates/codigo-acceso.html','utf8');
const signupTemplate=fs.readFileSync('backend/email-templates/confirmacion-alta.html','utf8');
const token='{{ .Token }}';

test('El acceso por código permite crear una cuenta nueva',()=>{
  assert.match(client,/async function sendCode\(email\)\s*\{[\s\S]*?request\('\/auth\/v1\/otp',[\s\S]*?create_user:true[\s\S]*?\}\s*\);\s*\}/);
});
test('La verificación usa un OTP de email y exige sesión real',()=>{
  assert.match(client,/async function verifyCode\(email,token\)/);
  assert.match(client,/\/auth\/v1\/verify/);
  assert.match(client,/type:'email'/);
  assert.match(client,/if\(!body\.access_token\|\|!body\.user\?\.id\)throw Error/);
});
test('Las plantillas de acceso y alta llevan el código OTP y no un enlace mágico',()=>{
  for(const [name,html] of [['login',loginTemplate],['alta',signupTemplate]]){
    assert(html.includes(token),name+' sin código OTP');
    assert(!html.includes('{{ .ConfirmationURL }}'),name+' usa Magic Link en vez de código');
  }
});
test('La interfaz informa sobre creación de cuentas y no exige contraseña',()=>{
  assert(ui.includes('tu cuenta se creará al verificar el código'));
  assert(ui.includes('id="send-form"'));
  assert(ui.includes('id="verify-form"'));
  assert(ui.includes('Ya tengo una contraseña de acceso'),'Debe conservar acceso legado');
});

test('Plantilla de OTP apta para acceso, alta y baja sin exponer operación incorrecta',()=>{
 assert(loginTemplate.includes('Tu código de verificación'));
 assert(loginTemplate.includes('confirmar su eliminación'));
 assert(loginTemplate.includes(token));
});
