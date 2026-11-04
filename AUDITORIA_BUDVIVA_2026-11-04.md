# Auditoría profesional de Budviva — 4 de noviembre de 2026

> **Actualización técnica (6.2.2):** este documento conserva el análisis histórico de la versión 5.8. No debe interpretarse su listado P0 como el estado actual del código. En 6.2.1 ya constan archivos originales almacenados en IndexedDB, copias cifradas opcionales, dependencias OCR/PDF empaquetadas localmente, pruebas automatizadas y un proyecto iOS nativo con compilación cloud sin firma. En 6.2.2 se ha corregido además la correspondencia entre páginas y caché offline del service worker. **Sigue pendiente la validación real en Safari/iPhone, TestFlight, la firma y distribución iOS y los requisitos legales/comerciales definitivos.** Estas mejoras se han comprobado por inspección del repositorio; no equivalen a una auditoría externa ni a una publicación aprobada.


**Versión revisada:** Budviva 5.8 (beta) · **Repositorio:** `pedrombo88/control-de-gastos` · **Plataforma actual:** PWA estática distribuida mediante GitHub Pages.

**Veredicto:** **NO APTA TODAVÍA PARA ENVÍO A APP STORE**. La estructura y las funciones principales permiten continuar la beta y realizar pruebas en iPhone, pero no sustituyen una compilación nativa, una auditoría legal y de seguridad ni pruebas reales con usuarios y dispositivos. No se ha enviado ninguna aplicación a Apple.

## 1. Alcance y límites

Revisión de `index.html`, `stats.js`, `smart-import.js`, `recurring.js`, `reconcile.js`, `sw.js`, `manifest.webmanifest` y lógica de objetivos de ahorro. Se examinaron persistencia, navegación, duplicidades, validación de formularios, simulaciones financieras, dependencias y actualización PWA.

**Pruebas realizadas en esta sesión:** inspección estática y pruebas de ejecución simulada de navegación/estado, parsers CSV/tickets, cálculos y escenarios de almacenamiento corrupto. **No se ha ejecutado una batería real de VoiceOver, Safari físico con V5.8, OCR con documentos bancarios reales, test de penetración ni revisión oficial de Apple.** GitHub refleja los cambios; la propagación de GitHub Pages no se ha podido confirmar desde el comprobador web.

## 2. Limpieza e información organizada — APLICADA

| Apartado | Contenido definitivo | Cambios |
|---|---|---|
| **Inicio** | Balance, registrar gasto, escanear ticket, avisos relevantes, resumen de meta si existe, avance del ahorro estimado, últimos movimientos | Eliminados gráfico duplicado, evolución, publicidad interna de recurrentes, importación repetida y consejos genéricos |
| **Movimientos** | Historial, búsqueda, filtros y tres accesos: Importar, Recurrentes, Estadísticas | Se trasladan aquí estas herramientas; ya no se buscan en Ajustes |
| **Presupuestos** | Gastado vs. límite, límites por categoría, avisos y configuración del porcentaje (70/80/90) | La configuración de alertas sale de Ajustes |
| **Ahorro** | Subvistas **Analizar compras** y **Mis objetivos** | Separadas la simulación y clasificación de tickets de las metas, aportaciones y calendario |
| **Ajustes** | Copias/exportación, temas, actualización, instalación si procede, privacidad/soporte y borrado de datos | Eliminadas las funciones financieras duplicadas y la opción destructiva de datos demo |

Cambios adicionales: etiquetas internas `V2/V3/V4` retiradas de pantallas de usuario, iconografía del importador simplificada, CSS estadístico sin uso eliminado, campos de tickets adaptados a pantallas pequeñas, fondos en tema oscuro corregidos y controles con foco visible. El menú mantiene cinco pestañas y los datos existentes.

## 3. Incidencias prioritarias para publicación

### P0 — Impiden recomendar el lanzamiento

| ID | Hallazgo y evidencia | Acción necesaria |
|---|---|---|
| P0-01 | **No existe un paquete iOS firmado ni flujo de distribución App Store.** El repositorio ofrece HTML/PWA. | Elegir arquitectura iOS real, preparar firma, identificador, compilación, TestFlight y revisión. Apple evalúa valor diferencial más allá de una web empaquetada (4.2). |
| P0-02 | **Datos financieros en `localStorage`** sin sincronización, cifrado propio ni recuperación automática. Pueden perderse al borrar datos del sitio o cambiar de dispositivo. | Diseñar estrategia fiable de persistencia (p. ej. IndexedDB para documentos), copias y recuperación; decidir cifrado y sincronización opcional antes de vender. |
| P0-03 | **OCR/PDF descargan scripts externos en tiempo de uso** (`smart-import.js`): Tesseract.js desde jsDelivr y PDF.js desde cdnjs. No hay política CSP estricta ni verificación SRI explícita en esa carga dinámica. | Fijar dependencias, empaquetar localmente los recursos, revisar vulnerabilidades y endurecer política de contenidos sin romper OCR. Validar tráfico de red. |
| P0-04 | **La información legal/comercial sigue incompleta.** Existen `privacidad.html` y `soporte.html` orientativos, pero faltan responsable del tratamiento identificado, revisión jurídica y canal privado real de soporte. GitHub Issues es público y exige cuenta. | Completar identidad/contacto, política legal definitiva, ficha de privacidad de App Store y obligaciones aplicables en España/UE. |
| P0-05 | **No se guardan originales de tickets ni PDF**, solo datos extraídos de compras. Esto no cumple todavía el requisito funcional previo de conservar los documentos fuente. | Implementar almacenamiento local de originales con límites/gestión de espacio, exportación/restauración y borrado seguro; comprobar consentimiento y privacidad. |
| P0-06 | **No se ha validado V5.8 en dispositivos iOS con QA formal**. No existe un registro de pruebas reales de cámara, OCR, documentos bancarios, reinstalación, recuperación y accesibilidad. | Ejecutar matriz de pruebas en iPhones reales y TestFlight, medir tiempos, comprobar errores y bloquear publicación hasta resolver los fallos críticos. |

### P1 — Alta prioridad antes de venta

| ID | Hallazgo | Trabajo previsto |
|---|---|---|
| P1-01 | `index.html` concentra mucho CSS y JS y conserva módulos externos antiguos duplicados (`goals.js`, `savings.js`, `savings.css`) por compatibilidad con versiones previas. | Modularizar la app después de estabilizar la migración de la PWA; retirar versiones antiguas sin romper instalaciones existentes. |
| P1-02 | Faltan tests automáticos en repositorio, CI y revisión de dependencias continua. | Pruebas unitarias/integración, pruebas visuales, regresión bancaria y CI. |
| P1-03 | Solo hay contenido ES pese a haberse planteado internacionalización. | Sistema i18n, traducciones y formatos de fecha/moneda; no presentar otros idiomas como disponibles. |
| P1-04 | Exportaciones JSON/CSV sin cifrar y sin advertencia del sistema al compartir. | Evaluar protección opcional de copias sensibles y documentar prácticas recomendadas. |
| P1-05 | Los parsers de extractos son heurísticos, especialmente en PDF, y no garantizan reconocer correctamente cargos y abonos de todos los bancos. | Pruebas con formatos representativos, revisión obligatoria, límites claros y prevención de duplicados. |
| P1-06 | Faltan auditorías sistemáticas de VoiceOver, contraste en los cuatro temas, tamaños dinámicos de letra y gestos. | Revisar WCAG 2.2 AA / guías de accesibilidad iOS y corregir problemas de uso reales. |
| P1-07 | Iconografía PWA basada en SVG; no está preparado el conjunto de activos específicos de App Store. | Icono App Store 1024×1024 PNG, capturas reales, metadatos, clasificación por edad y soporte. |
| P1-08 | Disponibilidad legal de **Budviva** todavía no acreditada. | Comprobación de marcas OEPM/EUIPO, dominio y tiendas antes de invertir en la marca comercial. |

### P2 — Mantenimiento

- Las rutas públicas `pruebas-v4`, `pruebas-v5`, `pruebas-v6` y `comprobar-v4.html` son artefactos antiguos. No participan en la navegación principal, pero conviene archivarlos fuera del sitio público antes del lanzamiento.
- Normalizar los nombres internos `Control de Gastos`, `CGStats`, etc., en una refactorización controlada. **No renombrar** `saldo-diario-data-v1` ni el ID PWA `./` sin migración compatible.
- Revisar rendimiento y consumo de memoria al importar varios documentos, porque los recursos OCR y PDF pueden ser pesados.
- Revisar cuándo se muestra la opción PWA de instalación/actualización una vez exista app iOS nativa.

## 4. Seguridad y protección de datos

Puntos favorables identificados:
- La app no requiere credenciales bancarias ni implementa acceso directo a entidades financieras.
- Los movimientos y productos requieren validación y su representación utiliza funciones de escapado.
- Hay límites de importación y lógica de reconciliación para reducir movimientos duplicados.
- Las exportaciones CSV añaden protección básica frente a celdas interpretadas como fórmulas.
- Se ha añadido **bloqueo de escritura si los datos locales no pueden interpretarse**, evitando sobrescribir silenciosamente contenido potencialmente recuperable; restauración explícita y borrado explícito siguen habilitados.
- Se conserva la procedencia `importSource` en la normalización de copias.

Limitaciones: son observaciones de código, **no una certificación de seguridad**. No se han auditado de forma independiente los CDNs, la privacidad de todos los modelos OCR, ni las políticas y registros del proveedor de alojamiento.

## 5. Pruebas de regresión ejecutadas

**Resultado:** comprobaciones simuladas satisfechas en los escenarios revisados.

Se han verificado:
1. Sintaxis del código JS principal y de módulos.
2. Navegación de cinco pestañas, rutas de Inicio, Movimientos, Presupuestos, Estadísticas y Ajustes.
3. Accesos directos de Inicio hacia **Analizar compras** y **Mis objetivos**.
4. Separación reversible de ambas pantallas de Ahorro.
5. Cálculo de ahorro potencial con productos necesarios/prescindibles.
6. Creación, edición y eliminación de metas y aportaciones (pruebas anteriores).
7. Conservación de transacciones al crear aportaciones (sin duplicar movimientos).
8. Alertas de presupuesto en la pantalla correcta.
9. Ausencia de demostración destructiva y de estadísticas duplicadas.
10. Reconocimiento de gastos e ingresos CSV y extracción básica de productos de ticket.
11. Apertura de datos antiguos, preservando la clave histórica de `localStorage`.
12. Datos locales corruptos bloqueados frente a una escritura accidental.
13. Precaché versión 5.8 y rutas de privacidad y soporte.
14. Identidad PWA `id: "./"` preservada.

**Pendientes de QA real:** estado sin red durante OCR, permisos de cámara, carga de PDF de 10–30 páginas, cientos de transacciones, cierre abrupto, restauración real tras reinstalación, almacenamiento lleno, tema oscuro, tamaño dinámico y VoiceOver.

## 6. Condiciones para solicitar revisión de Apple

- Versión iOS compilada y firmada; probar en TestFlight.
- Alta en Apple Developer Program y documentación comercial.
- Icono/capturas reales y ficha completa en App Store Connect.
- Política de privacidad pública, responsable identificado, soporte funcional y declaración de recogida/uso de datos.
- Diferenciación suficiente respecto a una web mostrada en un contenedor simple, conforme a la directriz 4.2.
- Cero errores críticos de datos, privacidad, importación o accesibilidad en QA real.
- Si se añaden funciones de suscripción de pago dentro de iOS, evaluar la obligatoriedad y las condiciones de In-App Purchase.

No tener Mac **no impide necesariamente** construir la versión iOS: existen servicios de compilación y envío en la nube, pero deben elegirse **según la arquitectura final**. Expo EAS es una opción para un proyecto compatible con Expo/React Native; no convierte por sí solo este HTML/PWA en una app nativa lista para aprobar.

## 7. Referencias oficiales comprobadas

- [App Review Guidelines — Apple](https://developer.apple.com/app-store/review/guidelines/) (especialmente 2.1, 4.2 y 5.1).
- [App Review: fallos frecuentes y enlaces requeridos](https://developer.apple.com/app-store/review/).
- [Privacidad en App Store Connect](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy).
- [Especificaciones de capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).
- [Alta Apple Developer](https://developer.apple.com/help/account/membership/program-enrollment).
- [Expo EAS Build, si se escoge la ruta Expo](https://docs.expo.dev/build/introduction/).

## 8. Siguiente hito recomendado

**Hito de beta estable:** completar originales de tickets/PDF, almacenamiento robusto, QA en iPhone, pruebas automáticas, soporte privado y cierre de privacidad. Después, elegir la arquitectura de distribución iOS y preparar TestFlight.

**Decisión al cierre de esta auditoría:** continuar desarrollo y pruebas beta; **no enviar a App Store** hasta resolver todos los P0.
