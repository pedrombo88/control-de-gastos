# Cierre técnico provisional de la auditoría de Budviva

**Fecha:** 4 de noviembre de 2026 · **PWA:** 6.2 beta · **iOS:** proyecto SwiftUI 1.0 beta · **Estado de publicación:** NO PUBLICADA / NO ENVIABLE TODAVÍA.

## Resultado de las correcciones

| Hallazgo inicial | Trabajo aplicado | Estado |
|---|---|---|
| Interfaz con demasiadas funciones repetidas | Inicio resumido; Movimientos reúne Importar, Recurrentes y Estadísticas; alertas en Presupuestos; dos subvistas en Ahorro; Ajustes simplificado | Implementado, requiere validación visual iPhone |
| Origen de tickets sin conservar | IndexedDB en web y archivos locales protegidos en iOS, asociados a movimientos; consulta y borrado de originales | Implementado, requiere prueba con tickets reales |
| Copias incompletas o vulnerables | Copias completas con adjuntos; copias opcionales AES-256-GCM/PBKDF2; vector de compatibilidad; restauración con validaciones y reversión | Implementado, pruebas locales/CI parciales |
| Riesgo por PDF.js antiguo y scripts externos | Recursos Tesseract y PDF.js 6.5.438 empaquetados en `vendor/`; hashes SHA-256; scripts desde mismo origen; PDF.js con eval desactivado | Implementado en código; probar con PDF y Safari reales |
| Web sin verificaciones automáticas | GitHub Actions para JS, cálculos, importación, cifrado, recursos de terceros y manifest | Implementado; consultar resultado del último workflow |
| Web empaquetada no adecuada como app iOS | Proyecto nativo SwiftUI con Vision OCR, PDFKit, cámara, gráficos, presupuestos, ahorro y ajustes | Compilación simulador de una revisión anterior superada; última revisión/XCTest pendiente |
| Icono comercial | Script de icono RGB opaco 1024 × 1024 sin AppKit, recurso AppIcon y generación en la nube | Generación probada en GitHub Actions |
| Privacidad/documentación | Páginas públicas de privacidad/soporte, README y expediente de publicación iOS | Provisionales: falta titular legal y canal privado real |
| Compatibilidad histórica | Clave `saldo-diario-data-v1` e ID PWA preservados; modelos para importar copias JSON antiguas | Implementado; prueba cruzada en dispositivos pendiente |

## Enlaces de trabajo

- [Aplicación web](https://pedrombo88.github.io/control-de-gastos/?v=6.1)
- [GitHub Actions: auditoría automática](https://github.com/pedrombo88/control-de-gastos/actions/workflows/verify.yml)
- [GitHub Actions: compilación nativa iOS](https://github.com/pedrombo88/control-de-gastos/actions/workflows/ios-build.yml)
- [Expediente App Store, ficha y checklist](./ios-native/RELEASE.md)
- [Auditoría original](./AUDITORIA_BUDVIVA_2026-11-04.md)

## Qué sigue bloqueando un lanzamiento responsable

1. **Compilación de la revisión iOS final y ejecución de XCTest en simulador:** pendiente de confirmación en el último commit.
2. **QA en iPhone físico:** cámara, importación, escaneo real, denegación de permisos, VoiceOver, tamaños de letra, espacio agotado, restauración y carga de PDF reales.
3. **Titular y cuenta Apple Developer:** configurar identificador de paquete definitivo, equipo de firma, contratos y App Store Connect. `com.example.budviva` es solo un identificador de desarrollo.
4. **Protección de datos/soporte legal definitivo:** identidad del responsable, canal privado de atención, revisión RGPD, información precisa del tratamiento y cuestionario de privacidad.
5. **Marca:** confirmar disponibilidad de Budviva en OEPM/EUIPO/App Store.
6. **Metadatos reales:** capturas de simulador/dispositivo, clasificación por edades, cumplimiento de exportación de cifrado y textos finales.
7. **Idiomas:** la aplicación actual es española; no publicitar inglés u otros idiomas antes de completar la traducción y los formatos locales.

**Decisión:** mantener Budviva como beta de prueba. No publicar ni introducir credenciales reales de Apple en el repositorio. Los cambios de código no equivalen a aprobación por Apple ni sustituyen la auditoría física y legal.


## Ampliación de auditoría (continuación)

**Web Budviva 6.2 — comprobaciones adicionales realizadas:**

- **Almacenamiento de originales:** importación y adjuntar documentos a un movimiento manual, consulta en IndexedDB, conservación de referencias y exportación en copia completa. En GitHub Actions existe una **prueba móvil con Chromium aprobada** que cubre adjuntar un justificante de prueba, visualizarlo y comprobar que el JSON exportado contiene el archivo original en base64.
- **Copias de seguridad:** cifrado AES-256-GCM con derivación PBKDF2-SHA256; pruebas de descifrado, contraseña errónea y detección de alteraciones. La restauración de JSON antiguo descarta referencias inexistentes; la restauración con archivos valida que estén incluidos y devuelve el estado previo si falla el guardado.
- **Bibliotecas locales:** Tesseract 5.1.1, núcleo OCR 5.0.0, datos de idioma español y PDF.js 6.5.438. Recursos servidos por GitHub Pages en origen propio, sin inyección de código de CDN; verificación de SHA-256 integrada en el control de release.
- **Limpieza de archivos:** 28 archivos de versiones V4, V5 y V6, antiguo comprobador y fuentes duplicadas han desaparecido de la rama de publicación; permanecen en el historial del repositorio.
- **Pruebas:** verificación automatizada Node y pruebas móviles Playwright con ejecución correcta. Se ha añadido además análisis WCAG automatizado; su último resultado se debe consultar en el workflow, no debe asumirse superado.
- **iOS nativa:** compilación para simulador y `build-for-testing` XCTest con ejecución correcta en un commit; workflow posterior preparado para ejecutar los tests dentro de simulador. Las modificaciones siguientes necesitan revalidación.
- **Otros controles:** documentación de privacidad y ayuda actualizada, AppIcon generado automáticamente, fichas de App Store y matriz de aceptación documentadas.

**Limitación de esta evidencia:** Chromium móvil en GitHub Actions no sustituye Safari real, VoiceOver ni los permisos de cámara de un iPhone. La prueba de restauración completa con documentos reales entre Safari e iOS está pendiente.


## Auditoría final de accesibilidad, OCR y SDK (4 de noviembre de 2026)

- **20 combinaciones de accesibilidad automatizadas aprobadas:** cinco secciones por cuatro temas (Océano, Esmeralda, Arena y Noche), sin infracciones graves/críticas en los controles WCAG de axe-core Playwright. Correcciones en contraste, barras de progreso y avisos.
- **9 pruebas Playwright móvil aprobadas:** navegación, movimiento registrado, copia cifrada, adjuntar y consultar documentos, copia completa con originales, PDF.js leyendo un PDF generado de prueba y Tesseract.js leyendo un PNG sintético con texto de ticket y un importe de 12,34 euros. Solo se valida Chromium móvil, no Safari físico.
- **Pruebas SwiftUI:** 6 XCTest ejecutadas correctamente en simulador iPhone 16 Pro (iOS 18.5), Xcode 16.4, incluido vector compartido de copia cifrada. La revisión posterior contiene dos nuevas pruebas de restauración por revalidar.
- **Requisito Apple para subir apps:** desde 28 de abril de 2026 se exige Xcode 26+ con SDK iOS 26+. El workflow ha pasado a **Xcode 26.3**; la nueva ejecución debe terminar correctamente antes de habilitar cualquier lanzamiento. Referencia: https://developer.apple.com/news/upcoming-requirements/
- **Capturas visuales:** flujo de GitHub Actions preparado para conservar capturas de las cinco secciones y del tema Noche, y de la pantalla Inicio en simulador iPhone. No confundir capturas técnicas con materiales de marketing aprobados.
- **Control de ejecuciones:** CI web e iOS con `concurrency` para evitar acumulación de pruebas obsoletas en futuros cambios. Algunos trabajos anteriores ya en cola no están bajo la nueva política.

### Restricciones que continúan abiertas

- Ensayo en Safari real, OCR de fotografías reales y permisos de cámara denegados.
- Capturas y revisión visual/manual en iPhone físico y VoiceOver; el escáner automático no garantiza accesibilidad universal.
- Pruebas completas PWA→iOS→PWA con copias reales y ficheros múltiples.
- Identificador de paquete definitivo, firma Apple, TestFlight y aprobación oficial.
- Revisión jurídico-comercial, responsabilidad RGPD, disponibilidad de la marca y canal privado de soporte.
- Traducciones y localización adicionales al español: **no se debe publicitar soporte multilingüe como terminado**.
