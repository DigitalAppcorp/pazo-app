# PAZO F16-P40 — instalación alojada de esquema vacío, postflight

**Decisión PO:** sí explícito a instalar únicamente la estructura vacía
de vinculación privada P40. Almacenamiento mínimo y criterio provisional de
retención previamente aprobados; esta autorización **NO** cubre escritura
de vinculaciones reales ni activación financiera.

## Cambios instalados

- Proyecto Supabase: `mrybvqdebbgcayuvgkkr` (rama PAZO de trabajo).
- Migración registrada: **`20261016055145_f16_p40_empty_private_activation_bindings`**.
- Archivo versionado idéntico:
  `supabase/migrations/20261016055145_f16_p40_empty_private_activation_bindings.sql`.
- Nueva tabla privada:
  `supporter_private.paypal_verified_activation_bindings`.
- Cuatro campos: `provider_event_id`, `subscription_id`,
  `owner_id`, `created_at`. PK por evento, FK restrictiva al inbox.
- RLS ENABLE + FORCE; sin permisos DML directos a
  `anon`, `authenticated`, `service_role`.
- Trigger privado de integridad exige `BILLING.SUBSCRIPTION.ACTIVATED`
  en inbox verificado, suscripción de intent BOUND y propietario exacto;
  rechaza UPDATE/DELETE y no atribuye beneficios ni acredita pagos.
- **Ninguna RPC de registro P39** creada o desplegada.
- No existen jobs de retención, sweeper o fuentes de terminación instalados.

## Verificaciones observadas tras la migración

Consulta read-only de Supabase posterior al éxito del migrador:
- Filas de P40: **0**.
- `p05_inbox_worker_gate.enabled=false`.
- `paypal_payment_entries`: **0**.
- Inbox verificado: **8** filas (mismas que antes).
- Intenciones: **1** fila (misma que antes).
- RLS FORCE: **true**; trigger custom: **1**.
- Permisos DML anon/authenticated/service_role: **false**.
- RPC P39 de escritura: **no instalada**.
- La migración figura en el historial de Supabase con versión
  `20261016055145`.

## Gates todavía abiertos

1. Política técnica completa de borrado y backups, legal holds y
   revisión jurídica/contable de retención P41 antes de insertar datos.
2. Ingesta P39 con procedencia firmada y revisión de permisos; una mera
   etiqueta de origen no autentica criptográficamente PayPal.
3. Aprobación explícita posterior para aplicar RPC escritor/activar Edge;
   no activar a través de variables o de esta migración.
4. P06 términos y cancelación, Merchant GET, historias completas de
   refunds/disputes, prueba de ciclo y ledger idempotente.
5. Gate específico para PayPal Sandbox buyer, worker, checkout, beneficios
   y posteriormente Live, si procede. P28 histórico diferido.

**F16 permanece NO-GO, PR #44 DRAFT.** No declarar fase completada
ni hacer merge sin Scope Closure Reconciliation y aprobación independiente.
