# Budviva · Plan de publicación App Store (versión 1.3.1 beta)
**Preparado: 15 de noviembre de 2026** · Proyecto de GitHub: `pedrombo88/control-de-gastos`.

## Situación real
- SwiftUI nativa, iOS 17+, compilación de pruebas sin firma mediante GitHub Actions.
- La instalación con AltStore **no** es TestFlight ni una versión apta para publicar.
- La versión 1.3 incorpora el inicio de sesión OTP de ocho cifras, Compartidos con sesión web independiente, un bloqueo de historial para cuentas distintas en el mismo iPhone y un flujo de eliminación nativo de cuenta con confirmación y reautenticación por correo.
- Importante: el historial personal **no está sincronizado en la nube**. No reutilizar nombres o datos financieros reales para capturas ni demostraciones.
- La baja elimina la cuenta del servidor solo después de superar la protección de referencias a Compartidos; los datos y copias **locales** requieren un borrado distinto. Probar el flujo real con usuarios desechables antes de publicar.
- **Actualmente no hay identidad de firma Apple de producción** y el Bundle ID del proyecto continúa como `com.example.budviva`. No se ha enviado nada a TestFlight ni a App Review.

## Bloqueantes P0 por prioridad
1. **Identidad y protección de datos:** confirmar responsable y datos legales, tratamiento y retención, prestadores, ejercicio de derechos; revisar RGPD/LOPDGDD, permisos y política real. Los textos actuales están marcados como beta. No inventar nombres ni domicilios.
2. **Identidad Apple:** el titular ha elegido inscribirse como **persona física (Individual)** el 15/11/2026. Sigue pendiente confirmar inscripción/membresía activa, reservar Bundle ID propio y crear ficha App Store Connect con el mismo Bundle ID. No sustituir `com.example.budviva` por un valor inventado.
3. **QA de seguridad de cuentas:** probar OTP y caducidad, restauración, cambio de cuenta (bloqueo de exposición de datos), baja por OTP desde Ajustes, bloqueo de bajas con grupos compartidos y limpieza local. Solo cuentas ficticias y copias previas.
4. **Acceso sin cuenta:** se ha añadido un modo de invitado separado de los datos de las cuentas registradas, para cumplir con el principio Apple 5.1.1(v). Probar que permite acceder a las funciones locales sin registro y que no lee el historial de la cuenta anterior.
5. **TestFlight real:** completar firma Apple Distribution, certificados, provisioning y subida del archivo de distribución. No usar la IPA de AltStore para enviar a App Store Connect. Probar TestFlight en iPhone, sin exponer secretos de firma en GitHub.
6. **Ficha y comercialización:** fotos auténticas con datos de demostración y tamaño de iPhone aceptado, edad, DSA de la UE, privacidad App Store, cifrado, derechos de la marca, soporte operativo y respuestas desde el correo corporativo.
7. **Cuenta para Apple App Review:** acreditar acceso funcional sin proporcionar credenciales en el repositorio; los OTP caducan y no se pueden entregar como clave estática. Preparar un procedimiento de revisión aceptado en App Store Connect.
8. **Monetización:** el código actual no contiene suscripciones ni compras integradas. Cualquier plan de pago de servicios digitales debe diseñarse con el mecanismo de compra exigido por Apple según el producto y territorio antes de anunciarse.

## Procedimiento sin Mac propio
- GitHub Actions macOS + Xcode 26 genera proyectos y pruebas. Se podría extender a firma/distribución una vez creadas y almacenadas **solo en GitHub Secrets** las credenciales necesarias. No dar claves, certificados, contraseñas o ficheros `.p8` por chat.
- El propietario da de alta la app en App Store Connect y acepta acuerdos.
- Completar TestFlight interno/externo, validación y responder rechazos antes de escoger disponibilidad pública.

## Metadatos y privacidad
- Ficha en `docs/APP_STORE_FICHA_ES_2026.json` (borrador no aprobado).
- URL privacidad: https://pedrombo88.github.io/control-de-gastos/privacidad.html
- URL soporte: https://pedrombo88.github.io/control-de-gastos/soporte.html
- Centro de control: https://pedrombo88.github.io/control-de-gastos/datos-y-privacidad.html
- La versión se mantiene `DRAFT_NOT_PUBLISHED` hasta contar con evidencia; jamás alterar esa señal automáticamente como sustituto de validación.

## Controles reproducibles
```bash
npm run check
python3 tools/preflight_app_store.py
python3 tools/preflight_app_store.py --strict
```
`--strict` debe fallar mientras queden bloqueantes reales. La comprobación local no tiene acceso a la cuenta Apple ni puede probar la aceptación legal; es intencional que esos puntos no den verde automáticamente.

## Fuentes de criterios de Apple
- Directrices: https://developer.apple.com/app-store/review/guidelines/es/
- Crear ficha: https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app
- Borrado de cuenta: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Capturas: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- Programa Apple Developer: https://developer.apple.com/help/account/membership/program-enrollment

## Decisiones pendientes del titular
- **Decidido el 15/11/2026:** Apple Developer Program como persona física (Individual). El nombre legal del titular se mostrará públicamente como vendedor; Budviva sigue siendo el nombre comercial de la app.
- ¿Se ha completado la inscripción y está activa la membresía Apple Developer? ¿Qué Bundle ID definitivo se ha reservado?
- ¿La primera versión será gratuita, de pago o tendrá compras dentro de la app?
- Identidad legal y textos de privacidad definitivos; no introducir información personal en el repositorio público.

## Nota UE: comerciante (DSA)
Apple exige declarar la condición de comerciante para distribuir en la UE. En caso de declarar actividad como comerciante, Apple verifica y muestra ciertos datos de contacto públicamente. La elección «particular» en Apple Developer no determina automáticamente el estatus DSA. Verificar el supuesto aplicable antes de dar datos de contacto a Apple y antes de publicar.
Fuente: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements

## Mejora de tickets OCR · 1.3.1
- Lectura de importes con letras de IVA A/B/C, artículos de 0,12 €, cantidades impresas en líneas «2 x» y totales abreviados «TOT».
- Ordenación geométrica de observaciones de Vision, agrupación de nombres e importes que ocupan cajas diferentes, advertencia si la suma de artículos no coincide con el total y revisión manual en la importación.
- Prueba automática con una transcripción anonimizada de 21 líneas cuyo total es 78,60 €; no se incluye en el repositorio ninguna fotografía personal del ticket.
- En iPhone, confirmar resultados reales del OCR antes de aprobar la release: el comportamiento final puede variar por iluminación y calidad del recibo.
