# Budviva — Instalación en iPhone físico desde Windows (sin Mac)

**Objetivo:** probar la aplicación nativa SwiftUI de Budviva en un iPhone real con un ordenador Windows y sin contratar Apple Developer Program.

**Estado:** el workflow de GitHub genera un **IPA ARM64 sin firma**. Solo será instalable después de que un programa local lo firme con una cuenta gratuita de Apple. Esta prueba no equivale a TestFlight ni a una publicación de App Store. El fichero IPA es un artefacto efímero de GitHub y caduca 14 días después de crearse.

## 1. Descargar el archivo de pruebas de GitHub

1. Desde el ordenador abre [Compilar Budviva iOS](https://github.com/pedrombo88/control-de-gastos/actions/workflows/ios-build.yml).
2. Abre la **última ejecución verde** posterior a la incorporación del empaquetado para dispositivo físico.
3. Desplázate hasta `Artifacts` y descarga `budviva-iphone-fisico-sin-firma` (necesitas iniciar sesión en GitHub).
4. Extrae el ZIP descargado. Dentro debe estar `budviva-iphone-pruebas-sin-firma.ipa` y su suma SHA-256. No intentes instalar el ZIP externo.
5. Puedes comprobar el SHA-256 del IPA desde PowerShell con `Get-FileHash .\budviva-iphone-pruebas-sin-firma.ipa -Algorithm SHA256` y comparar la salida con `.sha256`.

## 2. Firmar e instalar sin pagar (opción de prueba)

La vía alternativa es **Sideloadly para Windows**: https://sideloadly.io/ . Es una herramienta de terceros, no una herramienta oficial de Apple.

1. En Windows, instala desde los sitios oficiales los componentes de Apple que solicite Sideloadly (pueden ser iTunes/iCloud de escritorio o controladores USB compatibles). No aceptes descargas de mirrors desconocidos.
2. Conecta el iPhone al PC por USB, desbloquéalo y pulsa **Confiar en este ordenador** si aparece.
3. Inicia Sideloadly, selecciona el iPhone y arrastra `budviva-iphone-pruebas-sin-firma.ipa`.
4. Utiliza una cuenta de Apple **de pruebas separada** de tu cuenta principal si prefieres no introducir las credenciales de uso habitual en una aplicación de terceros. Mantén 2FA. **No entregues nunca tu contraseña ni códigos a este chat, a GitHub Issues ni al repositorio**.
5. Inicia la firma y la instalación con Sideloadly. La app instalará su icono en la pantalla de inicio si el proceso es compatible con el dispositivo.
6. Si el iPhone lo exige, entra en **Ajustes → Privacidad y seguridad → Modo desarrollador** y actívalo (requiere reiniciar) y/o **Ajustes → General → VPN y gestión de dispositivos** para confiar en el perfil.
7. Abre Budviva **nativa** desde el icono recién instalado y comprueba las pruebas del apartado 3. Si la instalación falla, anota el mensaje de Sideloadly y la versión de iOS; no compartas capturas que muestren credenciales.

**Límites Apple:** con cuenta gratuita, los perfiles de aprovisionamiento duran siete días y hay límites sobre aplicaciones y dispositivos. La re-firma periódica es necesaria; la instalación puede alterar el Bundle ID al volver a firmar. No confíes datos personales importantes a esta instalación experimental. Estas limitaciones constan en [Apple Developer — Personal Team](https://developer.apple.com/help/account/basics/about-your-developer-account/).

**Aviso de seguridad:** este método confía las operaciones de firma de tu cuenta Apple a un programa externo. Valora su riesgo; si no quieres facilitar credenciales a terceros, espera a TestFlight con cuenta Apple Developer de pago y firma de distribución gestionada en CI. No hay un camino nativo totalmente equivalente a TestFlight, gratuito y sin autenticación de Apple.

## 3. Pruebas funcionales con datos ficticios (iPhone real)

Usar una cuenta de ensayo; no adjuntar extractos bancarios reales, teléfonos, recibos con datos personales ni códigos OTP.

- [ ] **Apertura y pestañas**: Inicio, Movimientos, Presupuestos, Ahorro y Ajustes se abren y el texto no se corta.
- [ ] **Alta de gasto**: añadir `Café de prueba`, 2,50 €, en Alimentación; comprobar que aparece y persiste al cerrar/reabrir la aplicación.
- [ ] **Ingreso**: registrar `Ingreso prueba`, 10,00 €. Comprobar que el balance refleja +7,50 € respecto al saldo inicial de cero.
- [ ] **Presupuestos**: asignar límite a Alimentación y comprobar los avisos cuando corresponda.
- [ ] **Ticket con cámara**: fotografiar un ticket de ensayo sin datos privados y comprobar permisos, OCR y revisión manual antes de guardar.
- [ ] **Importación CSV**: desde Archivos, importar un CSV exportado por Budviva con un gasto de importe positivo marcado `Tipo=Gasto`. Verificar que se trata como **gasto**, no ingreso.
- [ ] **Duplicados**: intentar importar dos veces el mismo movimiento; debe advertir y no guardarlo automáticamente.
- [ ] **Ahorro**: clasificar un producto como necesario/no necesario y comprobar la pantalla Ahorro.
- [ ] **Compartidos**: comprobar que abre el servicio HTTPS de Budviva y que no se transmiten los gastos personales automáticamente. No crear grupos con datos reales durante la beta.
- [ ] **Copia y recuperación**: exportar una copia cifrada con contraseña de prueba, restaurarla y verificar los datos. Guardar la copia fuera de la app antes de probar el borrado.
- [ ] **Privacidad y cierre**: acceder a soporte y privacidad sin errores. El botón de eliminación local solo se prueba sobre datos ficticios.

## 4. Qué información necesito del resultado

Comunica únicamente **modelo de iPhone, versión iOS, si Budviva se ha instalado y cualquier error funcional**. No compartas Apple ID, contraseñas, archivos financieros ni códigos de verificación.

## 5. Alternativa de prueba inmediata sin instalación nativa

En Safari del iPhone entra en https://pedrombo88.github.io/control-de-gastos/ y abre la PWA previamente instalada en la pantalla de inicio. Puedes probar gastos, cámara, documentos y Compartidos hoy mismo. **La PWA utiliza almacenamiento independiente del binario nativo SwiftUI**: sus datos no aparecerán automáticamente en la app nativa, ni viceversa. Para migrar se debe exportar y restaurar una copia compatible, validando todo el contenido.

## Fuentes de referencia

- Apple — cuenta gratuita Personal Team: https://developer.apple.com/help/account/basics/about-your-developer-account/
- Sideloadly (tercero): https://sideloadly.io/
- Acciones de GitHub de Budviva: https://github.com/pedrombo88/control-de-gastos/actions/workflows/ios-build.yml

No se ha probado el firmado/instalación con Sideloadly en un dispositivo físico desde este entorno. Es una vía que deberá validarse al instalar el artefacto ARM64 en el iPhone.
