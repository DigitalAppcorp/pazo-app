# PAZO F16 — Retención financiera y procedencia PayPal: gate de aprobación antes de SQL

**Fecha:** 2026-10-14. **Estado:** política técnica propuesta, corrección jurídica comprobada, revisión legal/PO **PENDIENTE**. Documento redactado para primer período prospectivo de Amigo de PAZO, sin nuevas compras, sin escritura hosted, sin procesamiento del inbox y sin beneficios. Aplicabilidad concreta y retención más prolongada: revisión jurídica/contable previa a LIVE. PR #44 DRAFT / F16 NO-GO.

## 1. Corrección jurídica MATERIAL — California consent verification

Ley de California **Business and Professions Code §17602(a)(6)**, aplicable a renovaciones automáticas que reúnan los supuestos de la norma, exige conservar **verificación del consentimiento expreso** **al menos 3 años, o 1 año después de terminado el contrato, lo que sea más largo**. Esta disposición estatal existe con independencia del estado de la regla federal FTC Click-to-Cancel de 2024. La afirmación antigua de que no había plazo especial obligatorio para consentimientos **era incompleta**, aun si es cierto que no corresponde invocar una regla FTC anulada.

Fuente con texto normativo (consultado en 2026): https://law.justia.com/codes/california/code-bpc/division-7/part-3/chapter-1/article-9/section-17602/ ; https://codes.findlaw.com/ca/business-and-professions-code/bpc-sect-17602/ ; sitio legislativo oficial https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=17602.&lawCode=BPC (si el sitio bloquea bots, usar texto secundario y revisión legal).

**Interpretación operativa propuesta para un contrato futuro aplicable:** `not_before=max(accepted_at + 3 años calendario, contract_terminated_at + 1 año calendario)`; si el contrato sigue activo, no hay fecha final determinada; conservar verificación. La ley exige verificación de consentimiento, no recopilar tarjetas, documento ID, IP precisa ni nombre de titular de PayPal. Para conservar verificación defendible: referencia de intención y usuario de backend, hora servidor, aceptación afirmativa sin casilla premarcada, SHA256 de versión de oferta/condiciones/avisos con acceso a archivo inmutable de texto exactamente mostrado, idioma y canal, evidencia de presentación, y estado de confirmación conservable. Validar suficiencia de este paquete con abogado.

**No mezclar clases:** la regulación CCPA 11 CCR §7101 impone, **a empresas sujetas a CCPA**, al menos 24 meses para registros de solicitudes de privacidad y respuestas; no es plazo universal para conservar toda la cuenta o todos los pagos. Fuente: https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf y https://www.law.cornell.edu/regulations/california/11-CCR-7101. El IRS indica que los documentos que respaldan ingresos/deducciones normalmente se conservan según prescripción fiscal aplicable: ordinariamente 3 años pero existen plazos 6/7 años o indefinidos en escenarios específicos, entre otros; no imponer 3 años por defecto a todo ledger: https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records .

## 2. Política por clases, propuestas sin habilitar borrado

| Categoría | Mínimo/regla para revisión | Riesgo / condición adicional |
|---|---|---|
| Verificación consentimiento renovación CA | **Obligación base §17602(a)(6)**: >=3 años desde aceptación o >=1 año tras terminación, lo más largo, cuando aplicable; mientras activa, conservar | Condiciones/texto efectivamente mostrados y prueba de opt-in, cambios de término, litigio/hold; revisión abogado |
| Versiones inmutables de oferta/términos cancelación | Mantener reconstrucción junto con consentimiento pertinente durante el mismo mínimo aplicable | Si se sobrescriben versiones, hash no basta para reconstruir |
| Facturas/ventas y referencias financieras | Plazo **PENDIENTE** de asesoría fiscal/contable por tipo/ejercicio y estado de disputas | IRS no establece «7 años para todo» ni «3 años para todo» |
| Snapshot calendario PayPal y período candidato | Retener mientras necesarios para explicar acreditaciones, incumplimientos, disputas y registro financiero; **plazo PENDIENTE** | Minimizar cambios/horarios, no registrar webhook bruto ni credenciales |
| Reembolsos, reversals, disputes, debt allocation | Mantener según periodo legal/contable y hold activo; **plazo PENDIENTE** | Prohibido borrar mientras disputa o obligación abierta |
| Inbox event firmado (IDs mínimos) | TTL/retention hold existente no equivale al ledger ni consentimiento | Preservar idempotencia/event audit de reconciliación sin PII |
| Solicitudes CCPA y respuesta, SI ley aplica | >=24 meses por 11 CCR §7101 | Almacén de solicitudes protegido y con finalidad restringida |
| Logs de depuración | Minimizar, redactar; vencimiento operacional **PENDIENTE** | No usar logs como prueba principal de consentimiento, no PII de PayPal |
| Backups/baja de cuenta | Documentar ventanas de expiración, tombstones e información con obligación legal de retención | Separar cuenta social eliminable de asiento contable y consentimiento legalmente retenidos; nunca reactivar acceso de cuenta borrada |

Sin plazo autorizado para una clase específica, **no activar eliminación automática ni captura masiva**. Para solicitudes de eliminación, revisar clase por clase, documentar excepciones aplicables y mecanismo de anonimización cuando ya no sea necesaria la identificación; no retener PII sin base legítima ni negar eliminación de forma general. La norma CCPA tiene umbrales de aplicabilidad; PAZO debe evaluar si está sujeta.

## 3. Cálculo offline sin poderes de eliminación

Código `src/features/supporter/testing/p05CaliforniaConsentRetentionLab.mjs` y tests:

- `calculateF16CaliforniaConsentMinimum`: si `californiaRenewalLawApplies:true`, acceptedAt y terminatedAt canónicos, calcula **primer momento mínimo posible** tras cumplir ambos límites; si sigue activa, `minimumUntil:null`; años calendario y 29-feb se estabilizan sin sumar `365*3`.
- `auditF16CaliforniaConsentRetention`: si falta terminación atestada, aplicabilidad legal, revisiones contables/privacidad, un hold está activo o la fecha mínima no pasó, `RETENTION_BLOCKED`. Aun si todo parecería completo, máxima salida `ELIGIBILITY_REVIEW_CANDIDATE_ONLY`, `recordMayBeDeleted:false`, `erasureAuthorized:false` siempre, `dbWrites:0`. No recibe IDs de usuario, ni elimina registro real.
- No integrar cálculo en producción sin revisión de abogado, seguridad, calendarios de retention holds, worker y un GO separado.

## 4. Procedencia server-only para venta→primer período (sin atestación fabricada)

La auditoría alojada reciente confirmó:
- `supporter_private.paypal_subscription_intents`: owner UUID + intent privado BOUND + ID externo UNIQUE;
- `paypal_verified_event_inbox`: event ID firmemente deduplicado, `event_type` y `verified_at`; **NO contiene resource completo / sale ID / sub ID**;
- `paypal_payment_entries`: sale PK UNIQUE, `entry_state:'uncredited'` inicial; cero rows actualmente;
- `paypal_payment_reversals`: sale PK UNIQUE; cero rows actualmente.

**No basta** hacer join inbox + intent + sale por IDs aportados al RPC; esos registros no atestan por sí solos que el sale corresponde al primer ciclo. La cadena independiente recomendada antes de un nuevo RPC:
1. Verificar `getUser(jwt)` server-only del owner; nunca confiar en ownerId del cuerpo HTTP o JWT user_metadata.
2. Obtener intent privada `pending`→aceptación verificada por backend→PayPal create/bind BOUND y términos versionados publicados; **no comprar sin aceptación**.
3. Webhook llega; verificar firma con PayPal en ingreso, guardar event ID/type en inbox con idempotencia. Para procesar, recuperar **el mismo evento por GET OAuth merchant** (porque inbox no guarda resource) y comprobar `event.id`, tipo, `resource.billing_agreement_id` / `subscriptionId`, `saleId` y referencias con GET merchant autenticado. Registrar proveniencia de esos GETs, timestamps y versiones de reglas, sin almacenar cuerpo crudo.
4. Para activación, mismo método evento firmado + GET merchant del plan/sub, `next_billing_time` observado en ese momento, sin derivarlo de `start_time`.
5. Validar cobro del **primer ciclo regular** por evidencia merchant auténtica adicional; `cycles_completed=1` y `sale.completedAt` por sí solos NO certifican obligación liquidada; deudas/late capture/fallos/plan overrides/transaction history incompleta => revisión manual. Si no hay fuente que lo pruebe, no inventar atributo `cycle_key`.
6. Reconciliar refunds, reversals, disputes e historial suficiente antes de otorgar beneficios; idempotencia `provider_event_id`, `external_payment_id`, `external_subscription_id` (UNIQUE actuales) y única atribución primer período. Aún no hay worker/ledger/grants habilitados.

### Riesgo estructural a resolver antes de instalar

**El inbox firmado solo retiene ID/tipo; un GET posterior de evento no verifica criptográficamente la firma original.** La propiedad “firmado” se confía al boundary en recepción, y el refetch merchant valida contenido contra el proveedor. Un gate operativo requiere demostrar integridad del procesamiento de la asociación `provider_event_id` con el contenido refetch y su estado en el inbox; ninguna bandera `signed:true` de payload del navegador sustituye lo anterior. Evaluar qué ocurre si el evento histórico ya no es recuperable: `REVIEW_REQUIRED` sin beneficios.

**Prevención de coste/tiempo:** no desarrollar otra batería de ensayos con el mismo buyer Sandbox; usar datos sintéticos para idempotencia y adversarial; abrir gates de origen y retención antes de crear tablas o ejecutar PayPal POST.

## 5. Estado de permisos

GO recibido para **diseñar/codificar pruebas offline de retención y fuente**; NO una aprobación automática de años de conservación para todo el dinero, grabación real de aceptación, capturas de webhook bruto, nueva migración aplicada, cambio de RPC publicado, PayPal live, buyer, ledger ni entitlements.

**Siguiente decisión PO:** aprobar propuesta de política de datos por clases tras revisión jurídica/contable de aplicabilidad y plazos, especialmente contabilidad/hold; una vez cerrada, crear migración versionada **solo como DRAFT** y someterla a pruebas PostgreSQL disposable, pedir GO hosted para aplicar. No declarar P05 DONE antes de verifica­r buyer prospectivo real y Scope Closure Reconciliation.
