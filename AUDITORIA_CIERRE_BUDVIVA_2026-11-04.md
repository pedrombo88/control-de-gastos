# Cierre técnico provisional de la auditoría de Budviva

**Fecha:** 4 de noviembre de 2026 · **PWA:** 6.1 beta · **iOS:** proyecto SwiftUI 1.0 beta · **Estado de publicación:** NO PUBLICADA / NO ENVIABLE TODAVÍA.

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
