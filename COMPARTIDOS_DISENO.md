# Budviva Compartidos — diseño de sincronización entre dos cuentas

**Estado:** motor de liquidación implementado en `shared-expenses.js`, pruebas unitarias añadidas. La sincronización y las pantallas aún no están desplegadas. No introducir datos reales hasta completar autenticación y autorización.

## Reglas de producto

1. Cada usuario tiene una cuenta propia; su registro local de movimientos permanece privado.
2. Se crea un **hogar** con exactamente dos miembros activos, y el segundo acepta una invitación identificada por token aleatorio de un solo uso, caducable y revocable. No aceptar el ID de un grupo como autorización.
3. Se comparte **solamente** cada gasto seleccionado expresamente; nunca se suben automáticamente nóminas, tickets originales, extractos bancarios o el historial íntegro.
4. El registro compartido guarda identificador estable, concepto, categoría, importe en céntimos, fecha, creador, pagador, porcentaje del primer miembro, marcas de tiempo y referencia local opcional (privada al creador).
5. El reparto por defecto es 50/50. Admite porcentaje configurable y, más adelante, partidas con distribución diferente por producto.
6. Un **pago de compensación** se anota en un libro compartido independiente, con emisor, receptor e importe; no crea un gasto/ingreso personal ni se duplica en el balance global.
7. La liquidación muestra quién debe pagar a quién, cuánto, la suma pagada por cada uno, las cuotas y los pagos de compensación ya reconocidos.
8. Solo el autor puede editar o borrar sus gastos (con registro de auditoría); el otro miembro puede consultar y solicitar revisión. Para liquidaciones se requiere confirmación de ambas partes antes de reducir la deuda.
9. El botón «Mes» filtra por fecha de gasto, no por fecha de creación. Evitar transferencias reales automáticas; la aplicación solo calcula y registra acuerdos.
10. Abandonar el hogar requiere confirmación y permite exportar antes la parte personal, sin exponer documentos o cuentas del otro.

## Arquitectura necesaria para dos iPhones

- Proyecto backend **independiente** (no reutilizar DropPilot); Supabase Auth por email OTP o enlace, con confirmación obligatoria y dominio de retorno autorizado.
- Postgres con tablas `households`, `household_members`, `shared_expenses`, `settlements` e `invitations`.
- Políticas RLS en todas las tablas expuestas. Autorizar por `auth.uid()` y pertenencia real, nunca por email sin verificar ni metadatos editables del perfil.
- Invitación procesada en endpoint/función transaccional segura; hash de token almacenado y caducidad comprobada en servidor, máximo dos miembros.
- Registro de gastos idempotente (`client_event_id` UUID único por autor/hogar) para evitar duplicaciones si hay mala conexión.
- Realtime o refresco incremental y actualización optimista con tratamiento de conflictos. Mostrar explícitamente el estado «Pendiente de sincronizar».
- No incluir `service_role` ni claves secretas en GitHub Pages. Solo URL y clave pública/publishable cuando el backend esté listo.
- Cifrado HTTPS en tránsito; límites de lectura y escritura, logs mínimos, política de retención y eliminación, exportación y derechos de protección de datos.
- Documentos originales en IndexedDB **local** hasta implementar un sistema de permisos específico separado.

## Ejemplo de cálculo

A paga 800 €, B paga 400 €, ambos tienen cuota del 50 %.

Gasto total 1.200 €; cada cuota 600 €.
A pagó 200 € más de su cuota y **B debe 200 € a A**.

La API de cálculo trabaja en céntimos y acepta `expense` y `settlement`. Un porcentaje `shareBasisPointsA: 7000` significa que el primer miembro asume el 70 %.

## Requisitos antes de activar sincronización

- Crear un proyecto de backend dedicado a Budviva, configurar proveedor de correo y URLs autorizadas.
- Migraciones versionadas, políticas RLS verificadas con al menos tres cuentas (miembro A, miembro B y tercero ajeno).
- QA en dos móviles reales: invitaciones, revocación, sin conexión, actualizaciones simultáneas, duplicados, redondeos, importación y borrado.
- Consentimiento claro por gasto, textos legales y atención a privacidad.
