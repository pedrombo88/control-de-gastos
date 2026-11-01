# Control de Gastos — prototipo móvil v1

**Objetivo:** aplicación de gestión personal de gastos e ingresos para iPhone y futura comercialización.

## Estado

- Prototipo web instalable (PWA), **todavía no es una app publicada en la App Store**.
- Gestión de movimientos, categorías, presupuestos, gráficos, búsqueda, exportación CSV e importación/exportación JSON.
- No hay transferencias entre cuentas (requisito del producto).
- Los datos personales permanecen en `localStorage` del navegador del dispositivo; no existe sincronización ni cuenta en nube. La copia de seguridad manual es importante. Cambiar de navegador, dominio o borrar datos del sitio puede dejar inaccesibles los registros de ese origen.
- Se mantiene la clave heredada `saldo-diario-data-v1` para evitar pérdida de datos al actualizar el nombre en el **mismo origen web**. No renombrar esa clave sin migración.

## Probar desde iPhone

1. Subir **los archivos de esta carpeta** a la raíz de un repositorio público `control-de-gastos`.
2. En GitHub: Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save.
3. Abrir `https://USUARIO.github.io/control-de-gastos/` con Safari.
4. Compartir → Añadir a pantalla de inicio. El icono se mostrará como Control de Gastos.
5. Hacer varios movimientos de prueba y exportar una copia de seguridad.

## Antes de comercializar

- Verificar disponibilidad del nombre y posibles marcas en la OEPM y en el App Store.
- Realizar pruebas en dispositivos físicos, seguridad, privacidad, accesibilidad, compatibilidad y política de recuperación de datos.
- Definir modelo comercial, soporte y documentación de protección de datos.
- Desarrollar una aplicación iOS con experiencia suficientemente nativa (por ejemplo con Expo/React Native) para cumplir los requisitos de App Review. Una PWA no aparece por sí misma en la App Store.
- Preparar cuenta Apple Developer, capturas, política de privacidad y ficha de la tienda.

## Privacidad y publicación del código

GitHub Pages del plan gratuito normalmente requiere publicar el sitio desde un repositorio **público** (el código se puede ver). Para reservar el código como propietario, mantener una copia en repositorio privado y elegir otro mecanismo de previsualización/despliegue antes del lanzamiento.

**Licencia:** No se concede aquí ninguna licencia para reutilizar ni redistribuir el código. No contiene credenciales.