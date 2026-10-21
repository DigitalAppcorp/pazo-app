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

Migración INSTALADA UNA vez: `supabase/migrations/20261021021050_pazo_f16_live_resource_inspection.sql`,
SHA256 `392f887b3f457a14f2cafa3fb27955fc38ca0d7492c9299d07cc3d0a526c7da7`.
ACL exacta postgres/service_role, propietario postgres, search_path vacío, sin
EXECUTE anon/authenticated. Ambas RPC conservan las compuertas OFF.
Rollback: `supabase/rollbacks/f16_live_resource_inspection_REVIEW_REQUIRED.sql`,
después de deshabilitar el endpoint; conserva metadata/auditoría existentes.

Pruebas: 17 HTTP/proveedor/metadata y tres React; PG17 con roles reales,
claims/ACL, generación incorrecta, conflicto de ID, idempotencia, OFF y rollback;
`verify:prepreview` PASS. bdf316495c08045b845b79d3b31f2c419c2f426e: CI9/9 SUCCESS.
Endpoint ACTIVE v1/JWTtrue; 8/8 fuentes verificadas. HTTPS: OPTIONS permitido204,
origen ajeno403, POST sin JWT401. La comprobación real del operador todavía no se
ha ejecutado; requiere claves solo en su formulario privado. Identidad merchant, custodia generacional,
firma y circuito financiero continúan pendientes.

API oficial: [Webhook details](https://developer.paypal.com/api/webhooks/v1/)
y [autenticación Edge](https://supabase.com/docs/guides/functions/auth).

Primera lectura real: el PO recibió `live_plan_terms_unverified`. La pantalla del
plan confirmó cobro automático de saldos pendientes activado. El PO lo desactivó
y guardó; lectura independiente confirma el cambio y precio/términos conservados.
Además el editor muestra importe cero como `0.0`: el comprobador ahora acepta
solo las tres representaciones USD equivalentes `0`, `0.0`, `0.00`, sin convertir
floats ni redondear valores positivos. La regresión reproduce primero el rechazo
anterior. No se omite ningún control de precio, plazo, impuestos o atraso.
Este resultado todavía no valida el Webhook ID; el control falla antes de su GET.
