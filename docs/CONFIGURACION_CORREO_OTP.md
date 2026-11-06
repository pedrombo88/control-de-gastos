# Configuración del correo de acceso y baja — Budviva

**Estado (6 de noviembre de 2026):** el flujo de OTP de Budviva 6.9.8 y la Edge Function `bv-delete-account` v5 están implementados. **No se ha verificado aún el envío real de correos**. El proyecto Supabase usa el plan Free. No se han contratado proveedores ni utilizado cuentas de producción para probar bajas.

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
