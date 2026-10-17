# PAZO F16-P05 — Política de atribución de pagos atrasados APROBADA

**Aprobación comercial explícita del Product Owner:** 14 de octubre de 2026, respuesta «sí» a la propuesta presentada tras la lectura merchant Sandbox real. **Alcance:** regla de imputación y evidencia de calendario contractual. **Estado técnico:** DISEÑO APROBADO, **NO ACTIVADO**; no significa cierre íntegro del gate P05, habilitación de membresía ni lanzamiento F16. PR #44 permanece DRAFT.

## Regla comercial aprobada (P05-L)

1. **Imputación histórica comprobada:** un pago atrasado o recuperado se asigna al **ciclo contractual original que originó la deuda**, **únicamente cuando exista evidencia independiente suficiente** para relacionar venta, deuda, suscripción e intervalo exacto de cobertura.
2. **Prohibido mes extra:** cobrar una deuda pasada no inicia automáticamente un nuevo ciclo ni añade 30 días, un mes conmemorativo u otro período de beneficios.
3. **Sin prueba, a revisión:** si no puede verificarse la relación entre el pago y su ciclo, queda en revisión y **no activa ni prolonga beneficios automáticamente**.
4. **Fechas contractuales:** los límites de cobertura se determinan por el **calendario de suscripción verificado** conforme al contrato/registro merchant del proveedor, incluidos cierres de mes de 28, 29, 30 y 31 días; nunca se infieren de `payment.completedAt + 30 días`.
5. **Ninguna fecha inferida:** `last_payment`, `next_billing_time`, estado `CANCELLED`, `failed_payments_count=0` o `outstanding_balance` no justifican, por sí solos, `cycle_key`, `periodStart`, `periodEnd` o `paidThrough`.

**Ejemplos de la regla, no hechos observados:** si el cobro por el ciclo de septiembre se recupera en octubre con prueba de deuda/origen correspondiente, corresponde a **septiembre** y no se convierte en un segundo mes de octubre. Si el cobro de octubre combina cuotas de varios períodos, **no se adjudican meses por dividir importes** sin evidencia independiente por cada ciclo. Si no existe la prueba del ciclo que liquidó, se retiene el crédito y se solicita revisión.

## Límites precisos de esta aprobación

- **P05-L (política comercial anterior) APROBADA.** No aprobar por implicación un algoritmo arbitrario de `cycle_key`, una ancla exacta de fecha/huso horario, una política de suspensiones/reinstalación retroactiva, la correspondencia entre cobros combinados y ciclos, meses conmemorativos consecutivos frente a acumulados (P07), reembolsos no cubiertos por P06-A–E o plazos de retención financiera.
- **P06-A–E sigue APROBADA** con alcance original: cancelar evita renovación futura pero no revoca por sí solo una cobertura *ya probada*; pendiente/fallido sin crédito; refund parcial en revisión sin prorrateo; refund total afecta solo período probado; disputa bloquea nuevas acreditaciones en espera de resolución verificable.
- **No aprobado:** emisión de beneficios/entitlements, ledger/worker, nuevas compras Sandbox, alta de usuario Auth BOUND, migraciones Supabase hosted, Edge/cron, PayPal Live, checkout, PR merge o Vercel. Cada operación requiere GO propio.

## Evidencia disponible y deuda de implementación

El PO ya autorizó y ejecutó el **GET merchant real** de una suscripción anterior Sandbox (14-oct): `merchantReadSucceeded:true`, plan USD2.99/mes, `effectiveTermsConsistent:true`, suscripción cancelada, `observedFailedPaymentCount:0`, `balanceKnown:false`. **Ese ensayo NO estaba vinculado a PAZO Auth**, no demuestra el ciclo liquidado y no puede reutilizarse retrospectivamente para conceder meses. Fuente: JSON **sanitizado aportado por el PO**, resumido en `docs/PAZO_F16_P05_SANDBOX_READ_ONLY_OPERATOR_GO_20261014.md`.

El clasificador offline `p05CycleMappingPreflightLab.mjs` ahora refleja que la regla comercial de atraso **sí está aprobada**. El rechazo de `retry`, `outstanding_capture` o `unknown` se llama `recovered_payment_requires_verified_original_cycle` en lugar de `recovered_payment_cycle_policy_unapproved`. La decisión **sigue sin admitir períodos ni grants**: `cycleAttributionConfirmed:false`, `mayCreatePaidPeriod:false`, `mayGrantBenefits:false`, `mayCountCommemorativeMonth:false`, `paidThrough:null`, `needsManualReview:true`. Esto evita confundir aprobación de un principio con evidencia merchant.

**Próximo gate real:** acordar la fuente contractual auditable del `cycle_key` y de los límites de cada ciclo; planificar el E2E **nuevo** con PAZO Auth BOUND y suscripción merchant Sandbox, que requerirá GO específico para compra simulada y cualquier alta/escritura alojada. Sin esa prueba y sin migración del ledger/worker aprobada, F16 sigue EN CURSO y la beta pública NO-GO. Ningún dato sensible de PayPal o usuario se guarda en este documento.
