# PAZO — F17 / PayPal Live L1: verificación técnica tras activación

**Observado:** 2026-10-24 01:50 UTC (2026-10-23 18:50, Los Ángeles). **Fuentes:** Supabase alojado, código F17, manifest de release, GitHub CI. **Base:** F17 commit 860c036d82b5fdfe0712b738f6528f7e31505d84 / PR #81. Solo lecturas; sin nuevos cobros, sin cambiar producción, sin fusionar main.

## Matriz de verificación

| Gate | Estado | Evidencia |
| --- | --- | --- |
| Activación administrativa L1 | **PASS** | Release mode = limited; campaña active; L1_FIRST_REAL; capacidad 1; revisión 2; inicio 2026-10-24T01:45:25Z |
| Certificado y salud | **PASS** | hosted_gate_verified=true, 1 certificado; gradual_health()=true |
| Legado QA | **PASS (base local)** | gradual_legacy_open()=0; 0 intentos Live; 0 eventos HELD; 0 períodos pagados; purga selectiva #88 |
| Exclusión QA | **PASS** | 8 cuentas Auth antiguas, 8 QA etiquetadas, 0 usuarios reales elegibles, 0 invitaciones, 0 admisiones |
| Worker / webhook / merchant | **PASS en lecturas** | Worker activo y heartbeat reciente, sin incidentes; release switch Live y orígenes canónicos correctos |
| Edge desplegado | **PASS** | checkout v6 hash 75a4935b..., worker v10 hash 97850c30..., admin v2 hash f40b6ba3..., iguales al manifiesto #85 |
| CI y experiencia HTTPS/PWA | **PASS por CI existente** | Runs 40046309216, 40046309318, 40046309325, 40046309350: 12/12 jobs success; Chromium y HTTP/PWA oficiales aprobados |
| Primera compra PayPal Live auténtica | **NO OBSERVADA** | 0 compradores reales; 0 nuevas suscripciones; 0 eventos de venta completada |
| Ledger, cobertura, insignia en compra real | **NO OBSERVADOS** | Los contratos y las pruebas sintéticas existen, pero no se ha procesado una venta real |
| Renovación, cancelación, reembolso, disputa Live reales | **NO OBSERVADOS** | Workers de sale/refund/lifecycle/dispute e idempotencia probados sintéticamente, no en un ciclo de comprador real |
| F17 merged en main | **PENDIENTE** | PR #81 sigue draft y sin merge. No cerrar fase hasta reconciliar scope y autorización de release |

## Contratos de implementación revisados

- Ningún cliente paga solo por entrar. Un usuario nuevo elegible acepta los términos US$2.99/mes y autoriza personalmente la suscripción en PayPal; el servidor exige cupo y permiso en modo limitado.
- El motor gradual permite 1 comprador al inicio, promueve automáticamente capacidad 5/20/50 con 1/3/10 compradores distintos validados, y mantiene un presupuesto de 5 invitaciones con 72 horas, FIFO e idempotencia para los futuros usuarios reales.
- La firma de PAYMENT.SALE.COMPLETED, la conciliación en el merchant/generación original y la prueba de período duradero son necesarias para acreditar dinero y beneficios. Un return PWA, APPROVAL_PENDING o ACTIVE no son prueba de venta.
- La UI separa pagar, verificación pendiente, beneficios activos o terminados y revisión por incidencia. Cancelar una renovación no debe borrar cobertura ya pagada; fallos inciertos se protegen por REVIEW_REQUIRED.
- No cambiar la generación PayPal/secretos; no abrir checkout público; no fusionar main por el solo hecho de que L1 se activó.

## Riesgo residual

La prueba prebeta se eliminó selectivamente de Supabase, pero el GET PayPal de su referencia original devolvió 404 anteriormente. La eliminación DB no prueba cancelación externa. Si llega un evento tardío, preservarlo y revisarlo; nunca conceder cobertura por un evento aislado ni eliminar evidencia de un comprador real.

## Siguiente validación de ingeniería

1. Esperar una interacción voluntaria **de una cuenta nueva real**, sin fabricar compras de prueba; comprobar elegibilidad, invitación, cupo, consentimiento y URL de PayPal.
2. **Solo si alguien realiza realmente el pago:** comprobar webhook firmado, transacción del proveedor, ledger/período acreditados, activación de beneficios y badge sin falso positivo.
3. Si abandona antes del pago, verificar con lectura segura que se retoma el mismo intento; no efectuar compras ni cancelaciones arbitrarias desde el administrador.
4. Ante salud financiera negativa o estado remoto incierto, comprobar pausa segura, leases/idempotencia y conservación de renovaciones/cancelaciones legítimas.
5. Para cierre de F17, reconciliar todo el DoD, revisar PR #81 y autorización PO antes de merge a main.

**Estados:** L1_CAMPAIGN_ACTIVE_PASS | TECHNICAL_READONLY_PASS | FIRST_REAL_PAYMENT_E2E_NOT_OBSERVED | F17_SCOPE_CLOSURE_PENDING. Marketing corresponde a otro agente.
