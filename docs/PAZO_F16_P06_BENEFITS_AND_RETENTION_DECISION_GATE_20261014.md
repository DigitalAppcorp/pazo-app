# PAZO F16 — P06 aprobada: reembolsos y beneficios; conservación pendiente

**Fecha:** 2026-10-14. **Estado P06-A–E:** APROBADO por Product Owner tras la propuesta de cancelación, pago fallido, refund parcial, refund total y disputa. **Estado P05, P06-F/G/H/I y retención P01–P04/P09:** pendientes en sus dimensiones restantes. Esto NO autoriza deploy, migración, checkout, entitlements, PayPal Live ni liquidación. PR #44 DRAFT.

## Contrato de ingeniería de P06 aprobado, sin activación

`supabase/functions/f16-paypal-webhook/p06BenefitPolicyLab.mjs` implementa un clasificador **puro, server-only y offline**, con `src/features/supporter/testing/f16P06BenefitPolicyLab.test.mjs`. Sus salidas permiten explicar qué hacer **en un único ciclo verificado**: conservar período pagado pese a cancelación; no extender con pago fallido/pendiente; revisión manual ante refund parcial sin prorrateo; exclusión del único ciclo con refund total; y suspensión de nuevas acreditaciones ante disputa. **Todas** las salidas mantienen `allowGrant:false`, `allowRevoke:false`, `mayChangeBilling:false`, `entitlement:false`, `paidThrough:null` y acceso gratuito. No es una interfaz pública, fuente independiente de verdad ni mecanismo de aplicación real.

Si falta `verified` de owner/ciclo/periodo, la salida es revisión/bloqueo, nunca una membresía calculada. El clasificador no sustituye P05: deben identificarse y verificarse intervalos de facturación reales antes de habilitar cualquier acción del ciclo. Ninguna función se desplegó a Edge, DB, worker, checkout o Vercel.

## Hechos verificados que no equivalen a política comercial

- «Amigo de PAZO» es opcional, USD 2.99 mensuales. Las funciones sociales, asistencia y rescate permanecen gratuitas incluso sin membresía.
- `PAYMENT.SALE.COMPLETED` con intención privada BOUND de Auth es **candidato contable**, no evidencia de un intervalo pagado. Ninguna ruta actual acredita automáticamente beneficios.
- En la API de suscripciones PayPal, `PARTIALLY_REFUNDED` y `REFUNDED` describen el estado acumulado de la **transacción/venta original**, no necesariamente el importe de un evento individual de refund. Cada refund independiente puede tener ID e importe propios. La consulta observada es un estado **actual**, no una reconstrucción temporal infalible.
- La cancelación `BILLING.SUBSCRIPTION.CANCELLED` no prueba por sí misma que un pago anterior se haya reembolsado. Una disputa no debe equipararse automáticamente a un reembolso finalizado; necesita evidencia de estado y desenlace independiente.
- El ledger multievento aprobado (solo laboratorio) suma importes inmutables por `refund_id`, impide superar 299 centavos, permite eventos fuera de orden, bloquea una venta si llegó una devolución primero, y **no crea entitlements**.
- El plazo aprobado de **90 días aplica únicamente al inbox definitivamente conciliado cuando su hold pueda liberarse**, no a dinero, intents o solicitudes de privacidad.

## P06-A–E aprobadas como política comercial — todavía sin ejecución en alojado

| ID | Escenario | Decisión comercial aprobada para A–E; F–I siguen sujetas a gates propios | Evidencia indispensable |
|---|---|---|---|
| P06-A | Cancelar renovación voluntariamente | **APROBADO:** Detener cobros futuros, **no revocar automáticamente** un periodo completo ya pagado y no reembolsado. Mantener lo gratuito. | Fecha de término de cobertura verificable, evidencia de pago del período y cancelación autenticada |
| P06-B | Pago fallido o pendiente | **APROBADO:** No crear ni extender beneficios por ese ciclo. Evitar «periodos de gracia» inventados. | Historial de ciclo PayPal y estado del pago específico |
| P06-C | Reembolso parcial | **APROBADO:** **Congelar solo la decisión sobre beneficios del ciclo afectado** y pedir conciliación/revisión; no prorratear automáticamente en días. Permanecer con acceso gratuito y conservar el registro financiero mínimo. | `refund_id`, centavos, venta/ciclo original, estado de disputa y Terms aprobados |
| P06-D | Reembolso total verificado | **APROBADO:** Extinguir la cobertura atribuible al **ciclo reembolsado**, no borrar evidencia financiera ni afectar otros ciclos realmente pagados. Evitar crear sanción/perfil público. | 299 centavos acumulados para esa venta, dueño Auth vinculado y ciclo original |
| P06-E | Disputa abierta / reverso `PAYMENT.SALE.REVERSED` | **APROBADO:** Retener y **bloquear nuevas acreditaciones** hasta resolución y prueba independiente. No asumir fraude ni refund definitivo. | Disputes API/estado merchant autenticado y sale original |
| P06-F | Renovaciones múltiples | Una compra pagada es candidata a un solo ciclo; no extrapolar por multiplicación de 30 días ni por `ACTIVE`. Distinguir ciclos solapados y fuera de orden. | Inicio/fin de intervalo por proveedor o reglas contractuales explícitamente aprobadas |
| P06-G | Insignias conmemorativas 3/6/12 | Contabilizar **ciclos independientes efectivamente pagados y no revertidos**; no contar renovación fallida, refund, duplicado o pending. | Lista deduplicada de ciclos acreditados; criterio de consecutividad/acumulación aún pendiente |
| P06-H | Muro de mascotas | Exigir `entitlement` válido **y** consentimiento individual actual para cada mascota; si deja de estar activo, dejar de mostrar automáticamente en muro, sin eliminar unilateralmente publicaciones originales. | Consulta server-side, revocación consentida y revisión de caché |
| P06-I | Baja de cuenta | Separar contenido social eliminable, gestión de renovación y evidencia financiera sujeta a obligaciones de conservación. No ejecutar un DELETE financiero genérico en cascada. | SOP F14, revisión de datos vinculados y asesoramiento jurídico-contable |

### Opciones estudiadas ante reembolso parcial — principal aprobada

- **Política aprobada:** congelar la resolución del ciclo reembolsado y resolverlo con un flujo documentado de soporte, sin restar «días proporcionales» por intuición. Puede requerir una experiencia de soporte clara.
- **Alternativa simplificada:** anular por completo el ciclo reembolsado aunque solo se devuelva una parte. Más fácil de calcular, pero potencialmente desfavorable y requiere Terms y comunicación explícita.
- **Alternativa proporcional:** calcular beneficios según fracción devuelta. No recomendable para MVP: fracción monetaria **no equivale** automáticamente a tiempo de uso; complejidad de fechas, badges y reclamos.

**La alternativa principal está aprobada para P06-C; las alternativas de anulación total automática o prorrateo no lo están.** La contabilidad de un refund parcial no autoriza por sí misma conceder/revocar beneficios reales.

## Retención: límites técnicos y decisiones pendientes

No fijar aún un número universal de años ni crear cron de purga. Antes de decidir P01/P02/P03/P04/P09 documentar por categoría:

- **Intents no vinculados:** base legal/propósito, plazo limitado de expiración, estado del checkout y prevención de duplicados.
- **Intents vinculados + transacciones:** duración comercial/contable de la correlación UUID–suscripción, opciones de seudonimización y reclamaciones pendientes.
- **Ledger y refunds únicos:** importe, identificadores opacos, fechas, naturaleza del ajuste, custodia y acceso mínimo, criterios de bloqueo de eliminación por impuesto/contrato/disputa, separadamente del contenido social.
- **Solicitudes de privacidad y consentimiento:** evidencia mínima del cumplimiento sin contenido excesivo.
- **Registro del inbox:** única regla existente = 90 días después de conciliación definitiva y autorización de liberar hold; los eventos pendientes o discutidos requieren revisión, **no eliminación sin límite aprobado**.

La aplicabilidad de CCPA/CPRA y los plazos fiscales concretos para Alvarado Solutions LLC **no se presume**. Se necesita revisión jurídica/contable antes de publicar Privacy Policy/Terms o fijar un TTL financiero.

## Gate técnico adicional: refund recibido fuera de orden

Se descubrió que un `REFUNDED` actual de PayPal no significa que **cada uno de los refund IDs individuales** represente USD 2.99. El SQL del laboratorio exigía indebidamente que un refund de 199 centavos tuviera suma local 299 si la venta ya figuraba `REFUNDED`, bloqueando una posterior devolución de 100 centavos.

Corrección offline en `f16_refund_multievent_ledger_lab_DRAFT_DO_NOT_APPLY.sql`: usar la suma de **refund IDs distintos** como verdad de centavos; conservar el status PayPal observado en el primer registro como snapshot, sin tratar su evolución como cambio de identidad. `PARTIALLY_REFUNDED` cuando el total local es 299 sigue bloqueado por inconsistencia; exceder 299 sigue prohibido. Prueba nueva `f16-refund-cumulative-status-out-of-order-synthetic.sql` cubre reembolso de 199 antes del de 100, replay con status histórico distinto, exceso y prohibición de entitlement.

**No desplegar:** sigue faltando E2E con credenciales PayPal verdaderas y cuenta Auth vinculada, prueba de historial completo de refunds/disputas, revisión de retención, implementación efectiva de P06 solo tras gates P05/hosted y GO separado para migración CLI hosted/Edge/cron/worker/checkout/Live/entitlements/merge.

**Fuentes proveedor:** [PayPal Subscriptions — Transaction Details](https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/), [PayPal Subscriptions webhooks](https://developer.paypal.com/subscriptions/webhooks/), [PayPal Disputes API](https://developer.paypal.com/api/disputes/). Revisado el 14-oct-2026.
