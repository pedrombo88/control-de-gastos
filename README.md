# Budviva — Tu dinero, más claro

**Estado:** versión web instalable (PWA) **6.2.2 beta**, en preparación para una futura versión iOS comercial. **No publicada en App Store.**

[Probar Budviva](https://pedrombo88.github.io/control-de-gastos/) · [Privacidad](https://pedrombo88.github.io/control-de-gastos/privacidad.html) · [Ayuda](https://pedrombo88.github.io/control-de-gastos/soporte.html) · [Auditoría para publicación](./AUDITORIA_BUDVIVA_2026-11-04.md)

## Interfaz principal

- **Inicio:** balance del mes, acceso a gasto/ticket, avisos de presupuesto, avance del ahorro y últimas operaciones.
- **Movimientos:** historial, filtros, buscador y accesos a **Importar**, **Recurrentes** y **Estadísticas**.
- **Presupuestos:** límites y alertas con umbrales configurables.
- **Ahorro:** vistas independientes **Analizar compras** (simulación de ahorro potencial) y **Mis objetivos** (aportaciones reales y progreso).
- **Ajustes:** copias JSON, CSV, temas, actualización, privacidad, ayuda y borrado de datos.

La importación admite tickets en imagen y documentos PDF/CSV/TXT con revisión previa. La extracción puede equivocarse. Budviva **conserva los originales asociados a los movimientos** en IndexedDB, también al adjuntarlos manualmente desde la edición de un movimiento y permite incluirlos en copias completas o cifradas. Debes verificar la carga y restauración en Safari antes de confiar en ellos.

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
