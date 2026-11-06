# Auditoría de seguridad — Budviva Compartidos
**Fecha:** 6 de noviembre de 2026 · **Versión:** 6.9.8 (beta) · **Alcance:** autenticación, permisos y eliminación de cuentas.

> Auditoría técnica interna. No es una prueba de penetración externa ni una certificación de conformidad legal o App Store.

## Resultados verificados

| Control | Evidencia | Resultado |
|---|---|---|
| Aislamiento de tablas sin iniciar sesión | GitHub Actions: GET anónimo a las seis tablas `bv_*`, con clave pública y sin token de usuario | **Superado (6/6)**: ninguna devolvió filas |
| Eliminación sin credenciales | GitHub Actions: POST anónimo a `bv-delete-account` | **Superado**: HTTP 401 |
| Preflight CORS | GitHub Actions: OPTIONS con origen GitHub Pages | **Superado**: HTTP 204 y origen autorizado |
| Verificaciones simuladas de eliminación | Tests `tests/account-eligibility.test.cjs` | **Superadas**: bloqueos de miembros, referencias, errores de BD y contraseña |
| Funciones privilegiadas `bv_*` | Consulta a `pg_proc` y `has_function_privilege` | **6/6** no ejecutables por `anon`; disponibles a `authenticated` por diseño |
| Actualización de miembros | Consulta a `information_schema.column_privileges` | `authenticated` solo puede actualizar `display_name`, no identificadores de usuario o grupo |
| Aislamiento de filas | Inspección de `pg_policies` | RLS en tablas compartidas; políticas ligadas a `auth.uid()` y pertenencia |
| Estado de los datos | Conteos agregados, sin leer información personal | 1 grupo, 2 miembros, 1 gasto, 0 compensaciones antes de las pruebas |

Las comprobaciones reales son **no destructivas**: solo GET y peticiones anónimas que deben rechazarse. No se han creado ni eliminado usuarios de producción.

## Avisos de Supabase

1. **WARN — Leaked Password Protection Disabled.** Protección frente a contraseñas conocidas por filtraciones desactivada. La [documentación oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) indica que esta función requiere plan Pro o superior. Se ha comprobado que la organización está en el **plan Free**, por lo que esta protección no está disponible sin pasar a Pro. No se ha cambiado el plan ni se ha generado ningún coste. Antes de comercializar: revisar la política de contraseñas y decidir si el coste del plan Pro está justificado; no confundir un control de formulario con una protección de Auth en el servidor.
2. **WARN — 6 funciones SECURITY DEFINER ejecutables por usuarios autenticados.** Son RPC necesarias para crear grupos, invitar, unirse, salir, aprobar cierres y confirmar compensaciones. Se han revisado sus comprobaciones de `auth.uid()`/pertenencia y `search_path` vacío. El aviso es informativo sobre privilegios elevados, **no prueba que exista una vulnerabilidad**. Requiere vigilancia y pruebas de autorización con usuarios de prueba.
3. **INFO — `bv_invitations` sin políticas RLS.** Intencionado: las invitaciones se gestionan mediante RPC autorizadas, no por lectura directa. La comprobación anónima confirma que no se revelan registros.

## Bloqueos antes de comercializar

- **P0 — Prueba real del método de baja por correo.** La baja con OTP de un solo uso está implementada en la Edge Function v5 y en la interfaz, con comprobación de identidad y referencias compartidas. Falta configurar/verificar la entrega de correos y probar el ciclo completo con una cuenta desechable. No se ha probado ni eliminado ninguna cuenta real.
- **P0 — Eliminación real no ensayada.** Falta prueba de extremo a extremo con una cuenta desechable: alta, sesión, verificación de referencias, baja, rechazo de sesión y confirmación de ausencia en Auth. No utilizar las dos cuentas actuales.
- **P0 — Privacidad y soporte.** Completar identidad del responsable, base legal, canal privado de contacto, plazos de conservación y textos jurídicos antes de App Store.
- **P0 — Distribución iOS.** Compilación firmada, TestFlight, accesibilidad, pruebas de cámara/importación y revisión de Apple pendientes.
- **P1 — Protección de contraseñas filtradas.** Revisar disponibilidad por plan; mantener requisitos de contraseñas robustas y monitorización de intentos de acceso.
- **P1 — Acceso entre usuarios autenticados.** Añadir pruebas con dos cuentas desechables para confirmar que un miembro no accede a un grupo ajeno.
- **P1 — Cierre compartido y portabilidad.** Validar en dispositivos reales la exportación y el cierre conjunto, sin usar el grupo existente.

## Ensayo autorizado — limpieza de datos de prueba (6 de noviembre de 2026)

El titular ha confirmado expresamente que el único grupo y todos sus registros eran **datos de prueba prescindibles**, y ha autorizado su eliminación para poder comprobar la baja de la cuenta de ensayo.

- Estado anterior: 1 grupo, 2 miembros, 1 gasto, 1 invitación, 0 compensaciones y 0 aprobaciones.
- Acción ejecutada: eliminación restringida al único grupo vinculado a la cuenta de prueba, con comprobación previa de unicidad. Las relaciones `ON DELETE CASCADE` han eliminado los registros dependientes.
- Estado posterior verificado mediante consulta SQL: **0 grupos, 0 miembros, 0 gastos, 0 invitaciones, 0 compensaciones, 0 aprobaciones**.
- La cuenta de acceso de prueba **sigue existiendo** en Supabase Auth. No se ha ejecutado la eliminación de usuarios por SQL ni se ha omitido la verificación de correo.
- **Pendiente:** iniciar sesión con la cuenta de ensayo, recibir el OTP en su correo, confirmar la baja desde la interfaz y verificar que la cuenta desaparece de Auth. El acceso al correo de la cuenta no está disponible mediante las herramientas conectadas.

## Automatización

`.github/workflows/security-checks.yml` ejecuta `npm run check` en cada push/PR. En push, ejecución manual y cada lunes, realiza además las comprobaciones de endpoint y aislamiento anónimo sin datos de usuario. No usa secretos administrativos.

**Actualización 6.9.8:** se ha añadido una segunda vía de reautenticación para la baja de cuenta, con código de correo verificado en Supabase Auth. Los tests simulados cubren código inválido, caducado, usuario distinto, pertenencia activa, autorizaciones de cierre pendientes y éxito controlado. La función desplegada mantiene el modo de solo lectura. La entrega real de OTP depende del proveedor SMTP y todavía no está validada.\n\n**Veredicto:** la protección anónima y la infraestructura de pruebas están verificadas; **Budviva todavía no está lista para enviarse a App Store**.
