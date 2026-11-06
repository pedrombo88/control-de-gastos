# Auditoría de seguridad — Budviva Compartidos
**Fecha:** 6 de noviembre de 2026 · **Versión:** 6.9.7 (beta) · **Alcance:** autenticación, permisos y eliminación de cuentas.

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

1. **WARN — Leaked Password Protection Disabled.** Protección frente a contraseñas conocidas por filtraciones desactivada. La [documentación oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) indica que esta función requiere plan Pro o superior. No se ha activado, ya que no hay una herramienta conectada para cambiar la configuración de Auth. Antes de comercializar: revisar plan y políticas de contraseñas en Supabase Auth.
2. **WARN — 6 funciones SECURITY DEFINER ejecutables por usuarios autenticados.** Son RPC necesarias para crear grupos, invitar, unirse, salir, aprobar cierres y confirmar compensaciones. Se han revisado sus comprobaciones de `auth.uid()`/pertenencia y `search_path` vacío. El aviso es informativo sobre privilegios elevados, **no prueba que exista una vulnerabilidad**. Requiere vigilancia y pruebas de autorización con usuarios de prueba.
3. **INFO — `bv_invitations` sin políticas RLS.** Intencionado: las invitaciones se gestionan mediante RPC autorizadas, no por lectura directa. La comprobación anónima confirma que no se revelan registros.

## Bloqueos antes de comercializar

- **P0 — Baja de cuentas sin contraseña.** La eliminación autoservicio solo admite cuentas con contraseña. Hay que ofrecer una vía segura equivalente para cuentas con acceso por código de correo, sin obligar a borrar datos de terceros.
- **P0 — Eliminación real no ensayada.** Falta prueba de extremo a extremo con una cuenta desechable: alta, sesión, verificación de referencias, baja, rechazo de sesión y confirmación de ausencia en Auth. No utilizar las dos cuentas actuales.
- **P0 — Privacidad y soporte.** Completar identidad del responsable, base legal, canal privado de contacto, plazos de conservación y textos jurídicos antes de App Store.
- **P0 — Distribución iOS.** Compilación firmada, TestFlight, accesibilidad, pruebas de cámara/importación y revisión de Apple pendientes.
- **P1 — Protección de contraseñas filtradas.** Revisar disponibilidad por plan; mantener requisitos de contraseñas robustas y monitorización de intentos de acceso.
- **P1 — Acceso entre usuarios autenticados.** Añadir pruebas con dos cuentas desechables para confirmar que un miembro no accede a un grupo ajeno.
- **P1 — Cierre compartido y portabilidad.** Validar en dispositivos reales la exportación y el cierre conjunto, sin usar el grupo existente.

## Automatización

`.github/workflows/security-checks.yml` ejecuta `npm run check` en cada push/PR. En push, ejecución manual y cada lunes, realiza además las comprobaciones de endpoint y aislamiento anónimo sin datos de usuario. No usa secretos administrativos.

**Veredicto:** la protección anónima y la infraestructura de pruebas están verificadas; **Budviva todavía no está lista para enviarse a App Store**.
