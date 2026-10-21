# PAZO F16-P11 — Auditoría alojada real y siguiente autorización operativa

**2026-10-15.** Product Owner: «0o sigue» / continuación de P10. Rama `f13/section-titles-20261012`, PR #44 DRAFT, PAZO gratuito con contribución opcional USD 2.99/mes aún no disponible. Auditoría de solo lectura autorizada implícitamente por la continuidad del trabajo; **sin DDL hosted, compras Sandbox nuevas, cambios PayPal, worker o beneficios**.

## Verificaciones realizadas AHORA con herramientas conectadas

Proyecto Supabase `mrybvqdebbgcayuvgkkr`: **ACTIVE_HEALTHY**, PostgreSQL 17.11.0.002.

Consulta SQL READ ONLY al esquema privado (2026-10-15):

| Señal | Resultado |
|---|---:|
| `paypal_subscription_intents` | 1 |
| Intenciones `bound` | 1 |
| Eventos `paypal_verified_event_inbox` | 8 |
| Eventos `pending` | 8 |
| Entradas `paypal_payment_entries` | 0 |
| Entradas `paypal_payment_reversals` | 0 |

Consulta de catálogo: las dos tablas P06 `paypal_p06_offers` y `paypal_p06_checkout_attempts` **NO están instaladas**. No se instaló `f16_p10_bind_recovered_checkout`. Las dos funciones núcleo de escritura ledger/reverso comprobadas no tienen `EXECUTE` para `anon`/ `authenticated`. Esta observación no garantiza que todo el resto de la configuración esté seguro: requiere auditoría específica antes de DDL.

Supabase Edge: `f16-paypal-webhook` **ACTIVE v13** `verify_jwt=false`, destinado a verificar firmas PayPal, pero **no es un worker financiero de conciliación**. También existe `paypal-webhook` **ACTIVE v35** (otro slug); NO reemplazar, reutilizar ni cambiar su destino sin auditar su propósito, para evitar romper flujos ajenos a PAZO.

Migraciones alojadas relevantes: `20261013215221` fundación, `20261014042616` inbox, `20261014042646` intents/ledger, `20261014073658` admisión global, `20261014094349` 2 tipos de eventos. P06/P07/P08/P10 posteriores no están instaladas.

**Invariante financiera:** el QA Sandbox histórico pagó una vez según investigación anterior, pero ninguna fila durable ledger ni período contractual prospectivo está acreditado aquí. Estos 8 eventos históricos continúan PENDING; no repetirlos o desbloquear derechos con esa prueba. `paidThrough=null`, `mayGrantBenefits=false`.

## Entregable reproducible

Nueva consulta `supabase/queries/f16_p11_hosted_payment_readiness_READ_ONLY.sql` lista solamente conteos, catálogos y verificaciones de roles. Es read-only; resultado explícito `may_activate_checkout=false`, `may_create_paid_period=false`, `may_grant_benefits=false`, etc. Una prueba Node comprueba contenido y que no haya DDL/DML. Los resultados no se almacenan en una tabla ni contienen datos de usuarios.

## Camino crítico hacia cobros (no más simulaciones de autenticidad)

1. **Términos ES/EN definitivos y privacidad:** finalizar copy de Amigo PAZO (renovación 2.99/mes, cancelación, período contractual, identificación titular, comprobante y retención), obtener revisión de aplicabilidad legal/contable P01–P09. No publicar el copy sintético del laboratorio.
2. **GO específico de migración Sandbox P06–P10:** convertir los borradores protegidos en una migración revisada, crear vía CLI con versión auténtica, instalar en el proyecto alojado solo con autorización PO, revocaciones atómicas de `public`, rollback/preflight y posterior verificación roles RLS. Los `DO_NOT_APPLY` tienen guard que **prohíbe** correrlos directamente hosted.
3. **GO distinto para Edge privado no habilitado:** desplegar integración autenticada, bandera OFF y sin cuotas adicionales ni cobros hasta verificación de Auth, rate limits e idempotencia. Separar listener firmado PayPal y worker de conciliación.
4. **GO distinto para PayPal Sandbox/E2E controlado:** compra nueva solo cuando términos/versiones aceptadas, webhooks y cobertura de disputas y refunds estén probados; verificar ledger sale COMPLETED, reversos, obligaciones/first period con merchant next_billing_time, grants correctos. No reusar 8 eventos viejos ni alegar cobertura por lista corta.
5. **Live por último:** autorización PO independiente y criterios de reconciliación, cancelación online y monitoreo; PAZO sigue gratis.

**Siguiente decisión de Product Owner que realmente desbloquea el trabajo:** aprobar los términos bilingües y permisos operativos de Sandbox por separado. El «sigue» presente **no se ha interpretado como GO para cambios alojados**.

Referencia técnica: `docs/PAZO_F16_P10_RECOVERED_BINDING_DRAFT_GATE_20261015.md` y `docs/PAZO_ACTIVE_HANDOFF.md`.
