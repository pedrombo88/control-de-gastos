# Budviva — Expediente de publicación iOS

**Estado:** beta técnica iOS 1.1. Esta carpeta contiene un proyecto iOS nativo SwiftUI, no un contenedor WKWebView. El módulo opcional Compartidos se abre en una ventana independiente y segura de SafariServices. **No se ha enviado a App Store ni a TestFlight.** La revisión oficial de Apple, las pruebas en dispositivos reales y la firma de distribución siguen pendientes.

## Funciones implementadas

- Inicio: balance, ingresos/gastos, avisos y vistas resumidas.
- Movimientos: altas/ediciones/borrados, filtros, búsqueda y estadísticas.
- Importar: archivos desde iPhone, cámara de tickets, OCR con Vision y lectura PDFKit y CSV; revisión de importes antes del guardado.
- Recurrentes: reglas periódicas con registro de vencimientos al abrir la aplicación, sin prometer ejecución en segundo plano.
- Presupuestos: límites, gasto por categoría y avisos de 70/80/90 %.
- Ahorro: compras necesarias/no necesarias, proyección estimada y metas de ahorro con aportaciones reales.
- Datos: almacenamiento privado protegido en Application Support y originales de documentos asociados.
- Copias: JSON completo importable desde la PWA, y opción cifrada AES-256-GCM/PBKDF2; vector de compatibilidad compartido con la web.
- Apariencia: cuatro temas. **Interfaz actual en español.** Otros idiomas no están certificados como completos.
- Compartidos: acceso desde Movimientos a la web ya operativa mediante una ventana de SafariServices. Sesión y movimientos compartidos independientes del almacenamiento financiero local; no se transmiten movimientos privados en la URL.

## Cómo comprobar la compilación sin Mac propio

En GitHub: [workflow iOS](https://github.com/pedrombo88/control-de-gastos/actions/workflows/ios-build.yml). Usa macOS, Xcode 26.3 con SDK iOS 26 y XcodeGen.

La ejecución genera el icono **1024×1024 RGB sin transparencia**, genera el proyecto Xcode y compila para simulador iOS sin firma. Incluye el target de pruebas XCTest y el paso `build-for-testing`. **El hecho de que compile no demuestra que funcione en un iPhone real**.

Para trabajar desde un Mac más adelante:
1. Instalar Xcode y XcodeGen.
2. Ejecutar `python3 ios-native/tools/generate-icon.py` desde la raíz.
3. Ejecutar `cd ios-native && xcodegen generate --spec project.yml`.
4. Abrir `Budviva.xcodeproj` y configurar tu Apple Development Team y el Bundle Identifier definitivo.

**Plan de registro sin Mac y sin pagar hasta estar preparados:** [Apple Developer y TestFlight](../docs/APPLE_DEVELOPER_SIN_MAC.md). Confirmado que la membresía todavía no está activa; la cuenta gratuita y la cuenta de pago son pasos diferentes. Antes de inscribirse hay que elegir la titularidad: como persona física Apple muestra el nombre legal del vendedor; para mostrar la entidad jurídica, la inscripción debe ser de organización.

## Identidad y cuenta de Apple — bloqueantes

- La identidad `com.example.budviva` es **solo una plantilla**. Cambiarla por el identificador controlado por el titular antes de firmar o publicar. No sustituirla por un identificador inventado.
- Cuenta activa de Apple Developer Program y permisos en App Store Connect; el titular debe completar contratos, fiscalidad, pagos y datos de contacto según corresponda.
- Confirmar disponibilidad comercial de **Budviva** en la OEPM, EUIPO y App Store.
- El canal privado `soporte@budviva.com` ya recibe consultas según el titular. Probar respuesta saliente con identidad comercial y procedimiento de atención de derechos; no confiar solo en GitHub Issues público.
- Identificar legalmente al responsable del tratamiento y revisar la política con la configuración definitiva.
- Completar declaraciones de datos, cifrado, permisos de cámara y cualquier cuestionario de App Store Connect. El hecho de usar AES para copias exige evaluar correctamente la información de cumplimiento de exportación; **no se ha supuesto exención**.

**Archivo de metadatos listo para revisar:** [Ficha App Store ES](../docs/APP_STORE_FICHA_ES_2026.json). Se valida automáticamente longitud del nombre, subtítulo, texto promocional, descripción, palabras clave y enlaces HTTPS. No se han creado credenciales ni cargado la ficha en App Store Connect.

## Ficha inicial de App Store — borrador

**Nombre:** Budviva  
**Subtítulo:** Tus gastos y ahorro, claros  
**Categoría:** Finanzas  
**Idioma de lanzamiento:** Español (España)  
**Dispositivo:** iPhone  
**Requisito:** iOS 17 o superior  
**Modelo:** por definir; no se han implementado suscripciones ni compras dentro de la app.

**Descripción comercial inicial:**

Budviva te ayuda a tener una visión clara de tu dinero. Registra gastos e ingresos, organiza presupuestos y crea objetivos de ahorro con seguimiento de tus aportaciones reales.

Escanea tickets con la cámara o selecciona documentos para revisar los importes y clasificar los productos que consideras necesarios o prescindibles. Consulta estadísticas, controla los gastos recurrentes y conserva tus documentos originales en el iPhone.

Tu información financiera permanece en tu dispositivo. Puedes descargar copias de seguridad completas o protegerlas con una contraseña.

**Lo que no debe prometerse:** conexión automática a entidades bancarias, sincronización entre dispositivos, almacenamiento en la nube, ejecución recurrente en segundo plano, ahorro garantizado, lectura infalible de extractos o asesoramiento financiero.

**Política de privacidad provisional:** https://pedrombo88.github.io/control-de-gastos/privacidad.html

**Soporte provisional:** https://pedrombo88.github.io/control-de-gastos/soporte.html

**Control de datos y solicitudes de privacidad (URL opcional en App Store Connect):** https://pedrombo88.github.io/control-de-gastos/datos-y-privacidad.html

**Verificado en beta:** correo entrante privado de soporte por Cloudflare y entrega de OTP por Resend tras el cambio DNS, ambos confirmados por el titular. **Pendiente:** prueba de respuesta de soporte con identidad comercial, identificación legal del responsable del tratamiento, periodos de conservación, capturas reales, clasificación por edades, términos comerciales, disponibilidad de marca y revisión RGPD. No enviar a App Review hasta resolverlo.

## Pruebas de aceptación antes de TestFlight

| Bloque | Prueba obligatoria | Estado |
|---|---|---|
| Datos | 100 altas/ediciones/borrados y reinicios sin pérdida | Pendiente iPhone físico |
| Copias | JSON PWA→iOS, JSON iOS→PWA, cifrada en ambas direcciones | Test vector añadido; prueba con dispositivos pendiente |
| Cámara | Permisos concedidos/denegados, ticket bien/mal iluminado | Pendiente |
| Documentos | JPG, PNG, CSV, PDF con texto, PDF escaneado, PDF corrupto, PDF de 30 páginas | Pendiente |
| Ahorro | Producto necesario/no necesario, redondeos, metas cumplidas/vencidas | Parcialmente automatizado |
| Presupuestos | 70/80/90 %, importes sin presupuesto, importes que superan límite | Pendiente UI real |
| Recurrentes | Diario, semanal, mensual, anual, pausa, cambio de fecha, sin duplicados | Pendiente UI real |
| Accesibilidad | VoiceOver, Dynamic Type, contraste y tamaño de botones | Pendiente |
| iOS | Bajo almacenamiento, pérdida de conectividad, permisos, recuperación tras cierre | Pendiente |
| App Store | Capturas iPhone auténticas, descripción, privacidad y canal de soporte | Pendiente titular |

## Lanzamiento

1. Resolver errores del workflow iOS y obtener ejecución verde con pruebas compiladas.
2. Ejecutar pruebas en iPhone (con TestFlight cuando exista cuenta Apple).
3. Corregir bloqueos de datos, importación, accesibilidad y privacidad.
4. Obtener correo de soporte y textos legales completos.
5. Configurar certificados, identificador, firma y subida a App Store Connect.
6. Completar App Privacy, export compliance y metadatos.
7. Enviar a revisión cuando el binario esté listo y autorizado.

La publicación requiere acciones y credenciales del titular; este repositorio no contiene ni debe contener certificados, claves ni contraseñas.

## Requisito Apple verificado en noviembre de 2026

Desde el **28 de abril de 2026**, Apple requiere **Xcode 26 o posterior y SDK iOS 26 o posterior** para subir apps a App Store Connect. El workflow usa Xcode 26.3, compatible con ese mínimo. Se conserva el destino mínimo de despliegue iOS 17.0 para los usuarios finales.

Fuente oficial: https://developer.apple.com/news/upcoming-requirements/

La compilación en CI continúa sin firma ni upload automático. Firmar requiere una cuenta Apple Developer y configuración de certificados y permisos del titular.

## Auditoría de equivalencia con la PWA 6.9.9 — 6 de noviembre de 2026

**Estado:** el proyecto nativo SwiftUI es independiente de la web instalable. La PWA incluye Compartidos con Supabase, cierre del grupo, exportación común y eliminación de cuenta. **Desde iOS 1.1 beta, el usuario puede acceder a todas ellas a través de SafariServices desde Movimientos.** Sin embargo, estas funciones todavía **no están implementadas como pantallas nativas**, ni se comparten sesiones o movimientos privados con la web. No se puede presentar la futura app nativa como una versión que incluye todas las funcionalidades web sin completar la paridad o acotar claramente su alcance.

**Controles técnicos antes de lanzar:**

- Ejecutar `ios-build.yml` con Xcode y XCTest en simulador para la revisión actual. El resultado no valida cámara real, VoiceOver ni rendimiento físico.
- Mantener `com.example.budviva` como identificador provisional sin firma; configurar Bundle ID, equipo y credenciales únicamente en App Store Connect/CI segura.
- Si se anuncia Compartidos en iOS, especificar que se abre mediante SafariServices, requiere conexión y autenticación independiente. Validar el flujo entero en iPhone físico; para paridad nativa completa habría que migrar la experiencia a SwiftUI y proteger credenciales en Keychain.
- Validar importación PWA → iOS mediante copia completa, documentos originales y cifrado, y no presentar los datos de ambas aplicaciones como sincronizados.
- Completar las declaraciones de privacidad y un canal de soporte no público.

La auditoría de la PWA se recoge por separado en `AUDITORIA_PROFESIONAL_BUDVIVA_2026-11-06.md`. Esta nota actualiza los criterios de publicación y no certifica el funcionamiento en un iPhone físico.

### iOS 1.1 beta — avance de paridad (6 de noviembre de 2026)

Se añade una cuarta herramienta «Compartidos» en **Movimientos**, con pantalla explicativa SwiftUI y un navegador del sistema SFSafariViewController presentado a pantalla completa. El acceso se limita a la URL oficial HTTPS con ruta fija; ni el token de sesión ni los datos bancarios privados se transmiten desde iOS. Safari gestiona de forma independiente la sesión y el formulario de alta/baja. Se añade prueba XCTest del origen HTTPS y de la ausencia de parámetros privados, con compilación y pruebas de simulador mediante GitHub Actions.

**Pendiente:** pruebas reales de acceso, alta/baja por correo OTP, presentación de SafariServices, navegación con VoiceOver, sin conexión y gestión de la sesión en iPhone físico. Este acceso a funcionalidades existentes **no supone paridad nativa completa ni aprobación por Apple**.


## Preparación de privacidad y soporte — 7 de noviembre de 2026

Se ha creado una página pública de control de datos `datos-y-privacidad.html` que distingue entre eliminar datos personales locales, cerrar Compartidos (doble autorización) y eliminar la cuenta por OTP. La PWA enlaza desde Ajustes y la incluye en su cache offline. La app iOS SwiftUI enlaza ahora directamente a este centro desde Ajustes y desde la pantalla introductoria de Compartidos. **La compilación de este cambio debe validarse en el workflow macOS y el recorrido en un iPhone real.**

En App Store Connect se prepara esta página como **Privacy Choices URL** (opcional); la **Privacy Policy URL** sigue siendo `privacidad.html` (obligatoria). `soporte.html` contiene ayudas y enlaza con el alias privado `soporte@budviva.com`, cuyo reenvío Cloudflare ha sido confirmado por el titular. Están pendientes la prueba de respuesta saliente y los procedimientos legales de privacidad.

Referencia de los bloqueos y del inventario de App Privacy: [expediente de prepublicación](../docs/PREPUBLICACION_APP_STORE_2026-11-07.md).

**Aviso UE:** se debe declarar el estado DSA de operador comercial y, si corresponde, verificar los datos de contacto que Apple publica en la ficha. No se ha determinado ni certificado ese estado para el titular. Antes de publicar: cerrar identidad del responsable, soporte privado y términos/privacidad definitivos.


## Auditoría visual automática de las cinco pestañas (simulador)

**Disponible sin Apple Developer ni Mac propio.** Se ha añadido un target `BudvivaUITests` de XCUITest que abre la app iOS real en el simulador de macOS y recorre **Inicio, Movimientos, Presupuestos, Ahorro y Ajustes**, comprobando el título de cada página. Las capturas se generan como adjuntos `XCTAttachment` y se conservan en el resultado de las pruebas.

**Cómo obtener las capturas:** en GitHub Actions → [Compilar Budviva iOS](https://github.com/pedrombo88/control-de-gastos/actions/workflows/ios-build.yml) → última ejecución correcta → **Artifacts** → `budviva-iphone-preview` (imágenes PNG exportadas, más captura de inicio) y `budviva-ios-xctest` (resultado de XCTest para auditoría detallada).

**Limitación:** las capturas del simulador son material de inspección, no certifican su aspecto en todos los modelos iPhone ni sustituyen pruebas reales en dispositivo. La integración de XCUITest debe superar primero el workflow de GitHub; no se ha realizado firma ni subida a TestFlight.


**Comprobación CI del 7/11/2026:** la ejecución [42386505387](https://github.com/pedrombo88/control-de-gastos/actions/runs/42386505387) superó **9 pruebas XCTest y 1 prueba de navegación XCUITest**, y `xcresulttool` confirmó que exportó **5 adjuntos de capturas**, sin fallos. Se ha corregido el paso de empaquetado para que el ZIP `budviva-iphone-preview` incluya también todas las imágenes de XCUITest, no solamente la pantalla inicial. La ejecución posterior debe confirmar el paquete completo.
