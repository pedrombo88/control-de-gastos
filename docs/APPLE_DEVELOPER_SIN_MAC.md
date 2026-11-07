# Budviva — Apple Developer sin Mac propio

**Estado (7 de noviembre de 2026):** el titular todavía **no** tiene una membresía activa de Apple Developer Program. Budviva se mantiene en fase beta con una aplicación nativa SwiftUI que se compila y prueba en GitHub Actions. No se han creado certificados, firmas, perfiles ni claves de App Store Connect, ni se ha enviado nada a TestFlight.

## Etapa 1 — Apple Developer gratuito (sin comprar la membresía)

1. Entra en https://developer.apple.com/account/ con tu **propia cuenta de Apple**. Revisa que tenga autenticación de dos factores (2FA) y tus datos reales.
2. Acepta el Apple Developer Agreement si aparece. El acceso gratuito permite registrarse como desarrollador sin pagar la cuota anual.
3. No inicies la suscripción de pago todavía: **GitHub Actions ya puede compilar Budviva para simulador sin firma** y producir resultados de XCTest. No se instala así una app nativa firmada en un iPhone real.
4. Para continuar las pruebas de la beta en el iPhone, utiliza la PWA instalada en Safari. Esta opción no sustituye la evaluación de la app nativa mediante TestFlight.

## Decisión previa a la inscripción de pago

**Particular / autónomo:** Apple utiliza tu **nombre legal real** como nombre del vendedor en App Store. El nombre del producto sigue siendo `Budviva`; no puedes sustituir el nombre del vendedor por el nombre de la marca registrándote como persona física.

**Organización:** para mostrar el nombre legal de una sociedad, Apple exige una entidad jurídica válida y normalmente un número D-U-N-S. No basta con usar `budviva.com`, un nombre comercial o una marca. La sociedad debe ser titular de la cuenta; no inventar una entidad.

En ambos casos, la inscripción de pago requiere verificar la identidad. Si se inicia por iPhone con la app oficial Apple Developer, el programa se contrata como suscripción anual con renovación automática hasta cancelación.

**Coste:** cuota base de 99 USD/año o precio en moneda local mostrado durante la inscripción (sin afirmar un precio exacto en euros, que puede variar según país/condiciones).

## Etapa 2 — Cuándo pagar

Dar el paso a Apple Developer Program **cuando se den todas estas condiciones**:

- El proyecto SwiftUI genera compilaciones verdes y ejecuta XCTest en el simulador de GitHub.
- Hay una decisión sobre el nombre público de vendedor (particular frente a sociedad).
- Se ha revisado la información legal del responsable, política RGPD y declaraciones de privacidad.
- Se ha definido una cuenta de prueba de Compartidos para App Review que no dependa exclusivamente de un código OTP de vida corta, con credenciales entregadas **solo dentro de App Store Connect**, nunca por GitHub.
- Se dispone de un iPhone para probar la compilación firmada, la cámara, documentos, accesibilidad, cierres y bajas.
- Se ha verificado la marca `Budviva` y la ficha comercial.

## Etapa 3 — Subir Budviva a TestFlight sin Mac

La máquina **macOS de GitHub Actions** puede generar la compilación iOS. Para distribuir una IPA real por TestFlight y App Store hacen falta:

1. Membresía Apple Developer Program activa.
2. App creada en App Store Connect con un Bundle ID definitivo controlado por el titular. `com.example.budviva` es de prueba y debe sustituirse.
3. Certificado de distribución, perfil de aprovisionamiento, equipo de desarrollo y permisos apropiados.
4. Credenciales de App Store Connect/API guardadas como **secrets** en el repositorio o entorno de CI, con acceso mínimo. **Nunca** enviar archivos `.p12`, API keys `.p8`, contraseñas ni tokens por el chat o subirlos a código público.
5. Un workflow de GitHub Actions en macOS para compilar, firmar, validar y subir la versión a TestFlight mediante herramientas de Apple. Configurarlo solo después de tener cuentas y credenciales.
6. Validar la aplicación en TestFlight mediante iPhone real; no confundir compilación correcta para simulador con una IPA firmada de distribución.

## Enlaces oficiales

- Cuenta de desarrollador gratuita: https://developer.apple.com/account/
- Programa y precios: https://developer.apple.com/programs/
- Inscripción como particular o empresa: https://developer.apple.com/programs/enroll/
- Inscripción desde app Apple Developer: https://developer.apple.com/help/account/membership/enrolling-in-the-app/
- TestFlight: https://developer.apple.com/testflight/
- Guía de certificados: https://developer.apple.com/help/account/certificates/
- App Store Connect: https://appstoreconnect.apple.com/

**Advertencia:** la información de inscripción es pública; las decisiones de titularidad, fiscalidad o constitución de sociedad deben comprobarse según la situación del titular antes de comercializar. No se requiere facilitar datos personales para preparar esta etapa en GitHub.
