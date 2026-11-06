# Budviva — Tu dinero, más claro

**Estado:** versión web instalable (PWA) **6.9.7 beta**, en preparación para una futura versión iOS comercial. **No publicada en App Store.**

[Probar Budviva](https://pedrombo88.github.io/control-de-gastos/) · [Privacidad](https://pedrombo88.github.io/control-de-gastos/privacidad.html) · [Ayuda](https://pedrombo88.github.io/control-de-gastos/soporte.html) · [Auditoría para publicación](./AUDITORIA_BUDVIVA_2026-11-04.md) · [Seguridad de Compartidos](./AUDITORIA_SEGURIDAD_COMPARTIDOS_2026-11-06.md)

## Interfaz principal

- **Inicio:** balance del mes, acceso a gasto/ticket, avisos de presupuesto, avance del ahorro y últimas operaciones.
- **Movimientos:** historial, filtros, buscador y accesos a **Importar**, **Recurrentes**, **Estadísticas** y **Compartidos**.
- **Presupuestos:** límites y alertas con umbrales configurables.
- **Ahorro:** vistas independientes **Analizar compras** (simulación de ahorro potencial) y **Mis objetivos** (aportaciones reales y progreso).
- **Ajustes:** copias JSON, CSV, temas, actualización, privacidad, ayuda y borrado de datos.

La importación admite tickets en imagen y documentos PDF/CSV/TXT con revisión previa. La extracción puede equivocarse. Budviva **conserva los originales asociados a los movimientos** en IndexedDB, también al adjuntarlos manualmente desde la edición de un movimiento y permite incluirlos en copias completas o cifradas. Debes verificar la carga y restauración en Safari antes de confiar en ellos.

## Compartidos (v6.8.0 beta)

Se ha implementado la pantalla `compartidos.html` y la lógica de dos cuentas para registrar solo gastos comunes, calcular deudas al céntimo, invitar a la pareja y confirmar pagos de compensación. Desde cada movimiento personal de tipo gasto hay un botón **Compartir gasto** que precarga una copia para revisión, sin subir el histórico privado. El identificador de evento vinculado es determinista y evita duplicar el mismo movimiento compartido por accidente; modificar el movimiento privado posteriormente no cambia automáticamente su copia compartida.

**Backend creado y migrado el 4/11/2026:** proyecto dedicado Supabase **Budviva**, región `eu-west-1`, ref `bsvtttcuqamjifnpuzlj`. `shared-config.js` solo contiene la URL y la clave pública `sb_publishable_...`. DropPilot-Staging quedó pausado (estado INACTIVE); DropPilot principal permanece activo.

**Versión 6.4:** balance individual con importe pagado, cuota proporcional y diferencia; botón para rellenar la deuda exacta (solo para quien debe dinero, con confirmación posterior del receptor), fechas de las compensaciones y edición del nombre visible del perfil. El botón no mueve dinero ni crea transferencias bancarias. Se bloquea el rellenado automático si existe otra compensación pendiente del mismo pagador.

**Comparativas y sincronización:** existe una comparativa del mes actual, mes anterior o histórico acumulado; la deuda acumulada siempre considera todas las operaciones confirmadas. Cuando ambas personas abren Compartidos, se actualiza al volver a la pestaña y automáticamente cada 30 segundos si permanece visible. Cada gasto se autoriza en servidor solo después de que el hogar tenga dos miembros. Para cuentas creadas manualmente con contraseña en el panel de Supabase hay un acceso alternativo sin OTP; no es un sistema público de alta de usuarios.

**Pendiente para poder iniciar sesión por correo:** configurar desde el panel del proyecto Supabase:
1. En **Authentication → Email Templates**, cambiar las plantillas **Magic Link / OTP** (y **Confirm sign up** para nuevas cuentas) para mostrar el código de 6 dígitos mediante `{{ .Token }}`, porque esta pantalla usa la introducción de código, no la pulsación de un enlace.
2. En **Authentication → URL Configuration**, establecer Site URL como `https://pedrombo88.github.io/control-de-gastos/compartidos.html` y autorizar esa URL como redirect.
3. El SMTP predeterminado de Supabase solo puede enviar a direcciones de los miembros de la organización. Para vincular una pareja con dos correos externos hay que configurar un SMTP propio con proveedor compatible, por ejemplo Resend/Brevo, antes de probar el inicio de sesión. No se ha configurado SMTP ni se ha probado el envío real.
4. Comprobar la aplicación en dos iPhones con dos correos diferentes y con un tercer usuario ajeno. Antes de producción, cerrar privacidad, políticas de protección y borrado de cuenta.

En el esquema hay RLS activada para todas las tablas de Budviva (comprobado en base de datos). Las funciones RPC con privilegios elevados requieren revisión de seguridad especial; se han restringido expresamente a cuentas autenticadas y comprueban la identidad y pertenencia a cada hogar.

No reutilizar los proyectos DropPilot para datos de Budviva; nunca poner claves `service_role` ni contraseñas privadas en GitHub Pages.

Los pagos de compensación son registros informativos, no transferencias bancarias. Solo afectan a la deuda después de ser confirmados por quien los recibe. No hay sincronización de tickets originales, nóminas ni movimientos privados.

## Datos y privacidad

Los movimientos, objetivos y reglas se guardan en el almacenamiento local del navegador y no se sincronizan automáticamente. Las aportaciones a objetivos no son movimientos bancarios y no modifican el balance. Haz copias JSON periódicas.

**Compatibilidad importante:** se mantiene la clave histórica `saldo-diario-data-v1` para conservar registros al actualizar en el mismo origen web. No cambiar la clave ni el ID PWA sin una migración.

Las bibliotecas OCR y PDF.js se empaquetan con versiones fijadas en `vendor/` y se sirven desde el mismo origen; los recursos OCR se descargan la primera vez que se utilizan. Consulta [privacidad](./privacidad.html). No introduzcas claves bancarias.

**Corrección 6.2.2:** la caché offline distingue correctamente Inicio, Privacidad y Soporte; una visita a una página informativa ya no puede sustituir el Inicio almacenado.

## Instalación de la PWA en iPhone

1. Abre [Budviva](https://pedrombo88.github.io/control-de-gastos/) desde **Safari**.
2. Pulsa Compartir → **Añadir a pantalla de inicio**.
3. Si no aparece la versión actual, usa **Ajustes → Comprobar actualizaciones**.
4. No borres los datos de Safari sin exportar antes una copia de seguridad.

## Estructura y mantenimiento

- `index.html`: entrada PWA y módulos de ahorro integrados para asegurar la actualización en Safari.
- `recurring.js`: reglas de movimientos periódicos.
- `stats.js`: estadística y cálculos de necesidad/ahorro.
- `smart-import.js`: lectura de imágenes, tickets y extractos.
- `reconcile.js`: conciliación y detección de posibles duplicados.
- `sw.js`: caché y actualización de la PWA.
- `manifest.webmanifest`: identidad de instalación de la app.
- `privacidad.html` y `soporte.html`: páginas informativas públicas.
- El código de la pantalla Ahorro está integrado en `index.html` para evitar desajustes de versiones en instalaciones PWA anteriores.
- Las pruebas históricas V4–V6 y los módulos redundantes se retiraron del despliegue principal; permanecen recuperables en el historial Git.
- `ios-native/`: código y tests de la versión iOS nativa, con build cloud sin firma.
- `vendor/`: OCR Tesseract y PDF.js de versiones fijadas con manifiesto SHA-256.
- `tools/`, `tests/` y `.github/workflows/`: validación de seguridad, negocio, compilación y preparación de recursos.


El proyecto funciona sin proceso de compilación: se publica desde la rama `main` mediante GitHub Pages.

## Preparación para comercializar

Lee la [auditoría completa](./AUDITORIA_BUDVIVA_2026-11-04.md) para conocer los bloqueos de seguridad, fiabilidad, protección de datos, almacenamiento de documentos originales, QA y publicación iOS.

Antes de enviar a App Store se requiere una compilación de iOS preparada para revisión y una política y soporte definitivos. La PWA por sí misma **no se presenta directamente en App Store**.

## Licencia y distribución

Repositorio público de pruebas de un producto de software. Este README no concede ninguna licencia de reutilización o redistribución del código. No deben añadirse a este repositorio credenciales, extractos bancarios reales ni copias de seguridad.

### Versión 6.8.0 beta — Actividad compartida

La pantalla Compartidos incorpora un historial de avisos dentro de la aplicación: gastos añadidos por la otra persona, compensaciones pendientes de confirmación y compensaciones aceptadas o rechazadas. El estado de lectura se almacena en el navegador por cuenta y hogar; la primera visita establece una línea base sin marcar todo el histórico como nuevo. Se muestran hasta 12 eventos recientes, y se consulta el servidor al volver a la pestaña o cada 30 segundos con la página visible. **No son notificaciones push ni llegan con la app cerrada.** El historial financiero sigue residiendo en Supabase, no en el almacenamiento local de avisos. Queda pendiente el borrado completo de cuenta/hogar con verificación y controles de conservación.

### Versión 6.8.0 beta — Exportación del hogar

Desde Compartidos se pueden descargar los gastos y las compensaciones de todo el hogar en JSON y CSV, incluyendo estado de confirmación y fechas. La exportación fuerza la lectura completa del servidor y se cancela si falla la sincronización. El CSV utiliza separador de punto y coma, BOM UTF-8 y neutraliza conceptos que podrían interpretarse como fórmulas en hojas de cálculo. Los datos no se envían a servicios de terceros para generar el archivo. La exportación no elimina datos ni sustituye el proceso de baja de cuenta, todavía pendiente.

### Versión 6.8.0 beta — Cierre del hogar por consentimiento mutuo

Cierre definitivo del hogar con confirmación explícita y doble consentimiento cuando hay dos miembros. La autorización puede retirarse mientras no se complete. Al aprobar todos, el servidor borra de forma transaccional gastos, compensaciones, invitaciones, miembros y hogar. No elimina usuarios de Supabase Auth ni datos personales locales; la baja de la cuenta de acceso requiere un procedimiento separado. Nunca usar esta operación como prueba en hogares con datos que deban conservarse. Se añadieron índices para claves foráneas tras revisión de los avisos de rendimiento.

**Auditoría pendiente para lanzamiento público:** configuración de correo SMTP y recuperación de contraseña, protección de contraseñas filtradas (según disponibilidad del plan), procedimiento de borrado de cuenta Auth, identificación legal del responsable y política de privacidad definitiva, pruebas de permisos con tres cuentas y pruebas reales en iPhone. Las funciones SECURITY DEFINER expuestas a usuarios autenticados están señaladas por el asesor; su acceso se restringe en código, pero deben someterse a pruebas de seguridad antes de producción.

### Versión 6.8.0 beta — Desvinculación segura

La gestión del hogar está agrupada en un panel plegado para reducir acciones destructivas visibles. Una persona puede salir de un hogar sin gastos ni compensaciones. Si hay historial, el servidor bloquea la salida individual y exige el cierre por consentimiento mutuo. Si sale quien creó un hogar vacío y queda otro miembro, se transfiere la administración. Se cancelan invitaciones y autorizaciones anteriores. La cuenta de acceso sigue activa. La baja de Auth aún no está automatizada.

### 6.8.1 — Preparación de baja de cuenta

Se ha separado en la interfaz el cierre de un hogar de la eliminación de la cuenta de acceso. El borrado de cuentas no está activado desde el navegador: se requiere un canal de atención privado, verificación de identidad y pruebas de extremo a extremo. No se deben utilizar incidencias públicas de GitHub para datos personales ni solicitudes de baja.

### 6.8.2 — Correcciones de seguridad previas a la baja de cuenta

Se corrige la neutralización de fórmulas en exportaciones CSV, incluso cuando el texto comienza por espacios o caracteres de control. Se eliminan los datos antiguos de memoria al salir de un hogar y se rechazan cargas que no confirmen el hogar esperado. Se añaden pruebas de regresión. La eliminación automática de cuentas todavía no se ofrece en el navegador hasta verificar la seguridad y la integración del servicio.

### 6.8.3 — Accesibilidad de privacidad y revisión de baja

La información de baja de cuenta se muestra también a usuarios autenticados sin hogar (antes solo aparecía dentro del panel de un hogar). La sección de eliminación en hogares activos ahora está plegada. No se ha habilitado la baja automática: la función de servidor existente carece de configuración CORS validada para Safari, y faltan pruebas reales de identidad, rechazo y eliminación. El usuario no debe introducir contraseñas en formularios de baja hasta completar esa verificación.

### 6.9.0 beta — Integración de baja de cuenta

Servicio Supabase bv-delete-account v2 con CORS y formulario para cuentas sin hogar. La operación exige contraseña y confirmación textual; el servidor comprueba las referencias compartidas. No elimina datos locales. Pendiente prueba de extremo a extremo con cuenta desechable y Safari.

### 6.9.1 — Terminología Compartidos

En la interfaz de gastos compartidos se reemplaza la denominación «hogar» por «Compartidos» y «grupo de compartidos». Se mantiene la nomenclatura interna de Supabase para compatibilidad. No se cambian ni eliminan registros. La categoría de gasto personal «Hogar» no se renombra, ya que representa vivienda y no el grupo compartido.

### 6.9.2 — Pruebas automáticas de seguridad

Se añaden pruebas de regresión de la baja de cuenta y un workflow de GitHub Actions que ejecuta `npm run check` en cada actualización. Cada lunes y bajo ejecución manual se ejecuta también una comprobación no destructiva de CORS y rechazo de peticiones anónimas. No se crean ni eliminan cuentas durante las pruebas. La validación integral con una cuenta desechable sigue pendiente.

### 6.9.5 — Logotipo de Budviva unificado

El icono de la PWA y del iPhone reproduce el logotipo de la cabecera: B blanca y punto turquesa sobre fondo azul. La cabecera original no se modifica. El iPhone utiliza un archivo PNG real; ya no se incrusta la imagen anterior en la página. El servicio de caché incorpora el nuevo recurso.

### 6.9.6 — Comprobación segura de protección de cuenta

Se añade el botón «Comprobar protección de mi cuenta (sin borrar datos)» en Compartidos, tanto dentro como fuera de un grupo. El servicio Edge `bv-delete-account` v3 admite `action: check` autenticado, consulta pertenencia y referencias históricas, devuelve bloqueo (409) o aptitud preliminar (200) y nunca ejecuta el borrado para esa acción. La baja definitiva sigue exigiendo contraseña y confirmación. Se incorporan pruebas aisladas con simuladores, incluidas pruebas de bloqueo, fallo de base de datos y contraseña incorrecta. Ninguna prueba crea o borra cuentas reales.

### 6.9.7 — Auditoría de aislamiento y privacidad

Las seis tablas de Compartidos cuentan con comprobaciones automáticas reales de acceso anónimo, ejecutadas en GitHub Actions sin credenciales ni modificaciones. Se actualizan la política de privacidad y el soporte para explicar la baja de cuenta disponible y sus límites. Se documentan los avisos de Supabase, la protección de contraseñas filtradas (requiere plan Pro) y los bloqueos que impiden considerar lista la app para App Store. Se sincronizan versión, icono y caché de la PWA.
