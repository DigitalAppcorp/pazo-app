> **CORRECCIÓN JURÍDICA PRIORITARIA — 2026-10-14:** California BPC §17602(a)(6) **sí exige** conservar prueba de consentimiento expreso para renovaciones automáticas aplicables por **al menos 3 años O 1 año después de terminar el contrato, el plazo más largo**. No deriva de la regla FTC anulada. Cualquier afirmación histórica de «plazo de consentimiento no definido» en este documento queda SUPERADA; **solo las demás clases** de datos financieros/reversos/retención P01–P04/P09 siguen sin plazo aprobado. La recolección sigue deshabilitada. Fuente https://law.justia.com/codes/california/code-bpc/division-7/part-3/chapter-1/article-9/section-17602/ y diseño corregido `docs/PAZO_F16_P05_RETENTION_AND_PROVIDER_PROVENANCE_GATE_20261014.md`. No autorización de borrado automático ni migración hosted.

# PAZO F16-P05 — Diseño mínimo de persistencia privada y orquestación, NO APLICAR

**Estado:** arquitectura propuesta tras auditoría **READ-ONLY** de Supabase hosted el 2026-10-14 (timestamps del auditor UTC 2026-10-15). No es una migración, procedimiento de despliegue, GO de retención, implementación server real ni autorización de acreditar períodos. Rama `f13/section-titles-20261012`, PR #44 DRAFT; F16 beta pagos NO-GO.

## 1. Esquema REAL confirmado (lectura directa de Supabase)

Proyecto `mrybvqdebbgcayuvgkkr`; esquema `supporter_private`:

| Tabla instalada | Clave / datos actuales | Consecuencia |
|---|---|---|
| `paypal_subscription_intents` | `intent_id` PK; `external_subscription_id` UNIQUE; `owner_id`, plan/state. 1 fila BOUND | **Reusar** propiedad verificada. No tabla de compradores ni nuevo intent para la prueba |
| `paypal_verified_event_inbox` | `provider_event_id` PK, `event_type`, `verified_at`, estado `pending/processing/quarantined/processed`; 8 filas, las 8 pending | Reusar deduplicación de webhook. **NO almacena** calendario ni body original; signed-at-ingress solo |
| `paypal_payment_entries` | `external_payment_id` PK, `external_subscription_id`, `owner_id`, plan, `gross_minor_units=299`, USD, completed_at, `entry_state` uncredited/blocked_reversal; 0 filas | Ledger financiero restringido ya existe; **no concede beneficios** por sí mismo |
| `paypal_payment_reversals` | `external_payment_id` PK, tipo refunded/reversed/partially_refunded, provider_verified_at; 0 filas | Reusar estado de reversos verificados, sin presumir historia completa |

Cada tabla de `supporter_private` consultada mostró `relrowsecurity=true`, `relforcerowsecurity=true`; ninguna política RLS; `anon`, `authenticated` y `service_role` sin privilegio de SELECT directo. Eso es **privado por diseño**; el advisory `rls_enabled_no_policy` INFO no equivale automáticamente a vulnerabilidad si se preserva este boundary. **No agregar SELECT ni policies permisivas**. Las funciones `public.f16_paypal_{create,read,bind}_private_intent`, `f16_paypal_record_verified_event`, `f16_paypal_commit_verified_sale`, `f16_paypal_commit_verified_reversal` son `SECURITY DEFINER` con `search_path=''`, EXECUTE autorizado a `service_role` únicamente (no `anon`/`authenticated`). Funciones privadas requieren owner privilegiado; servicio no tiene DML directo. Nuevas funciones deberían respetar esa frontera y no confiar en parámetros ni booleans de caller.

**Advertencia:** `f16_paypal_commit_verified_sale` relaciona un event ID ya registrado y una intención BOUND, pero la función SQL por sí sola **no puede atestar** que el merchant GET esté autenticado ni la venta se asigne a un período; esa validación debe hacerse server-only antes del RPC. No cambiar su contrato silenciosamente.

## 2. Mínimo delta de datos propuesto — **NO CREAR AÚN**

Se recomienda **NO** crear otra tabla para intenciones, inbox, venta o reverso. Agregar tres conceptos pequeños **solo tras decisión y autorización sobre conservación**:

**A. `supporter_private.paypal_terms_acceptances` — evidencia precheckout**
- `intent_id` text PK/FK `paypal_subscription_intents(intent_id)`, `owner_id` uuid verificado contra intent. `offer_version` text, `offer_sha256` hex64, `cancel_notice_version`, `privacy_notice_version`, `acknowledged_at` timestamptz, `recorded_at` timestamptz generado por servidor.
- Primero crear `intent` privado en estado pending sin acción PayPal; después registrar la aceptación mediante una operación server-only con identidad Auth confirmada y contenido/versiones publicadas, sin checkbox premarcado; no permitir que el cliente fije `owner_id`, `acknowledged_at` o SHA arbitrarios. **Orden temporal:** primero aceptación validada, luego creación PayPal. Si no se acepta, NO llamar POST a PayPal.
- Inmutabilidad/versionado: cambiar condiciones exige nuevo registro/versión de evento, no sobrescribir aceptación anterior. Como `intent_id` es único, el MVP primera compra tiene una aceptación para ese intento; cambios posteriores requieren entidad/version separada antes de implementarlos.
- Retención y borrado/anonimización financiera: **pendientes**; sin aprobación NO insertar.

**B. `supporter_private.paypal_activation_schedule_evidence` — fotografía del proveedor**
- `external_subscription_id` text UNIQUE y FK a `paypal_subscription_intents(external_subscription_id)`; `activation_event_id` text UNIQUE y FK a `paypal_verified_event_inbox(provider_event_id)`; `merchant_observed_at` timestamptz; `activation_at` timestamptz; `observed_next_billing_at` timestamptz (no nulo, `>` activation); `source_version` smallint; `recorded_at`.
- Tomar instantánea de merchant GET cerca de la activación y correlacionar con event ID de activación verificado en inbox; nunca guardar body completo, email del pagador, credenciales o endpoint con token. **Registrar estado SOURCE_ATTESTED solo desde backend confiable** tras comprobar firma de webhook y GET merchant; no aceptar un boolean desde cliente/worker sin cadena de confianza.
- Evidencia proveniente del evento histórico podría ser un candidato adicional si la GET actual ya es CANCELLED, **no** sustituye un contrato aceptado antes del cobro ni otorga retroactividad.
- Si `next_billing_time` no aparece, se contradice con evento o fue obtenido después de cancelación/cambio: quarantined/manual review. Nunca calcular `nextBillingAt` con `+30d` o local TZ.

**C. `supporter_private.paypal_first_period_reviews` — ciclo candidato, NO beneficios**
- `external_subscription_id` UNIQUE/FK a B; `external_payment_id` UNIQUE/FK a `paypal_payment_entries(external_payment_id)`; `activation_event_id` FK a B; `owner_id` uuid derivado del intent; `service_starts_at` y `service_ends_exclusive_at` timestamptz (CHECK inicio `<` fin), `review_state` CHECK únicamente `pending,requires_review,rejected` en primera versión; `reason_code` allowlisted y `evidence_version`; `recorded_at`.
- Los UNIQUE impiden dos reclamaciones de un mismo sale ID o suscripción al primer ciclo. **No crear** columna `is_paid`, `mayGrantBenefits`, `paidThrough` ni estado `approved` en esta propuesta; evita que una tabla de revisión sea confundida con un entitlement activo.
- Insertar candidata solamente desde futuro orquestador service-only que verifique owner/intent, versiones de términos, `PAYMENT.SALE.COMPLETED` merchant+webhook, tipo REGULAR primer cargo, transacción no disputada, cobertura de reversals y calendario de activación; todos pueden fallar de forma cerrada. No utilizar sólo la existencia de una fila `paypal_payment_entries`.
- Para futuros ciclos adicionales se necesita diseño distinto con exclusion de solapamiento, clave de obligación histórica, reintentos/deuda, períodos `[start,end)` y deduplicación transaccional; **NO** inferir ciclos sucesivos desde primer período ni inventar una fuente `cycle_key` de PayPal.

**Ninguna columna ni índice de estas tres entidades está creada;** son especificaciones, no DDL. Un esquema de DDL final requiere names/comprobaciones de exact migrations, constraints, owner, FKs, RLS FORCE, `REVOKE ALL FROM PUBLIC, anon, authenticated, service_role` para tablas, función privilege mínima, migración versionada generada con CLI y pruebas de grants/advisors, previa autorización PO.

## 3. Secuencia futura de integración (sin tocar la prueba original)

```text
Auth verificada -> oferta/terms ES-EN publicados
    -> intent PENDING privado (sin crear PayPal todavía)
    -> opt-in explícito -> aceptación privada versionada por servidor
       (FK al intent PENDING; necesariamente antes del PayPal POST)
    -> creación PayPal (idempotente) -> BOUND verificado
    -> webhook ACTIVATED firmado -> lectura merchant snapshot
    -> append-only calendario prospectivo (fecha de billing observada)
    -> webhook SALE.COMPLETED firmado + GET merchant + owner/plan/amount
    -> ledger existente estado uncredited (solo si fuente y negocio permiten)
    -> revisión de atribución primer ciclo: [activation,nextBilling)
    -> SIEMPRE NEEDS_REVIEW hasta que un nuevo gate operativo
       demuestre venta↔ciclo, reversiones/historia y autorice beneficios
```

**Distinción esencial:** `next_billing_time` es próximo cobro PayPal; PAZO **ha aprobado** emplearlo como límite contractual de servicio futuro con términos aceptados. Eso no hace que PayPal certifique la asignación de una venta a ese intervalo, por lo que ninguna fila candidata debe activar una membresía. El pago Sandbox antiguo CANCELLED no tenía estos términos ni cobertura financiera total; NUNCA rellenar estos registros para acreditar ese ensayo.

## 4. Seguridad y retención pendiente

- No persistir PII del pagador, tarjetas, token, raw webhook body, aprobación URL, ni enviar datos de pagos/consentimiento a PostHog o logs públicos.
- Aprobación legal de *automatic renewal* California: versión/idioma de términos, precio, cancelación en línea en la app, confirmación durable, recordatorios anuales y avisos de precio. Referencia: `docs/PAZO_F16_P05_CALIFORNIA_RENEWAL_AND_RETENTION_DECISION_20261014.md`.
- **P01–P04/P09 OPEN:** separar aceptación/versiones (prueba contractual), ciclo/venta (contabilidad e idempotencia), incidentes (refund/disputa), logs (corta vida), borrado de cuenta y backups. No inventar `90 days`, `3 years`, `7 years` como regla legal universal. Pedir evaluación legal contable y decisión PO del plazo/justificación por clase antes del DDL operativo.
- Toda creación/escritura/cron/worker/backend, envío de emails, integración de cancelación online, habilitación de checkout/beneficios/PayPal LIVE, merge PR y despliegue requieren fases y GO específicos; este documento **no concede ninguno**.

## 5. Estado y ruta de aprobación

**Auditado:** esquema hosted y ACL/grants/índices/funciones descritos arriba mediante SQL SELECT, 1 intent / 8 inbox pending / 0 ledger / 0 reversals. Seguridad advisory devolvió `rls_enabled_no_policy` INFO para tablas privadas deliberadamente no expuestas; conservar controles, revisar al crear tablas.

**Falta antes de proponer migración aplicable:** PO decide/revisa retención P01–P04/P09, textos ES/EN y confirmaciones; equipo define fuente merchant de regular-vs-recovery y de historia/reversals, y límites idempotentes para cambios de plan. Entonces generar draft DDL versionado y pruebas desechables, solicitar GO explícito para SQL hosted y probar security/grants después. F16 NO-GO.
