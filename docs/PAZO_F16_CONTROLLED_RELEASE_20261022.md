# F16 P4 — autorización financiera controlada

Implementación en PR67. SQL y cinco Edge ya instalados/verificados; modo OFF,
sin certificado técnico, credenciales ni autorización de dinero. Estado y
evidencia vigentes en `PAZO_F16_CONTROLLED_RELEASE_POSTFLIGHT_20261022.md`.
HTTPS/PWA y cierre operativo pendientes; no beta lista. Las instrucciones de
instalación inferiores describen el procedimiento ya ejecutado, no repetirlo.

## Comportamiento

Guardar claves conserva su operación no financiera. El nuevo control exige
GoTrue válido, grant administrativo actual y TOTP reciente del mismo bearer,
origen canónico y confirmación expresa para cada acción. El servidor deriva
el actor; el navegador solo propone acción, revisión, nonce y confirmación.
La migración `20261021230000` reemplaza las restricciones de staging con un
selector coherente y privado, ligado a modo, revisión y generación.

- **off:** ninguna admisión nueva ni recuperación que pueda reenviar CREATE.
- **canary:** solo el administrador original de la generación puede autorizar
  la prueba para su propia cuenta. Onboarding, consentimiento del comprador y
  aprobación PayPal siguen siendo obligatorios. No aparece un beneficio por
  activar este modo. Otro propietario o generación se rechaza también en SQL.
- **public:** autorización distinta del mismo operador; exige venta original
  conciliada de US$2.99, recibo firmado por el webhook original, período,
  cancelación confirmada mediante GET, monitor de disputas válido, sin holds
  activos ni eventos pendientes. Los fixtures que ejercitan esto son sintéticos.
- **stop:** cualquier admin con MFA reciente puede detener compras nuevas sin
  depender de la salud del proveedor. Conserva worker, intake histórico y
  cancelaciones. No cancela renovaciones existentes ni revoca operaciones ya
  admitidas; no redirige al usuario de producción al checkout Sandbox.

CAS, nonce y auditoría se confirman en una transacción. Un reintento de una
autorización antigua devuelve el estado ACTUAL, incluyendo una parada posterior.
La UI bloquea doble clic y, ante resultado incierto, ofrece consultar el estado
sin repetir el POST. Descarta respuestas de otra cuenta y muestra la fecha de
la última lectura. Las herramientas de reserva/configuración inicial quedan
cerradas por defecto, separadas del guardado único de claves.

## Certificación y disponibilidad

`pazo_live_release_artifact` no tiene fila inicial ni escrituras cliente/service.
Solo el operador puede certificar commit HTTPS, fuente de ambos runtimes,
control y worker tras comprobarlos. La presencia del esquema NO genera esa
evidencia. Nunca se debe insertar desde el navegador, una prueba sintética o
el formulario de credenciales. Su creación final es trabajo técnico de Codex,
anterior a pedir las claves al PO.

Los entrypoints ordinarios seleccionan ahora el runtime controlado; desaparece
la necesidad de editar código después de guardar claves. Ambos comprueban el
certificado SQL antes de cualquier acceso al proveedor. Checkout además exige
selector activo, salud reciente del worker y una lectura HTTPS del intake
DESPLEGADO. Ese probe no es prueba de firma: POST continúa por verificación
PayPal y binding originales, y la apertura pública requiere el recibo real.
Las alternativas `index.release-candidate.ts` siguen sin seleccionarse; pasan
por las mismas comprobaciones obligatorias y no ofrecen bypass.

## Validación y operación

`npm run verify:prepreview`: **1,811 pruebas PASS**
(11+101+5+4+493+1193+4), TypeScript/build/dist PASS. Conserva el warning de
bundle grande; no se rebajaron reglas. Código nuevo lint0/0. CI exacto pendiente
antes de instalación; no se atribuye al commit nuevo el CI del checkpoint previo.

PG17 completo PASS: falta de certificado/credenciales, salud vencida, CAS y
replay, identidad/generación, venta sin firma, hold, apertura pública sintética,
parada, recuperación bloqueada, revocación, roles reales anon/authenticated/
service_role, proyecciones mínimas y rollback/reapply. El rollback requiere
OFF y cero intentos Live; no borra auditoría de autorización ni historia pagada.

Pruebas React y HTTP: MFA/confirmación, doble clic, lectura incierta, cuenta
tardía, body limitado, origen y errores sanitizados; intake caído bloquea
checkout incluso con worker saludable. Chromium390/1440 PASS sin overflow,
foco sin contornos, controles de 44px, una sola petición sintética y consulta
posterior. No son pruebas PayPal reales ni PWA física/HTTPS canónico.

Antes de instalar: exigir CI del commit exacto y auditar funciones alojadas.
Los tres bridges originales ya se compararon por hash: coinciden; worker real
reciente, procesamiento=false, sandbox/Live=false/kill=true/gen=null/revision0,
intentos/períodos0. Ensayar el archivo versionado con ROLLBACK; instalar SQL e
historial atómicamente y verificar cuerpos/ACL/estado. No usar db push masivo.
Después actualizar/verificar fuentes Edge con certificado aún AUSENTE y modo
OFF. Preparar HTTPS protegido y verificar callbacks/PWA antes de certificar.
No producción/main ni autorización canary/pública sin el GO correspondiente.

Las prohibiciones de usar candidatos sin controles de los informes anteriores
describen el staging anterior. Esta implementación sustituye el latch de código
por controles del backend; no sustituye la autorización financiera del PO.
