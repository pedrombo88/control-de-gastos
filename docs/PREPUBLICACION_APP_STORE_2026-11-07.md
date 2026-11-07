# Budviva — Puerta de salida comercial iOS

**Revisión:** 7 de noviembre de 2026  
**Estado:** PWA beta operativa. **No enviar a App Review** hasta cerrar los bloqueos indicados.  
**Repositorios y plataformas:** GitHub Pages, Supabase Auth/Compartidos, Resend (SMTP); aplicación SwiftUI beta mediante GitHub Actions.

> Este documento sirve para preparar la publicación, no es una certificación jurídica, de seguridad ni una aprobación de Apple. No contiene identificadores personales, correos privados, OTP, certificados ni claves.

## Enlaces públicos preparados

- App web: https://pedrombo88.github.io/control-de-gastos/
- Política de privacidad beta: https://pedrombo88.github.io/control-de-gastos/privacidad.html
- Ayuda y soporte beta: https://pedrombo88.github.io/control-de-gastos/soporte.html
- Control de privacidad (opcional «Privacy Choices URL»): https://pedrombo88.github.io/control-de-gastos/datos-y-privacidad.html
- Gestión de cuenta y borrado: https://pedrombo88.github.io/control-de-gastos/compartidos.html

Los enlaces deben verificarse publicados por GitHub Pages en todos los navegadores y también desde iPhone **antes** de copiarlos a App Store Connect. El nuevo centro de privacidad tiene rutas de exportación/baja y se incluye en el caché offline de la PWA; la autenticación y la baja requieren conexión a Internet.

## Estado de preparación

| Control | Estado 7/11/2026 | Acción pendiente |
|---|---|---|
| Alta e inicio de sesión OTP | Probados con Resend/Supabase | Prueba de entrega con proveedor alternativo y en iPhone real |
| Gastos Compartidos 50/50 y saldos | Probados con dos cuentas y operaciones reales | Más escenarios, redondeos, reconexión y errores |
| Compensaciones | Pago de 2 € probado y confirmado | Casos de rechazo y concurrencia con sesiones HTTP reales |
| Cierre de Compartidos | Doble consentimiento real superado | Ensayos negativos con JWT reales y pérdida de red |
| Baja de cuenta | OTP real superado, Auth y sesiones eliminadas | Verificar token antiguo en API, política de conservación |
| RLS y seguridad | Comprobaciones de identidad simulada, sin fuga anónima | Penetración/QA de seguridad adicional previo a distribución |
| Privacidad y acceso a opciones | Política beta y centro de datos disponibles | **Identificar responsable, bases legales, destinatarios, transferencias y conservación** |
| Atención a usuarios | FAQ y GitHub Issues para errores públicos | **Canal de soporte PRIVADO probado** y atención a derechos |
| Soporte URL y Privacy Policy URL | Rutas públicas preparadas | Revisar contenido jurídico final y disponibilidad estable |
| Identidad comercial | Marca Budviva en web | Confirmar titularidad, marca, Bundle ID y Apple Developer |
| iPhone nativo | SwiftUI beta, apertura de Compartidos con SafariServices | Firma y pruebas de iPhone físico, TestFlight, equivalencia de funciones |
| App Store Connect | Borrador de nombre/subtítulo/descripcion | Privacidad de la app, DSA, clasificación, capturas, accesibilidad, cifrado |

**Procedimiento operativo actualizado:** [Configurar soporte privado con Cloudflare](./CONFIGURAR_SOPORTE_PRIVADO.md). Se ha añadido `support-contact.js`, desactivado por defecto; solo se activará cuando la dirección haya superado pruebas de recepción. Ningún correo personal de reenvío figura en GitHub.

## 1. Canal de soporte privado de bajo coste

**Opción recomendada de preparación:** redireccionar un buzón del dominio `budviva.com` con **Cloudflare Email Routing** a una cuenta privada existente. Esto NO está configurado ni verificado aún.

1. En Cloudflare, revisar `Email Routing` de `budviva.com` y su compatibilidad con los registros MX/TXT existentes y el envío actual de Resend.
2. Configurar un alias profesional adecuado (por ejemplo, `soporte@budviva.com` solo **después** de verificar que realmente se recibe). No publicar direcciones inexistentes.
3. Verificar la dirección de destino de forma privada y enviar un correo de prueba desde un tercero. Confirmar recepción y respuesta; para enviar respuestas con el mismo dominio puede hacer falta una configuración de salida aparte.
4. Configurar una política interna de solicitudes y protección de datos. No incluir fotos de tickets, extractos o identidades en incidencias públicas.
5. Sustituir la nota de soporte pendiente en `soporte.html` y `privacidad.html` **solo después** de tener el canal probado.

Documentación oficial: https://developers.cloudflare.com/email-service/get-started/route-emails/  
Precios y límites: https://developers.cloudflare.com/email-service/platform/pricing/

## 2. Información jurídica necesaria (España/UE)

No inventar ni publicar datos personales del titular para cubrir campos de cumplimiento. Antes de lanzamiento, documentar y revisar:

- Identificación real del responsable del tratamiento y medio de contacto privado.
- Finalidades y bases jurídicas por operación: datos de cuenta, gastos compartidos, registros técnicos y datos locales.
- Destinatarios/encargados, subencargados y transferencias internacionales que resulten aplicables (incluidos hosting, SMTP y analítica si se añadiera).
- Plazos y criterios de conservación, supresión, derechos RGPD, procedimiento de reclamaciones y menores.
- Condiciones del servicio y régimen comercial de la app, incluida la fiscalidad y el tratamiento de pagos **si se añaden en el futuro**.
- Comprobación de protección de marca: denominación comercial y territorios.

La **AEPD** indica que la información al usuario debe incluir identidad/contacto, finalidades, base jurídica, conservación, derechos y autoridad de control, entre otros extremos:
https://www.aepd.es/derechos-y-deberes/conoce-tus-derechos/derecho-de-informacion

## 3. Declaración App Privacy: inventario previo (no publicar respuestas sin comprobar)

| Categoría de datos o finalidad | Ruta técnica actual | Evaluación pendiente en App Store Connect |
|---|---|---|
| Correo electrónico de cuenta | Supabase Auth y OTP vía Resend | Declarar contacto/identificación y finalidad de app, revisando prácticas de terceros |
| Nombre visible de cada participante | `bv_members` en Supabase | Determinar clasificación «Name»/identificadores y vínculo con usuario |
| Conceptos, importes, fechas, reparto de gastos comunes | Tablas `bv_expenses` y `bv_settlements` | Evaluar categorías de información financiera, contenido de usuario y finalidad |
| Gastos privados, tickets, presupuestos y objetivos | Almacenamiento local PWA / aplicación SwiftUI | Verificar si permanecen siempre en dispositivo antes de decidir que NO se recopilan |
| Registros técnicos de red y servicio | GitHub Pages, Supabase, Resend | Evaluar información de uso/diagnóstico, IP y conservación de terceros |
| SDK y servicios añadidos posteriormente | Dependencias revisadas por plataforma | Volver a auditar etiquetas cuando cambie la app |

No declarar «No recopilamos datos» por el solo hecho de que los movimientos privados permanezcan localmente: Compartidos y la autenticación sí transfieren datos al servicio. Los datos transmitidos por SFSafariViewController también deben revisarse. Revisar tracking y privacidad de todos los SDK.

Fuentes Apple: https://developer.apple.com/app-store/app-privacy-details/  
https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/

## 4. Obligaciones de la distribución Apple / UE

- Apple requiere **Privacy Policy URL** y política accesible dentro de la app.
- Apple exige que una app con creación de cuenta permita iniciar una **eliminación real** desde la propia app. Es válido exigir reautenticación por código, pero no ocultar la opción ni poner trabas innecesarias.
- Para distribución en la UE, clasificar el **estado de operador comercial (DSA/trader)**. En los supuestos en los que se es operador comercial, Apple publica datos de contacto verificados; no asumir que se puede omitir por ser autónomo o desarrollador particular.
- Configurar identificador controlado por el titular (no `com.example.budviva`), membresía Apple Developer, firma, TestFlight y certificados.
- Validar el conjunto nativo SwiftUI en iPhone físico, cámara, OCR, archivos, accesibilidad y cierre de Compartidos por SafariServices.
- Completar metadatos y responder a App Privacy, permisos, cumplimiento de cifrado y eventual comercialización.

Referencias:  
https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/  
https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/  
https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties

## Condición mínima para solicitar revisión

No publicar hasta verificar simultáneamente: **responsable legal y soporte privado**, política revisada, comunicaciones entre proveedores, ficha y privacidad App Store Connect, firma iOS, pruebas en iPhone real y una compilación de distribución validada.

En paralelo se pueden mantener pruebas de la PWA beta y corregir regresiones con los workflows de GitHub.
