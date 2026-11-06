# Configuración del correo de acceso y baja — Budviva

**Estado (6 de noviembre de 2026):** el flujo de OTP de Budviva 6.9.8 y la Edge Function `bv-delete-account` v6 están implementados. **No se ha verificado aún el envío real de correos**. El proyecto Supabase usa el plan Free. No se han contratado proveedores ni utilizado cuentas de producción para probar bajas.

## Proveedor recomendado: Resend (preparado el 6/11/2026)

Plan gratuito de Resend: **3.000 mensajes al mes, máximo 100 al día**, sujeto a las condiciones actuales. Requiere un **dominio propio verificado** para enviar correo a destinatarios externos. No confundir Resend gratuito con un dominio gratuito.

**Ruta simplificada:** proyecto Supabase Budviva → Integrations → Resend → conectar cuenta; la integración oficial de Supabase puede configurar automáticamente las credenciales SMTP. Otra opción es configurar SMTP manualmente en Authentication → Emails → SMTP Settings.

**Valores manuales de Resend** (no poner claves privadas en GitHub):
- SMTP host: `smtp.resend.com`.
- Puerto: `587` (STARTTLS).
- Usuario: `resend`.
- Contraseña: clave API creada en la cuenta Resend, configurada únicamente en Supabase.
- Remitente: `no-reply@TU-DOMINIO-VERIFICADO` (dirección de ejemplo; sustituir por un dominio realmente verificado).
- Nombre del remitente: `Budviva`.

**Plantilla preparada para Supabase:** [codigo-acceso.html](../backend/email-templates/codigo-acceso.html). Copiar su contenido en **Magic Link/OTP** y revisar también **Confirm sign up**, conservando la variable `{{ .Token }}` para el código de acceso; no es un archivo que Supabase cargue automáticamente. La plantilla está en español y no contiene claves ni datos privados. La función de baja por correo utiliza igualmente `/auth/v1/otp`.

**Importante:** no se ha conectado Resend ni configurado SMTP desde herramientas. Falta verificar el dominio, activar SMTP, pegar las plantillas en el panel de Supabase y comprobar la recepción de un OTP con una cuenta de ensayo. La URL de la pantalla es `https://pedrombo88.github.io/control-de-gastos/compartidos.html`.

Fuentes: [Integración oficial Supabase–Resend](https://supabase.com/partners/catalog/resend), [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [Resend precios](https://resend.com/pricing).

## Configuración necesaria (una sola vez)

1. Entra en [Supabase → Authentication](https://supabase.com/dashboard/project/bsvtttcuqamjifnpuzlj/auth/providers?provider=Email). Comprueba que el proveedor Email está habilitado.
2. Configura un **servidor SMTP de un proveedor de correo autorizado** con remitente y dominio verificados. Usa las opciones de Supabase Auth para host, puerto, usuario, contraseña y dirección del remitente. No guardes contraseñas SMTP en el repositorio, en HTML ni en JavaScript. Comprueba SPF, DKIM y DMARC del dominio de envío.
3. En **Authentication → Email Templates → Magic Link**, utiliza la variable **`{{ .Token }}`** para mostrar el código de un solo uso en el mensaje, en lugar de enviar únicamente `{{ .ConfirmationURL }}`. El método `signInWithOtp` envía un enlace por defecto si la plantilla contiene la URL; para el formulario de Budviva es necesario el código.
4. Revisa los límites de envío y caducidad de los códigos en Supabase Auth, y la configuración de URL del sitio. La app se abre en `https://pedrombo88.github.io/control-de-gastos/compartidos.html`.
5. Prueba **primero el inicio de sesión por código** con una cuenta desechable de correo controlado, no con las dos cuentas del grupo real.

## Validación segura de la baja

- Crea una cuenta desechable que no pertenezca a ningún grupo ni tenga gastos.
- Inicia sesión y pulsa **Comprobar protección de mi cuenta (sin borrar datos)**. Debe indicar que no existen referencias.
- En **Privacidad y baja de cuenta**, pulsa **Enviar código para eliminar mi cuenta**. Comprueba que llega el mensaje y que contiene un código de 6 a 8 dígitos.
- Prueba primero un código erróneo: el servidor debe rechazarlo sin eliminar la cuenta.
- Solo después, con la cuenta desechable y autorización para destruirla, confirma **ELIMINAR CUENTA** con el código correcto. Verifica que la cuenta ya no puede iniciar sesión y que no queda registrada en Auth.
- Prueba también que una cuenta con un grupo existente recibe un bloqueo y **no puede solicitar ni completar** la baja mientras tenga referencias compartidas.

**Nunca realices la prueba destructiva con las cuentas o gastos actuales.** El botón de comprobación previa y el envío del código no eliminan nada. La confirmación final sí es irreversible.

## Detalles técnicos

- El cliente solicita el código a `/auth/v1/otp` con `create_user:false` y el correo de la sesión autenticada. No crea usuarios nuevos.
- La Edge Function exige sesión válida, confirma ausencia de pertenencia, referencias financieras y autorizaciones de cierre, exige el texto `ELIMINAR CUENTA`, valida el OTP con `auth.verifyOtp({email,token,type:'email'})` y comprueba que el identificador de la cuenta verificada coincide con el de la sesión.
- El código nunca se almacena en el almacenamiento local ni se envía a GitHub.
- Los tests automatizados de GitHub verifican rutas negativas y el flujo de eliminación con simuladores. **No sustituyen la prueba de correo real ni el ensayo con cuentas desechables**.

**Documentación oficial:** [Supabase: Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [signInWithOtp](https://supabase.com/docs/reference/javascript/auth-signinwithotp) · [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp).

## Corrección de integridad — función v6 (6/11/2026)

Se ha corregido la comprobación de referencias de cuenta: ahora cada consulta selecciona una columna existente de su tabla. Antes se intentaba seleccionar `id` en `bv_household_closure_approvals`, que utiliza la clave compuesta `household_id, user_id` y no dispone de `id`. Esto podía bloquear la consulta de elegibilidad con un error 503.

La función v6 está desplegada y su código se ha contrastado con las columnas de producción mediante consultas de solo lectura. **No se ha ejecutado una baja real ni se ha confirmado la entrega del correo OTP**. Las pruebas de aislamiento entre usuarios autenticados siguen pendientes con cuentas de ensayo separadas.
