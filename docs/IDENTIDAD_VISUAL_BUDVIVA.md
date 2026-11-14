# Budviva · Identidad visual 2026-11-14

Logotipo elegido: letra B blanca sobre azul noche y flecha turquesa, **sin barras**.

- `icon.svg` — favicon, manifiesto web e icono maestro para generar el PNG de iOS.
- `brand-symbol.svg` — símbolo transparente para la cabecera web y Compartidos.
- `brand-logo.svg` — versión horizontal para materiales y páginas corporativas.
- `apple-touch-icon.png` — icono Apple de 180 × 180 píxeles, sin transparencia.
- `ios-native/tools/generate-icon.py` — crea el AppIcon y el recurso de cabecera SwiftUI desde `icon.svg`; se ejecuta en GitHub Actions antes de compilar.

Colores: azul noche `#09234B`, turquesa `#10D8C3` y blanco `#FFFFFF`.

**Actualización del iPhone**: la PWA instalada debe actualizar el service worker (puede hacerlo en Ajustes → Comprobar actualizaciones). El icono de la pantalla de inicio puede requerir retirar **solo el acceso directo** y volver a añadirlo desde Safari; no borrar los datos de Safari. La app SwiftUI exige compilar e instalar una nueva IPA con el icono actualizado.

Esta integración actualiza la identidad visual; no cambia la lógica financiera, datos ni autenticación. La imagen vectorial es una reconstrucción del diseño aprobado, no la extracción exacta del arte original.
