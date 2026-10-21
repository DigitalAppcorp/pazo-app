# Comprobación privada de recursos Live

La orden maestra de beta y autorización técnica permanente del PO cubren este
paso no financiero. El webhook comunicado por el PO sigue siendo un candidato;
recibir su ID no acredita configuración, identidad del comercio ni entrega.

`pazo-admin-paypal-live-inspect` requiere JWT, GoTrue, grant administrativo actual
y TOTP firmado de los últimos cinco minutos. Solo admite los orígenes existentes
de PAZO y JSON de hasta 2048 bytes. La reserva procede de PostgreSQL para ese
administrador y plan guardado; el navegador no selecciona plan, generación o host.

Administración → Configuración → PayPal → Live permite introducir claves para una
comprobación efímera. Los campos se vacían al enviar; no hay almacenamiento del
navegador ni devolución de claves/tokens. Solo OAuth y GET del plan/webhook en
`api-m.paypal.com`: plan ACTIVE, USD 2.99 mensual sin extras, URL generacional y
los diez eventos exactos, sin comodines, duplicados o eventos adicionales.

Tras comprobar y releer la reserva se registra solo Webhook ID y auditoría de
configuración. La RPC rechaza otro ID y recupera el mismo resultado sin duplicar
auditoría. Validación global sigue `not_verified`; reserva sigue `reserved`.
No finaliza merchant ni guarda claves en Vault/Edge Secrets. No activa checkout,
inbox, conciliador o beneficios. No acredita identidad comercial, entrega o firma.

Migración: `supabase/migrations/20261021015708_pazo_f16_live_resource_inspection.sql`.
Rollback: `supabase/rollbacks/f16_live_resource_inspection_REVIEW_REQUIRED.sql`,
después de deshabilitar el endpoint; conserva metadata/auditoría existentes.

Pruebas: 17 HTTP/proveedor/metadata y tres React; PG17 con roles reales,
claims/ACL, generación incorrecta, conflicto de ID, idempotencia, OFF y rollback;
`verify:prepreview` PASS. CI, instalación y comprobación real del operador se
registran por separado en el handoff. Identidad merchant, custodia generacional,
firma y circuito financiero continúan pendientes.

API oficial: [Webhook details](https://developer.paypal.com/api/webhooks/v1/)
y [autenticación Edge](https://supabase.com/docs/guides/functions/auth).
