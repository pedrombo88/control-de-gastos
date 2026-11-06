# Budviva — Prueba de aislamiento entre dos usuarios autenticados

## Objetivo
Verificar que dos cuentas de Supabase Auth, **en dos grupos de Compartidos diferentes**, no pueden leer los datos de la otra. No se alteran cuentas, invitaciones, gastos ni compensaciones.

## Requisitos
- Node.js 20 o posterior.
- Dos cuentas **de ensayo**, con sesiones válidas, A y B.
- Cada cuenta pertenece a un grupo diferente. Utiliza los UUID de los grupos, no sus nombres.
- Cuatro variables de entorno: `BUDVIVA_TEST_TOKEN_A`, `BUDVIVA_TEST_TOKEN_B`, `BUDVIVA_TEST_GROUP_A`, `BUDVIVA_TEST_GROUP_B`.

**Nunca pegues tokens en chats, incidencias de GitHub, commits o capturas de pantalla.** No guardes tokens en un archivo dentro del repositorio ni uses claves `service_role`: solo se aceptan tokens temporales de usuarios normales. Ejecuta la prueba desde un equipo de confianza.

Con las variables configuradas, ejecuta desde la raíz del repositorio:

```bash
node --test tests/authenticated-isolation.test.cjs
```

Sin variables configuradas, las pruebas que necesitan sesión figuran como **omitidas**, no como aprobadas. Con una configuración parcial, la prueba de configuración debe fallar.

## Comprobaciones
- Cada cuenta puede consultar su propio grupo.
- Ninguna cuenta puede consultar el grupo de la otra.
- No aparecen filas ajenas de miembros, gastos, compensaciones o aprobaciones de cierre.
- Las invitaciones no se exponen por lectura directa a usuarios normales.
- Todas las peticiones son `GET`; no se ejecuta ningún `POST`, `PATCH`, `DELETE` ni función RPC.

## Interpretación
- **PASS** con variables válidas: no se detecta filtración de lectura en los escenarios comprobados.
- **FAIL**: analizar las políticas RLS y los permisos, sin publicar los datos devueltos.
- **SKIP**: no se ejecutó el control autenticado; sigue pendiente.
- El test no demuestra la denegación de escrituras ajenas ni sustituye un pentest.

Para completar la auditoría antes de comercializar, realizar aparte pruebas de denegación de escritura en un entorno de ensayo aislado y comprobar OTP con un proveedor SMTP configurado.
