# PAZO F16 — Gate de términos, cancelación y retención para Amigo de PAZO

**Fecha:** 2026-10-14. **Estado:** REVISIÓN DE PRODUCTO / LEGAL PENDIENTE. **No publicable.** Se conserva la decisión PO previa: PAZO es gratuita; el aporte opcional `Amigo de PAZO` se oferta a USD 2.99/mes y su facturación recurrente la administra PayPal. Este documento es un **borrador de requisitos**, no Términos aceptados, texto jurídico final, datos recolectados o habilitación de checkout. PR #44 DRAFT, F16 NO-GO.

## 1. Auditoría de California (fuentes y límites)

La *California Automatic Renewal Law*, California Business & Professions Code §§17600–17606, reforzada para contratos celebrados/modificados/extendidos a partir del **1 julio 2025**, exige para ofertas aplicables: términos claros y visibles próximos a la aceptación **antes del cobro**, consentimiento afirmativo expreso, confirmación conservable que incluya términos/política e instrucciones de cancelación, cancelación por el mismo canal — incluido online para alta online —, aviso por cambio de tarifa con 7–30 días previos y recordatorios anuales. La notificación antes de renovar un período anual y los avisos previos al fin de trials largos requieren evaluación solo si PAZO incorpora esas modalidades (NO forman parte del MVP del aporte).

**Fuentes oficiales:**
- [California AG, alerta sobre renovaciones, 4-sep-2025](https://www.oag.ca.gov/news/press-releases/attorney-general-bonta-issues-consumer-alert-california%E2%80%99s-automatic-renewal-law)
- [California B&P Code §17602](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=17602.&lawCode=BPC)
- [PayPal Subscriptions v1](https://developer.paypal.com/api/subscriptions/v1/)
- [FTC Federal Register (2026): la regla de 2024 fue anulada en julio de 2025](https://www.govinfo.gov/content/pkg/FR-2026-03-13/html/2026-04952.htm). **No derivar de esa regla federal anulada una obligación universal de conservar consentimientos 3 años.** Siguen aplicando las exigencias estatales y otras leyes/obligaciones relevantes.

Esto es identificación de requisitos técnicos, no dictamen legal. Debe verificarse su aplicabilidad concreta, idiomas y texto final antes del primer cobro LIVE.

## 2. Borrador del bloque pre-checkout (español / inglés)

**ES — NO PUBLICAR HASTA REVISIÓN LEGAL Y FUNCIONAL:**

> Amigo de PAZO — **US$2.99 al mes**, con renovación automática y cobro recurrente a través de PayPal mientras la suscripción permanezca activa. Es opcional: las funciones gratuitas de PAZO siguen disponibles sin pagar.
>
> Consulta los beneficios incluidos y las condiciones de renovación antes de confirmar. Puedes cancelar la renovación desde [ENLACE DIRECTO DE CANCELACIÓN — NO IMPLEMENTADO]. La cancelación detiene cargos futuros; los beneficios correspondientes a períodos ya pagados y verificados continúan hasta su vencimiento contractual aplicable, sujeto a reembolsos, disputas y las condiciones publicadas. Recibirás una confirmación de las condiciones y cómo cancelar que podrás conservar.
>
> [ ] Acepto expresamente la renovación automática de **US$2.99/mes** y las condiciones de Amigo de PAZO [VERSIONES ENLAZADAS].

**EN — DRAFT, DO NOT PUBLISH:**

> Friend of PAZO — **US$2.99 per month**, automatically renewing and billed through PayPal until canceled. Optional: PAZO's free features remain available without payment.
>
> Review the included benefits and renewal terms before confirming. You can cancel future renewals using [DIRECT CANCEL LINK — NOT IMPLEMENTED]. Canceling stops future charges; benefits for previously paid and verified service periods continue until their applicable contractual end, subject to refunds, disputes, and the published terms. You will receive a retainable confirmation of the terms and cancellation instructions.
>
> [ ] I expressly agree to an automatically renewing subscription at **US$2.99/month** and the linked Friend of PAZO terms [VERSIONS].

**No implementar ni mostrar este bloque en UI hasta que estén definidas:** beneficios concretos aprobados, política de calendario exacta, cancelación funcional, entrega de confirmación retirable/conservable, origen del costo total/impuestos y textos ES/EN finales. La casilla debe iniciar desmarcada; aceptación se registra server-side solo después de permiso PO y revisión legal.

## 3. Política de período de servicio propuesta (NO APROBADA en detalle)

**Opción de implementación que evita el calendario inventado**: para el primer ciclo regular, tras comprobar compra, mismo `intent/Auth/subscription`, venta `COMPLETED` y activación, PAZO podría definir contractualmente como inicio de servicio la hora de activación **merchant confirmada** y como siguiente límite la **fecha de próxima facturación merchant observada al activar**, previamente comunicando esa regla al usuario. En renovaciones, los límites se conciliarían contra el calendario de obligación previo y la nueva `next_billing_time`; para pagos tardíos solo se imputa deuda al ciclo histórico original (P05-L aprobada).

**PERO:** esto es propuesta; `next_billing_time` sigue siendo un evento de cobro futuro, no prueba criptográfica de `paidThrough`. Solo podría funcionar como **fecha contractual de PAZO** si la regla de servicio se comunica/acepta, el proveedor y cobro se reconcilian, y no hay trials, deuda, cambio de plan, reembolso/disputa u otra ambigüedad. Para el caso Sandbox viejo no se aprobó ni capturó ese contrato **antes del pago**, por lo que la propuesta no acredita retrospectivamente octubre–noviembre. No inventar UTC+1 mes, 30 días ni ancla basada en localización del usuario.

**Decisiones PO faltantes:**
- Confirmar o modificar la propuesta de inicio de servicio `activation merchant` y próximo límite `next_billing_time` (como **regla de servicio de PAZO**, no como hecho de PayPal). Considerar que PayPal puede cobrar tarde/reintentar y mover horarios; ante contradicción, revisión sin crédito.
- Definir política de ciclos posteriores y caducidad durante cambio de precio, suspensión, cancelación y refund parcial/total; P05-L/P06 comerciales ya aprobadas en sus alcances limitados.
- Decidir cuándo emitir recordatorios y cómo entregar confirmaciones en ambos idiomas sin enviar información financiera a analytics. No asumir que un banner dentro de la app suple automáticamente la obligación de comunicación.
- Obtener política retención P01–P04/P09 revisada por obligaciones fiscales, contables, privacidad y conflictos.

## 4. Matriz propuesta de retención sensible (sin inventar plazos)

| Categoría | Propuesta de finalidad mínima | Plazo y borrado |
|---|---|---|
| Oferta/versiones/digest y aceptación | Probar condiciones aceptadas y consentimiento expreso | **PENDIENTE aprobación legal/PO**, no fijar años automáticamente |
| `intent`, `subscriptionId`, owner interno | Correlación segura de usuario con contrato | PENDIENTE vincular cancelación y solicitud de eliminación |
| Referencia sale/webhook y adjudicación | Evitar duplicados, atribuir ingresos, atender reembolsos/disputas | PENDIENTE obligaciones financieras y plazos de reclamación |
| Fotografías del calendario merchant | Historial de cambios y soporte de reglas de servicio | PENDIENTE; minimización y retención limitada |
| Datos de reversals/disputas | Conciliar cargos reversados y auditar decisiones | PENDIENTE vencimiento de obligaciones y litigation holds |
| Logs/errores de pago | Seguridad y diagnóstico sin tokens/PII | PENDIENTE; redactar/limitar incluso si hay un incidente |
| Backups y eliminación de cuenta | Políticas técnicas, conservación exigida legalmente | PENDIENTE diseñar borrado/anonimización selectiva y recuperación |

No aplica asumir retención universal `90 días` al ledger por el TTL del inbox firmado. No borrar un registro financiero que tenga conservación legal o disputa activa solo porque se solicitó baja de cuenta; separar datos sociales eliminables de referencias financieras mínimas legítimamente conservables, tras evaluación legal aplicable. El CCPA/CPRA ofrece excepciones específicas al derecho de eliminación **para negocios sujetos a esa ley**; evaluar aplicabilidad sin presumirla. Fuente: [California Civil Code §1798.105](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.105.&lawCode=CIV) y [California AG CCPA](https://oag.ca.gov/privacy/ccpa).

## 5. Control de lanzamiento OFFLINE

`src/features/supporter/testing/f16SupporterReleaseDisclosureGate.mjs` + `f16SupporterReleaseDisclosureGate.test.mjs` enumeran 18 controles independientes: oferta, consentimiento, cancelación online, confirmación conservable, notificación anual, aviso por nuevo precio, privacidad y retención, verificación Auth/PayPal, período y reversos. Entradas simuladas no son atestación de runtime. **Incluso si todos los indicadores son true, el resultado máximo es `ALL_CONTROLS_CLAIMED_NOT_ATTESTED`**, nunca autorización, lanzamiento, cobro o beneficios.

### Gate único siguiente

El Product Owner debe aprobar o corregir **la regla concreta de período de servicio propuesta**, no la arquitectura de prueba ya aprobada. Después, decidir política de retención con revisión legal; preparar esquema privado **DRAFT_DO_NOT_APPLY**, revisión RLS/idempotencia y tests contra datos sintéticos. Cada mutación hosted, PayPal buyer, worker, Live o habilitación de beneficios requiere autorización específica. No repetir el E2E buyer Sandbox ya cancelado.
