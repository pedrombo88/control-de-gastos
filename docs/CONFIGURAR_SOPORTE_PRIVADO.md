# Budviva — Activación de soporte privado con Cloudflare

**Estado:** preparado para configurar; **NO activado ni verificado** a 7 de noviembre de 2026.  
**Objetivo:** recibir mensajes privados de clientes de Budviva a través del dominio propio `budviva.com`, sin pagar otro buzón, manteniendo el envío OTP de Supabase + Resend.

## Arquitectura

- **Salida de códigos de acceso:** Supabase Auth → SMTP Resend → `no-reply@budviva.com`. No modificar esta configuración, que ya se probó.
- **Entrada de consultas privadas:** dirección del dominio elegida, por ejemplo `soporte@budviva.com` → Cloudflare Email Routing → **buzón real de destino elegido por el titular** y verificado en Cloudflare.
- **Interfaz pública:** `soporte.html` muestra la opción privada únicamente después de verificarla y activar `support-contact.js`. Nunca se publica el buzón de destino.
- Cloudflare Email Routing **reenvía correos entrantes**. No es un buzón de envío: para responder como `@budviva.com` hay que configurar separadamente envío legítimo o una identidad de salida verificada. No prometer respuestas desde el alias hasta probarlo.

## Configuración mínima sin compartir cuentas ni contraseñas con terceros

1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com/) con tu cuenta propietaria de `budviva.com`.
2. Revisa **DNS → Records** antes de tocar nada. Identifica los MX y SPF del dominio raíz, y los registros del subdominio que usa Resend para envío. **No borres ni sobrescribas registros de Resend.**
3. Abre **Compute → Email Service → Email Routing**. Si el panel ofrece una ruta de menú distinta, localiza «Email Routing» del dominio. Activa/onboard el dominio solo después de comprobar los registros que Cloudflare propone. Cloudflare Routing necesita MX del dominio raíz; un proveedor de entrada que ya use esos MX podría entrar en conflicto.
4. En **Destination addresses**, añade tu dirección de recepción privada **directamente en Cloudflare**. Debes abrir el mensaje de verificación y validar el destino. No hace falta comunicar al asistente el correo personal que recibe el reenvío.
5. Crea una regla de reenvío para el alias de soporte de `budviva.com`, dirigida a ese destino verificado. No actives reglas catch-all salvo una necesidad concreta. Una regla explícita permite separar consultas de soporte de otros correos.
6. Verifica que los registros **MX/SPF/DKIM/DMARC** correctos queden activos y sin SPF duplicado en el mismo host. No añadas un segundo TXT `v=spf1` en `@`; adapta el registro existente según la configuración real de envío y las indicaciones oficiales.
7. Envía un mensaje de prueba **desde una cuenta externa diferente del destino** al alias y comprueba que llega. Responde desde la cuenta de recepción para comprobar la dirección visible al usuario; si quieres responder como `@budviva.com`, configura antes una identidad de salida legítima.
8. Pide un **nuevo código OTP de Budviva** a una cuenta desechable para asegurarte de que el servicio Resend sigue enviando tras los cambios DNS.
9. Solo si los pasos anteriores salen bien: edita `support-contact.js` poniendo `const verified=true` y `const address='soporte@budviva.com'` (o el alias verificado, siempre en `budviva.com`). La web mostrará un enlace de correo privado y mantendrá oculto el buzón de destino. Enviar a GitHub, esperar el despliegue y comprobar el enlace desde iPhone y escritorio.
10. Actualiza la política `privacidad.html` con el canal de contacto ya verificado y, **antes de comercializar**, los datos reales del responsable y texto jurídico revisado.

**No hagas pruebas con códigos OTP, extractos ni copias de seguridad en el correo del soporte.** Usa un mensaje ficticio sin información privada.

## Lista de comprobación para validar el servicio

- [ ] Destinatario privado de Cloudflare confirmado
- [ ] Dirección de soporte del dominio creada
- [ ] Registros DNS revisados sin afectar a los OTP de Resend
- [ ] Correo externo recibido en el destino
- [ ] Posibilidad de responder probada (anotar dirección del remitente real)
- [ ] Nueva prueba de correo OTP satisfactoria
- [ ] `support-contact.js` activado solo después de todas las pruebas
- [ ] Enlace de soporte privado visible en la web y en iPhone
- [ ] Política de privacidad y responsables legales actualizados

## Recursos oficiales de Cloudflare

- Enrutamiento: https://developers.cloudflare.com/email-service/get-started/route-emails/
- Reglas y destinos verificados: https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/
- Problemas con MX existentes: https://developers.cloudflare.com/email-service/reference/troubleshooting/
- Configuración de registros DNS de correo: https://developers.cloudflare.com/dns/manage-dns-records/how-to/email-records/

## Límites de esta fase

No hay acceso conectado a la zona DNS de Cloudflare desde esta sesión. La activación requiere acción del titular desde el panel y verificar físicamente que el buzón recibe correo. No se ha creado un alias real ni publicado una dirección no verificada.
