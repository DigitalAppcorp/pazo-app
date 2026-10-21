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
