# PAZO — continuidad Supabase autenticada, 21-oct-2026

## Acceso y auditoría previa

El propietario guardó credenciales en su bóveda personal desde el móvil.
GET autenticado del proyecto oficial `mrybvqdebbgcayuvgkkr`: HTTP200,
`ACTIVE_HEALTHY`. No se copiaron valores al chat, archivos o Git. Se conservan
las dos entradas personales; la variable original se propagó y permitió la
lectura. Se agregó la solicitud de secreto de red `_V2`, con destino exclusivo
`api.supabase.com`, sin pedir otro valor. Guardar el requisito no demuestra
que el secreto de red ya esté aplicado al runtime.

GitHub revalidado: PR67 DRAFT hacia F13, `4da078fd`, **5/5 Actions SUCCESS**.
F13 sigue `669efafdb5678cae40c5137d7bddc9403c2ab8a3`; main sigue
`ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`. No merge ni nuevo preview.

Auditoría Supabase real, solo lectura, antes de DDL:

- Generaciones comerciales0, intentos Live0, períodos pagados0, inbox Live0,
  claims de cancelación0; selector sandbox, Live false, kill true,
  generación activa null.
- Todas las tablas privadas Live inspeccionadas tienen RLS ENABLE + FORCE.
- Lecturas originales, cancel finish y ruta activa: EXECUTE service_role;
  anon/authenticated denegados. Theme: solo authenticated; proyección pública
  permite anon/authenticated según su contrato. Helper privado de wall sin
  grants cliente ni service.
- Los cuerpos alojados de wall, set_theme y public_pet_benefits coinciden
  exactamente con las versiones locales previas esperadas; se guardaron
  instantáneas privadas antes de reemplazarlos.

## Historial alineado sin repetir SQL instalado

El historial real contiene `20261021174836_pazo_f16_live_verified_benefit_projection`.
El archivo local estaba fechado `20261021183000`. Se renombra al historial real
y se actualizan las dos referencias de pruebas/lab, sin cambiar el SQL ni
volver a instalarlo. Prueba focalizada de proyección: 3/3 PASS.

## Versiones Edge auditadas

| Edge | Versión alojada | Auditoría de fuente |
| --- | --- | --- |
| pazo-paypal-live-account | 3, JWT ON | 6/6 fuentes corresponden a F13 previo; 3 cambian en esta continuación y se añade recovery |
| pazo-paypal-live-checkout | 2, JWT ON | Entry OFF; hay componentes nuevos en Git aún no desplegados |
| pazo-paypal-live-webhook | 1, JWT OFF | Entry OFF; pipeline alojado anterior al lector Vault y conciliación actual |
| pazo-paypal-live-worker | 3, JWT OFF, capacidad interna | 27/28 fuentes iguales al local; diferencia en adaptador SQL compartido |

Se descargaron bundles ESZIP y fuentes por CLI oficial `--use-api`, a
directorios privados separados fuera del repo. No se atribuye deploy por
coincidencia de nombre/versiones. Hace falta instalar las tres migraciones
nuevas ya ensayadas y desplegar cuenta, después de dry-run y CI. Checkout y
webhook no deben abrirse por actualizar fuentes: P4/readiness y GO financiero
siguen pendientes. No se pidió guardar claves PayPal todavía.

## Instalación autorizada — 21:30–21:47 UTC

El PO confirmó expresamente instalar las tres migraciones de PR67 y actualizar
la cuenta manteniendo Live OFF/sin dinero. El rechazo automático previo del
ensayo alojado quedó resuelto por esa confirmación; no se ejecutó el DDL rechazado
antes de recibirla.

Las tres migraciones pasaron individualmente BEGIN/ROLLBACK sobre el esquema
real; se verificó que los objetos nuevos siguieran ausentes. Después se
instalaron con su registro de historial en la MISMA transacción:

| Versión instalada | Resultado |
| --- | --- |
| 20261021210000, recovery finish | PASS |
| 20261021213000, cosméticos Live | PASS |
| 20261021220000, finanzas administrativas | PASS |

Postflight real: 6/6 cuerpos SQL coinciden con el código revisado. Recovery y
terminal-close solo EXECUTE service_role; resumen administrativo solo
EXECUTE authenticated + revalidación admin dentro de SQL. Proyección pública y
set_theme mantienen sus grants previstos. Nueva tabla de preferencias RLS FORCE,
0 filas y sin SELECT anon/authenticated/service_role. Selector sandbox,
Live=false/kill=true/generación=null; merchants/intents/paid_periods/inbox0.
No se tocaron datos de cuentas ni se llamó al proveedor PayPal.

`pazo-paypal-live-account` **v4 ACTIVE, verify_jwt=true**, desplegada desde
fuentes ya verificadas. Nueva configuración explícita de JWT en Git, commit
`b82ac9ee`, con **5/5 Actions SUCCESS**. Descarga posterior: **8/8 fuentes
idénticas** al local. HTTP real POST list: sin Auth401, JWT inválido401,
clave pública sin usuario401. No se presenta como prueba de cuenta Auth positiva
ni operación PayPal real. La conexión administrativa read_only no permite
SET ROLE service_role; esa comprobación no pudo ejecutarse allí, y se conserva
la evidencia de roles real en PG17 y el smoke HTTP negativo.

## P4 — preparación administrativa real, siguiente incremento

RPC `pazo_admin_live_readiness`: proyección admin-only de booleanos y códigos
cerrados, sin leer secretos ni conceder release. Mantiene
`releaseControlsReady=false` hasta la futura implementación controlada; no usa
existencia de SQL como prueba de versiones Edge. UI descarta respuestas de otro
admin, distingue lectura no disponible y vuelve a consultar tras guardar claves.
Vault conserva el estado de guardado recibido del backend después de remount y
no ofrece otro envío tras un resultado incierto; solo consulta de estado.

Nueva migración `20261021223000` con rollback: **preparada, todavía no aplicada**
en este checkpoint. Gate financiero de activación sigue pendiente; no se pide
introducir credenciales PayPal aún. El endpoint Vault no cambió en esta entrega.

Verificación de este incremento: verify:prepreview **1,788 pruebas PASS**
(11+101+3+476+1193+4); PG17 completo PASS con admin/nonadmin/revocación, claves
sin release, heartbeat vencido, no IDs privados y rollback/reapply de readiness;
React pruebas de cuenta tardía y guardado incierto/restaurado; Chromium390/1440
PASS de overflow, teclado, lectura fallida sin estado anterior y cero llamadas
financieras. Datos del navegador son sintéticos, no credenciales realmente guardadas.
Componente readiness nuevo lint0/0; archivos existentes conservan baseline.
Build conserva warning de bundle. Harness temporal retirado, capturas y logs
privados fuera del repo.

## Readiness instalado y código publicado en GitHub

`3dcd8e07` publicado en PR67: **5/5 GitHub Actions SUCCESS** comprobados
contra ese SHA exacto (verify, live-gateway-pg17, f14-postgres,
f16-p12-staged-install, f16-p21-worker-schema-rehearsal). La orden adicional
del PO de subir cada cambio con documentación queda registrada en el handoff.

Migración `20261021223000_pazo_f16_live_admin_readiness` **APLICADA** como
continuación técnica no financiera autorizada. Auditoría previa: función e
historial ausentes, selector sandbox/Live=false/kill=true/revision0. Ensayo
BEGIN/ROLLBACK PASS y ausencia posterior verificada. Instalación e historial
atómicos; cuerpo SQL alojado idéntico al archivo revisado.

SHA256 del SQL:
`e4a0355be9d06920e85dc602be5d91e0c5aa480e19789e51a98cce86a6d93828`.
Postflight: EXECUTE authenticated=true, anon=false, service_role=false; llamada
sin auth.uid denegada. No se simularon identidades en la base alojada ni se
presenta ese negativo como prueba de sesión administrativa real. Selector
permanece sandbox/Live=false/kill=true/generación=null/revision0; intentos y
períodos pagados0. No llamada PayPal ni publicación Vercel. El párrafo anterior
«todavía no aplicada» describe el checkpoint previo, ya superado.

Pendientes efectivos: habilitación controlada P4, fuentes checkout/webhook
actualizadas, validación HTTPS/PWA y canary real con autorización explícita.
No READY_FOR_PO_CREDENTIALS ni beta lista.
