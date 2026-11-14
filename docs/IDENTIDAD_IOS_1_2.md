# Budviva · Identidad final y navegación iOS 1.2

## Marca
Imagen maestra `brand-approved.png`: recorte del icono original aceptado, con B blanca y flecha turquesa, sin barras. Nunca reconstruir la B mediante rutas SVG alternativas. Su geometría y color se mantienen en web, PWA, pantalla de inicio, app y recursos nativos.

El icono iOS 1024x1024 se genera desde la misma imagen maestra mediante `ios-native/tools/generate-icon.py`; no editar otra fuente separada. El archivo entregado de 192 px es una copia comprimida para el repositorio; la imagen original de presentación sigue disponible para producir versiones a mayor resolución.

## iPhone
Seis pestañas visibles: Inicio, Movimientos, Presupuestos, Ahorro, Compartidos, Ajustes. Para evitar el menú automático «Más» de TabView, se usa una barra personalizada con `safeAreaInset`.

Acceso con código OTP de 6 dígitos de Supabase Auth antes de ver los datos. Inicio de sesión existente y alta de cuenta independientes. Las credenciales persistentes se guardan en el llavero local, sin contraseñas guardadas ni claves de administración. En la beta, Compartidos sigue utilizando SFSafariViewController con sesión web independiente. Los movimientos financieros del teléfono no se sincronizan a través de la cuenta; permanecen locales.

Temas conservando IDs de configuración: Azul polar (oceano), Blanco coral (esmeralda), Negro y oro (arena), Negro violeta (noche).

La actualización no borra `finance.json` ni los originales. Haz copia de seguridad antes de actualizar una IPA instalada con AltStore.
