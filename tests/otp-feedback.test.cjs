'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('compartidos.js','utf8');

test('La solicitud de OTP conserva las indicaciones al usuario',()=>{
  const wrapper=src.match(/function onSubmit\(id,fn\)\{[\s\S]*?\n\}\n?onSubmit\('send-form'/);
  assert(wrapper,'Controlador de envío no encontrado');
  assert.match(wrapper[0],/outcome!=='keep-status'/);
  const request=src.match(/onSubmit\('send-form',async\(\)=>\{[\s\S]*?\n\}\);/);
  assert(request,'Formulario de OTP no encontrado');
  assert.match(request[0],/return 'keep-status';/);
  assert.match(request[0],/Revisa tu correo e introduce el código recibido/);
});
