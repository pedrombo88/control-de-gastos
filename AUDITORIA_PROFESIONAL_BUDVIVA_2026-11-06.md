# Budviva — Auditoría profesional técnica, funcional y de publicación
**Fecha:** 6 de noviembre de 2026  
**Repositorio:** `pedrombo88/control-de-gastos` · **PWA auditada:** 6.9.10 beta · **Proyecto nativo:** SwiftUI 1.0 beta  
**Entorno:** GitHub Pages + Supabase Compartidos · **Estado:** beta, **NO LISTA PARA APP STORE**.

> Auditoría interna sobre código, pruebas de CI, reglas de almacenamiento y permisos de Supabase. No sustituye una auditoría de penetración externa, una revisión jurídica, las pruebas con un iPhone real ni la aprobación de Apple.

## 1. Resumen ejecutivo

**Resultado:** la PWA está suficientemente estructurada y tiene controles de seguridad adecuados para continuar la beta. La navegación principal, los movimientos, presupuestos, ahorro, importaciones, originales y Compartidos están implementados. Hay pruebas automatizadas de los cálculos, CSV, cifrado, PDF, OCR y una suite móvil con Chromium y Axe. Durante esta auditoría se han corregido defectos reales sin borrar datos.

**Conclusión:** **APTA PARA SEGUIR PROBANDO COMO PWA BETA**, pero todavía **NO APTA PARA LANZAMIENTO COMERCIAL EN APP STORE**. La app nativa no es equivalente a la PWA, faltan firma/identidad de publicación, QA real, canal privado de soporte, cumplimiento legal definitivo y validación de correo para las cuentas.

### Matriz de alcance y evidencia

| Área | Verificación efectuada | Estado |
|---|---|---|
| Inicio y navegación | Cinco apartados ordenados: Inicio, Movimientos, Presupuestos, Ahorro y Ajustes. Pruebas automáticas con viewport de iPhone | Apto en entorno simulado |
| Movimientos | Alta, edición, borrado, importación y CSV con neutralización de fórmulas | Automatizado; formatos externos reales pendientes |
| Presupuestos | Límites por categoría, umbrales y avisos; pruebas UI | Apto en entorno simulado |
| Ahorro | Análisis de productos necesarios/prescindibles, objetivos y aportaciones | Apto en entorno simulado; no implica ahorro garantizado |
| Importar y documentos | OCR Tesseract ES y PDF.js locales, originales en IndexedDB, copia JSON/cifrada | Pruebas automatizadas; falta Safari/iPhone real y diversos bancos |
| Integridad y recuperación | Datos personales en `saldo-diario-data-v1`, originales IndexedDB, copias de seguridad, protección entre pestañas y rescate en error | Implementado; sin sincronización ni copia automática |
| Compartidos | Supabase con RLS, doble autorización para cierre, exportación común, OTP y baja protegida | Anónimo comprobado; autorización cruzada y correo real pendientes |
| Accesibilidad | Axe WCAG en cinco apartados de cuatro temas, controles de Compartidos y ancho de 320 px | Pruebas automatizadas; VoiceOver físico pendiente |
| Rendimiento y PWA | Service worker con caché versionada, navegación de red primero y modo offline; dependencias OCR/PDF cargadas bajo demanda | Comprobado a nivel de código y Chromium; Safari pendiente |
| iOS nativo | Proyecto SwiftUI sin contenedor web, compilación macOS, XCTest y captura en simulador confirmados | Compilación verde; sin firma, TestFlight, QA físico ni Compartidos |

## 2. Correcciones aplicadas durante esta auditoría

| Referencia | Hallazgo | Solución implantada |
|---|---|---|
| FIX-01 | El botón de actualizar usaba `v=6.2.1` pese a que Budviva estaba en 6.9.x | La actualización utiliza `APP_VERSION`, sincronizada por pruebas con `package.json` |
| FIX-02 | Actualizar borraba **todas** las cachés, con riesgo de dejar inoperativa la PWA sin conexión | Se elimina el borrado manual; el SW gestiona solo sus propias cachés y no fuerza recarga sin conexión |
| FIX-03 | Dos pestañas podían sobrescribir movimientos con una copia obsoleta de `localStorage` | Control de versión del contenido persistido y rechazo de guardado de una pestaña obsoleta; aviso de actualizar |
| FIX-04 | Restaurar una copia desde una pestaña obsoleta podía sustituir los originales de IndexedDB | Comprobación de conflictos antes de reemplazar los documentos |
| FIX-05 | Un JSON local dañado impedía exportar una copia desde la interfaz | Opción excepcional **Descargar datos para recuperación**: exporta el contenido bruto a TXT sin modificarlo |
| FIX-06 | Compartidos no establecía una política específica de restricciones de scripts/conexiones | Meta-CSP: scripts del mismo origen y conexión de datos únicamente a Supabase; no autoriza scripts externos |
| FIX-07 | Axe detectó contraste insuficiente en textos de la pantalla de Compartidos | Colores ajustados y comprobación WCAG en CI |
| FIX-08 | Faltaba control de desbordamiento horizontal a 320 px y de concurrencia/offline | Nuevas pruebas Playwright de accesibilidad, anchura móvil, dos pestañas, actualización offline y rescate |

**Los fixes no migran ni borran `saldo-diario-data-v1`; no modifican grupos ni usuarios de Supabase.** Los registros de prueba de Compartidos ya se eliminaron antes de esta auditoría por autorización del titular y no se recrearon.

## 3. Hallazgos pendientes ordenados por severidad

### P0 — Bloquean la comercialización

| ID | Riesgo / evidencia | Criterio de cierre |
|---|---|---|
| P0-01 | **No existe IPA firmada, distribución TestFlight ni alta definitiva.** `ios-native/project.yml` utiliza `com.example.budviva`. | Bundle ID propio, equipo de firma, build firmado, TestFlight y ficha completa en App Store Connect |
| P0-02 | **Paridad nativa incompleta:** SwiftUI no implementa Compartidos, autenticación ni sincronización Supabase. La PWA sí. | Incorporar Compartidos a iOS o lanzar nativa con alcance expresamente limitado, sin prometer paridad |
| P0-03 | **QA físico no realizado:** permisos de cámara, OCR, documentos, VoiceOver, almacenamiento lleno, reinstalación y restauración en iPhone real. | Matriz de pruebas de aceptación superada en iPhone y, en su caso, TestFlight |
| P0-04 | **Información legal y soporte incompletos:** política beta sin identificación final del responsable; no hay canal privado de soporte confirmado. | Revisar RGPD/AEPD, responsable, contacto, plazos, destinatarios, derechos y política definitiva |
| P0-05 | **Correo OTP de Compartidos no validado en condiciones reales** y sin evidencia de SMTP operativo. La baja protegida está implementada pero no probada extremo a extremo. | Enviar/recibir código con cuenta de ensayo, probar acceso, bloqueo, baja autorizada y rechazo posterior sin tocar cuentas ajenas |
| P0-06 | **Operativa App Store:** marca Budviva, metadatos, privacidad, declaración de cifrado, política de compras/monetización y cuenta de prueba para revisión. | Decisiones comerciales y documentación aprobadas por el titular |

### P1 — Prioridades técnicas antes de escalar

| ID | Hallazgo | Tratamiento |
|---|---|---|
| P1-01 | Datos financieros personales principalmente en `localStorage`, sin cifrado de almacenamiento propio, copia automática ni sincronización entre dispositivos. | Evaluar copias automáticas locales seguras, recuperación opcional, cifrado en reposo y límites de Safari; no prometer sincronización |
| P1-02 | La PWA principal concentra ~137 KB de HTML/JS/CSS con scripts embebidos; no tiene una CSP estricta de `script-src`. | Extraer módulos y adoptar CSP sin `unsafe-inline`, comprobar OCR/PDF/WASM y compatibilidad Safari |
| P1-03 | Concurrencia entre pestañas mejorada con rechazo de cambios obsoletos, pero `localStorage` carece de transacciones multipestaña. | Ensayar contención intensiva; considerar API Web Locks cuando sea compatible o almacenamiento transaccional |
| P1-04 | Extractos bancarios y OCR dependen de heurísticas y pueden interpretar mal importes, cobros y fechas. | Test corpus por entidad bancaria y revisión explícita de todos los cargos antes de guardar |
| P1-05 | Parte de OCR/PDF requiere cargar activos locales pesados la primera vez; el precache offline cubre solo el núcleo. | Probar carga inicial sin red y comunicar que OCR no está garantizado hasta descargar recursos |
| P1-06 | RLS está probada frente a accesos anónimos, pero faltan pruebas reales de aislamiento **entre dos usuarios autenticados independientes**. | Crear cuentas desechables aisladas, comprobar rechazo de lectura/escritura/RPC ajenas y limpiar fixtures |
| P1-07 | Protección de contraseñas filtradas desactivada en Supabase Free (la función requiere Pro). | Decidir plan y controles compensatorios, límites de acceso y validación de seguridad de contraseñas |

### P2 — Deuda de mantenimiento y producto

- Internacionalización: interfaz actual en español; no certificar otros idiomas.
- Modularizar `index.html` sin perder compatibilidad con las instalaciones PWA y sus datos.
- Revisar peso del repositorio y activos OCR multiarquitectura **sin eliminarlos por error**; se cargan bajo demanda.
- Instrumentar errores con métricas que no incluyan información financiera privada, con consentimiento cuando corresponda.
- Completar verificación de disponibilidad de marca y diferenciación comercial respecto de otras apps de finanzas.

## 4. Auditoría de seguridad de Supabase

**Comprobado:** ningún dato financiero compartido se devuelve a peticiones anónimas sobre las seis tablas; Edge Function rechaza acciones sin sesión; el cliente solo tiene la clave pública `sb_publishable_`, nunca la clave administrativa. La eliminación requiere sesión, comprobación de referencias financieras y contraseña válida u OTP verificado para la misma cuenta.

Los asesores de Supabase mantienen:

1. **WARN — 6 funciones `SECURITY DEFINER` ejecutables por `authenticated`** para operaciones deliberadas de Compartidos. Se revisaron sus comprobaciones de identidad, pertenencia y `search_path`; no se recomienda revocarlas sin rediseñar la app. [Explicación de Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
2. **WARN — Protección de contraseñas filtradas desactivada** en el plan gratuito. [Documentación oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
3. **INFO — `bv_invitations` con RLS sin políticas**: el acceso directo queda denegado y la invitación pasa por RPC autorizada. [Documentación](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
4. **INFO de rendimiento — índices sin uso** en tablas ahora vacías de pruebas. No se deben borrar índices solo por ausencia de consultas recientes.

**Limitaciones:** no hay pentest externo ni prueba completa de SMTP/OTP con cuentas reales desechables. La nueva CSP solo cubre Compartidos; la app principal necesita refactorizar scripts para endurecerla.

## 5. Accesibilidad y diseño

- La navegación está distribuida en cinco destinos; importa, recurrentes y estadísticas no duplican menús de Ajustes. Ahorro distingue simulación de objetivos reales.
- Cuatro temas disponibles, sin atribuir traducciones que no existen. Botones y campos de Compartidos usan alturas de al menos 44–46 px.
- Los nuevos tests automatizados han detectado y permitido corregir una infracción de contraste en el texto informativo y el encabezado de Compartidos.
- La aplicación debe validarse manualmente con **VoiceOver, texto grande, orientación, zoom y modo oscuro** en iPhone antes de comercializar. La prueba de Axe/Chromium no equivale a certificación WCAG.

## 6. Publicación iOS — contraste con directrices oficiales

Apple exige, entre otros controles:
- App terminada, datos y metadatos completos y cuenta de demostración si la funcionalidad requiere inicio de sesión (2.1).
- Funciones y experiencia que vayan más allá de empaquetar un sitio web (4.2).
- Política de privacidad accesible y eliminación de cuenta dentro de la app si permite crearla (5.1.1).

Fuentes: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) · [App Review](https://developer.apple.com/app-store/review/).

**Estado real:** el [workflow iOS 42192300875](https://github.com/pedrombo88/control-de-gastos/actions/runs/42192300875) ha terminado con resultado **SUCCESS**: generación de proyecto e icono, compilación sin firma, compilación y ejecución de XCTest, instalación y captura de inicio en simulador. Aun así, faltan firma de distribución, TestFlight, las funciones de Compartidos en SwiftUI, validación física y aprobación de Apple.

## 7. Criterios verificables de cierre de la auditoría

1. Las pruebas de JavaScript y la UI móvil (incluyendo recuperación y accesibilidad) deben pasar en el commit final de publicación.
2. Las versiones del HTML, service worker, manifiesto e iconos deben coincidir; la opción de actualizar no debe borrar caché o finanzas en modo offline.
3. Iniciar sesión, registrar/editar/importar y restaurar una copia sin pérdida de originales; probar varios dispositivos y tamaños.
4. Alta y baja de cuenta de ensayo por contraseña y correo OTP, rechazos de acceso cruzado y ausencia de datos residuales.
5. Compilación iOS reproducible, tests en simulador y batería de aceptación en un iPhone físico.
6. Política legal, titularidad, soporte privado y App Store Connect completos antes del envío.

**Validación de la versión 6.9.10:** el pipeline de JavaScript/seguridad está verde, la [ejecución 42192880559](https://github.com/pedrombo88/control-de-gastos/actions/runs/42192880559) ha superado **20 pruebas de interfaz móvil** en Chromium, incluidas la recuperación de datos dañados, la protección entre pestañas, el acceso a Compartidos y el contraste. El servicio web y la firma/distribución iOS siguen siendo controles independientes.\n\n### Evidencias y enlaces

- [PWA beta](https://pedrombo88.github.io/control-de-gastos/) · [Compartidos](https://pedrombo88.github.io/control-de-gastos/compartidos.html)
- [Pruebas móviles](./tests/auditoria-integridad.ui.spec.cjs) · [Accesibilidad Compartidos](./tests/accesibilidad-compartidos.ui.spec.cjs) · [OTP móvil simulado](./tests/compartidos-otp.ui.spec.cjs)
- [Pruebas de release](./tools/check-web.cjs) · [Test de seguridad anonimizada](./tests/anonymous-rls.test.cjs)
- [Seguridad de Compartidos](./AUDITORIA_SEGURIDAD_COMPARTIDOS_2026-11-06.md) · [Expediente iOS](./ios-native/RELEASE.md)

**Veredicto final:** beta web útil y mejorada; **no publicar comercialmente aún**. Mantener la diferenciación entre controles confirmados, simulaciones y validaciones externas pendientes.
