/* Budviva — canal privado de soporte (beta).
 * Mantener deshabilitado hasta verificar la recepción del alias de dominio.
 * NO incluir aquí el buzón personal de destino de Cloudflare.
 * Activación: consultar docs/CONFIGURAR_SOPORTE_PRIVADO.md.
 */
(()=>{
'use strict';
const verified=false;
const address='';
const link=document.getElementById('private-support-link');
const state=document.getElementById('private-support-state');
if(!link||!state)return;
if(verified&&/^[a-z0-9._%+-]+@budviva\.com$/i.test(address)){
  link.href='mailto:'+address+'?subject='+encodeURIComponent('Consulta privada · Budviva');
  link.hidden=false;
  state.textContent='Puedes escribir al equipo de Budviva por correo privado. No adjuntes contraseñas, códigos OTP ni datos bancarios completos.';
}else{
  link.removeAttribute('href');
  link.hidden=true;
  state.textContent='Estamos preparando el contacto privado. Todavía no hay un buzón de soporte verificado. Para incidencias generales sin datos personales puedes utilizar GitHub Issues.';
}
})();
