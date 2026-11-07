# Configuración del correo de acceso y baja — Budviva

**Estado (7 de noviembre de 2026):** Resend Free conectado por SMTP personalizado en Supabase con el dominio `budviva.com`. El titular ha confirmado la recepción y uso correcto de códigos OTP. **Se ha verificado la baja real de una cuenta anteriormente vinculada a Compartidos**, después del cierre conjunto del grupo: Auth pasó de 4 a 3 usuarios, el registro de autenticación indica `user_deleted` con HTTP 200 y las seis tablas de Compartidos permanecen vacías. La entrega a múltiples proveedores y la distribución App Store siguen pendientes.

## Proveedor recomendado: Resend (preparado el 6/11/2026)

Plan gratuito de Resend: **3.000 mensajes al mes, máximo 100 al día**, sujeto a las condiciones actuales. Requiere un **dominio propio verificado** para enviar correo a destinatarios externos. No confundir Resend gratuito con un dominio gratuito.

**Ruta simplificada:** proyecto Supabase Budviva → Integrations → Resend → conectar cuenta; la integración oficial de Supabase puede configurar automáticamente las credenciales SMTP. Otra opción es configurar SMTP manualmente en Authentication → Emails → SMTP Settings.

**Valores manuales de Resend** (no poner claves privadas en GitHub):
- SMTP host: `smtp.resend.com`.
- Puerto: `465` (SSL/TLS), utilizado en la guía de configuración; alternativa `587` (STARTTLS) si el proveedor y la configuración lo permiten.
- Usuario: `resend`.
- Contraseña: clave API creada en la cuenta Resend, configurada únicamente en Supabase.
- Remitente: `no-reply@budviva.com`.
- Nombre del remitente: `Budviva`.

**Plantilla de acceso activa:** [codigo-acceso.html](../backend/email-templates/codigo-acceso.html) copiada manualmente en **Magic Link/OTP**. **Plantilla de alta preparada:** [confirmacion-alta.html](../backend/email-templates/confirmacion-alta.html) para **Confirm sign up**, pendiente de copiar y probar. Ambas conservan `{{ .Token }}`. El HTML del repositorio no se sincroniza automáticamente con el panel de Supabase. La función de baja también usa `/auth/v1/otp`.

**Plantilla Confirm sign up:** el titular ha confirmado el 7/11/2026 que ya está guardada en Supabase, aunque no se ha probado su entrega real a una cuenta nueva.

**Validación pendiente:** dar de alta una dirección nueva de prueba, comprobar el mensaje de confirmación y el acceso posterior; revisar límites de correo y SPF/DKIM/DMARC, sin compartir credenciales. La URL actual de pruebas es `https://pedrombo88.github.io/control-de-gastos/compartidos.html`. El dominio `budviva.com` aún no se ha vinculado como URL principal de la PWA.

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

La función v6 está desplegada y su código se ha contrastado con las columnas de producción mediante consultas de solo lectura. **No se ha ejecutado una baja real**. El titular ha confirmado entrega y uso de OTP para iniciar sesión; la baja por OTP y el aislamiento entre usuarios autenticados siguen pendientes de prueba específica.


## Mensaje de correo genérico para accesos y bajas (7/11/2026)

La plantilla **Magic Link/OTP** se utiliza tanto para iniciar sesión como para solicitar el código de eliminación. Por ello, el archivo `backend/email-templates/codigo-acceso.html` emplea ahora el título **«Tu código de verificación»** y explica las tres operaciones posibles (acceso, registro, eliminación). Evita que un usuario crea que un correo solicitado para borrar su cuenta es un inicio de sesión inesperado.

**Pendiente de publicación manual en Supabase:** editar Authentication → Email Templates → Magic Link, cambiar el asunto a `Tu código de verificación · Budviva` y sustituir Body por el HTML revisado en GitHub, guardando la plantilla. Los archivos del repositorio no se sincronizan automáticamente con Supabase. Mantener `{{ .Token }}`. No compartir ni registrar códigos OTP de usuarios.
