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


## Ampliación de auditoría — 7 de noviembre de 2026

**Verificado en el proyecto Supabase `bsvtttcuqamjifnpuzlj` con consultas de solo lectura.**

- SMTP Resend configurado por el titular con el dominio `budviva.com`. El titular confirmó entrega y acceso por OTP. Los registros de Auth muestran solicitudes `/otp` y verificaciones `/verify` con HTTP 200 y `login_method=otp`.
- **Alta de un tercero aún NO confirmada a nivel de servidor:** el último recuento devuelve **2 usuarios en Auth, ambos con email confirmado**; la última alta figura fechada el **5/11/2026**. Los eventos recientes corresponden a acceso de un usuario existente. No se debe declarar superada la prueba de registro de una dirección totalmente nueva solo por recibir un código.
- **Estado actual:** 0 grupos compartidos y 0 miembros (datos limpiados en la etapa anterior con autorización del titular). No existe un conjunto de dos grupos distintos con el que demostrar la prueba de aislamiento autenticado de extremo a extremo.
- **RLS:** habilitado en las 6 tablas `bv_*`; las cinco tablas de lectura compartida aplican pertenencia al grupo a través de `private.bv_is_member`. La tabla `bv_invitations` carece intencionalmente de políticas y no concede SELECT.
- **Privilegios verificados en producción:** ningún `bv_*` `SECURITY DEFINER` es ejecutable por `anon`; las seis RPC públicas están restringidas a `authenticated`, con comprobaciones de autorización en el cuerpo y `search_path` vacío.
- **Edición de miembros:** `authenticated` tiene permiso de UPDATE **únicamente sobre `display_name`**, no sobre `household_id` ni `user_id`. Por tanto, la política de edición de nombre no permite cambiar de grupo alterando columnas.
- **Avisos de seguridad del analizador:** `bv_invitations` sin políticas (intencional); seis funciones `SECURITY DEFINER` accesibles para `authenticated` (necesarias, pero requieren pruebas de permisos); protección de contraseñas filtradas desactivada (a valorar por compatibilidad con cuentas antiguas; el acceso nuevo usa OTP).

### Siguientes comprobaciones sin afectar a datos existentes

1. Crear una **tercera cuenta con correo completamente nuevo** en la PWA y confirmar que el recuento de Auth crece a 3. Usar ventana privada y dirección no utilizada previamente. No compartir OTP ni tokens de sesión.
2. Preparar dos grupos distintos con cuentas de ensayo y ejecutar `tests/authenticated-isolation.test.cjs` con sesiones separadas **solo en entorno privado/CI protegido**, sin guardar tokens en el repositorio.
3. Comprobar el rechazo de la lectura de filas de un grupo ajeno, además del acceso normal al propio; registrar resultados sin información personal.
4. Probar baja por OTP con una cuenta desechable completamente aislada de gastos, previa confirmación explícita para el borrado irreversible.

**Alcance de este control:** revisión de permisos, código y logs. No se ha ejecutado un pentest ni una prueba real entre grupos con movimientos. No se han creado, cambiado ni eliminado usuarios o gastos en este análisis.


## Comprobación RLS por identidad (7 de noviembre de 2026)

**Consultas de solo lectura ejecutadas contra Supabase con transacciones `BEGIN READ ONLY`, `SET LOCAL ROLE authenticated` y `request.jwt.claim.sub` configurado por identidad, terminando en `ROLLBACK`.** Esta prueba reproduce la evaluación de las políticas RLS para cada usuario en PostgreSQL, pero no sustituye las peticiones HTTP con JWT reales.

**Estado agregado de Supabase verificado:** 4 cuentas Auth, 3 correos confirmados y 1 pendiente; 1 grupo de Compartidos, 2 miembros; 0 gastos y 0 compensaciones. El grupo pertenece a uno de los miembros.

| Identidad simulada con rol `authenticated` | Grupos visibles | Miembros visibles | Gastos visibles | Compensaciones visibles | Resultado |
|---|---:|---:|---:|---:|---|
| Primer miembro | 1 | 2 | 0 | 0 | Correcto |
| Segundo miembro | 1 | 2 | 0 | 0 | Correcto |
| Cuenta ajena al grupo | 0 | 0 | 0 | 0 | Correcto |

**Conclusión:** se ha demostrado aislamiento de lectura en `bv_households` y `bv_members` para la identidad ajena, y acceso legítimo de ambos miembros al mismo grupo. Como no hay movimientos, los conteos cero de gastos y compensaciones **no demuestran por sí solos** que las políticas separen gastos reales de dos grupos. Las definiciones RLS siguen exigiendo pertenencia.

**Regresión añadida:** `tests/authenticated-isolation.test.cjs` admite ahora dos modalidades independientes: dos grupos con diferentes usuarios (anterior), y **un grupo con un miembro y una cuenta externa** (nueva). Ambas requieren JWT de cuentas de prueba proporcionados por un entorno privado, nunca por GitHub ni por este chat. Sin esas variables, los tests autenticados se omiten, no deben marcarse como verificación completa.

**Siguientes pruebas:** registrar un gasto de ensayo con los dos miembros y contrastar su visibilidad; ejecutar llamadas REST autenticadas con sesiones reales aisladas; verificar la baja de una cuenta descartable sin pertenencia a grupo. No hay borrados ni cambios de datos en la base durante estas comprobaciones.


## Movimientos reales y aislamiento de acceso (7 de noviembre de 2026)

**Resultado verificado en Supabase, con datos de ensayo registrados por el usuario:**

- Grupo: 2 miembros y 2 gastos de 12,00 € y 8,00 €, ambos con `share_basis_points_a=5000` (reparto 50/50); cada gasto tiene como autor y pagador a su respectivo usuario.
- Total real de gastos: **20,00 €** (2.000 céntimos). Reparto teórico 10,00 € por persona. El usuario que pagó 8,00 € debe **2,00 €** al usuario que pagó 12,00 €, sin compensaciones registradas.
- **RLS contrastado contra filas reales** con transacciones `BEGIN READ ONLY` + `SET LOCAL ROLE authenticated` + `request.jwt.claim.sub`: cada miembro puede consultar 1 grupo, 2 miembros y los 2 gastos (2.000 céntimos); una tercera cuenta autenticada, externa al grupo, ve 0 grupos, 0 miembros y 0 gastos.
- La consulta directa con `SET LOCAL ROLE anon` y `SELECT` sobre `bv_households` fue **rechazada por permisos** (`permission denied`). No se necesita ni se debe conceder SELECT a `anon`.
- **Integridad:** se revisaron `payer_id`, `author_id`, `amount_cents` y reparto. La suma correcta se obtuvo de `bv_expenses` directamente; evitar sumar importes tras unir simultáneamente gastos y miembros, porque la multiplicación de filas duplica el total.
- **Limitación:** no se han probado solicitudes HTTP con JWT de cada usuario, ni escritura no autorizada, ni la transición a una compensación confirmada. Esas validaciones siguen abiertas antes de la publicación comercial.

No se han insertado, modificado ni eliminado datos por las herramientas de auditoría.


## Compensación entre los dos miembros — 7 de noviembre de 2026

Prueba funcional efectuada por el titular y **confirmada mediante consultas de solo lectura en Supabase**:

- Se mantienen los **dos gastos originales** (12,00 € y 8,00 €), total **20,00 €**; reparto al 50 %.
- Se ha registrado **una compensación de 2,00 €**, desde la persona que pagó 8,00 € hacia la que pagó 12,00 €, con `status='confirmed'` y fecha de revisión registrada. **No hay compensaciones pendientes**.
- Saldo resultante: **0,00 €**. Los gastos y la compensación siguen como asientos independientes; no se modifica el histórico de gasto.
- Repetida la simulación RLS con `BEGIN READ ONLY` y rol `authenticated`: ambos miembros ven **2 gastos por 20,00 €** y **1 compensación confirmada por 2,00 €**; la cuenta ajena ve **0 gastos y 0 compensaciones**.
- Añadido un test de regresión que recrea exactamente los importes y el antes/después de la compensación, sin conectarse a producción.

**Limitaciones:** no se han ejecutado solicitudes HTTP de atacante usando JWT propios, ni pruebas de escrituras no autorizadas; la protección de la baja de cuenta por OTP y pruebas manuales en iPhone físico siguen pendientes. No se ha alterado ningún registro en Supabase con las herramientas de auditoría.


## Protección contra compensaciones pendientes duplicadas — 7/11/2026

La auditoría detectó que el control de una única propuesta pendiente por persona existía en la interfaz pero podía eludirse con dos solicitudes concurrentes. Se comprobó previamente que no había duplicados pendientes.

- **Producción:** aplicada correctamente la migración `budviva_unique_pending_settlement_per_payer_20261107`, creando un índice único parcial `bv_settlements_one_pending_per_payer` en `(household_id,payer_id)` limitado a `status='pending'`.
- **Validación:** índice confirmado en `pg_indexes`; el historial mantiene 1 compensación confirmada por 2,00 €, sin modificaciones.
- **Repositorio:** reflejado el índice en `backend/compartidos.sql`, incorporado un test estático y mejorado el mensaje de conflicto de propuestas simultáneas en `compartidos.js`.
- **Alcance:** evita múltiples compensaciones simultáneamente pendientes de un pagador dentro del mismo grupo. No limita propuestas sucesivas cuando la anterior haya sido confirmada o rechazada. Esta protección no modifica el control de confirmación por parte de la persona destinataria.

No se han generado ni eliminado movimientos para probar la restricción; la validez del índice está comprobada en el catálogo PostgreSQL.
