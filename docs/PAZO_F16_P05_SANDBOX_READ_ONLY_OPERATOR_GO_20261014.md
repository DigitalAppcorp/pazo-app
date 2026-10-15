# PAZO F16-P05 — Diagnóstico merchant Sandbox de solo lectura: alcance y GO

**Fecha:** 2026-10-14. **Estado:** GO del Product Owner para solo lectura merchant PayPal Sandbox de UNA suscripción existente **APROBADO Y EJECUTADO POR EL OPERADOR EN WINDOWS**, con JSON resumido devuelto al chat. Verificada la coherencia de plan y suscripción, **NO** el ciclo efectivamente pagado ni el historial financiero. El asistente no tuvo acceso a credenciales ni consultó PayPal directamente: esta evidencia procede de la **salida sanitizada que compartió el operador**. NO hubo GO de nuevas compras, migraciones, worker ni activación de beneficios; P05 comercial sigue pendiente. F16 EN CURSO, PR #44 DRAFT, beta NO-GO.

## Gate material que cierra esta propuesta

Los ensayos P05 existentes verificaron integridad de datos sintéticos, pero no demuestran que el PayPal merchant **de esta aplicación** devuelva realmente los campos requeridos. Se terminó el punto de ejecución opcional `scripts/f16-paypal-p05-readonly.mjs` para el lector privado `p05PaypalSandboxBillingSnapshotReader.mjs`. Éste es un instrumento operativo de diagnóstico, **NO** un checkout, un worker o una migración.

### Alcance técnico exacto autorizado por el PO

- **Proveedor y entorno:** `api-m.sandbox.paypal.com` del comercio Sandbox existente, nunca Live.
- **Credenciales:** solo variables **locales** del operador, `PAYPAL_SANDBOX_CLIENT_ID` y `PAYPAL_SANDBOX_CLIENT_SECRET`; no copiarlas al chat, Git, logs, screenshots o Supabase. No lectura de secretos almacenados en Supabase.
- **Identificador de prueba:** `PAZO_P05_SANDBOX_SUBSCRIPTION_ID` de una suscripción Sandbox que pertenece al comercio PayPal. Puede ser **la anterior no vinculada a PAZO Auth** para inspeccionar los metadatos técnicos, pero nunca sirve para acreditar beneficios o vincular a usuarios retrospectivamente.
- **Solicitudes permitidas:** únicamente `POST /v1/oauth2/token` (necesaria para token de acceso, no crea pagos), `GET /v1/billing/subscriptions/{id}`, `GET /v1/billing/plans/{id}`. Sin POST/PATCH/DELETE de otros recursos.
- **Datos que devuelve a consola:** solo booleanos/estados mínimos: lectura merchant correcta, plan mensual USD 2.99 coincidente, indicador de override, cantidad, cancelación, presencia de saldo, contaje de fallos, presencia de próximo cobro y retry. **Nunca** imprime token, secreto, buyer, correo, cuerpo HTTP, identificador de suscripción, ID de venta, ni timestamps de pago.
- **Prohibiciones durante el gate:** nuevo registro Auth, nueva compra Sandbox, asignar periodos, suspender/cancelar suscripción, cambiar planes o webhooks, escribir Supabase, activar Edge/worker/cron, Live, entitlement, badges, publicar beta, merge o Vercel.
- **Salida protegida:** `billingPeriodProven:false`, `cycleAttributionProven:false`, `financialHistoryComplete:false`, `mayGrantEntitlement:false`, `paidThrough:null`; fallos genéricos, sin cuerpos del proveedor.
- **Guard del comando:** si faltan credenciales o ID válidos no realiza ninguna llamada. No se ha ejecutado el comando con credenciales reales al redactar este documento.

**Contrato de comando local**, autorizado ya el GO de lectura, únicamente cuando las variables estén configuradas de forma privada por el operador:

```powershell
node scripts/f16-paypal-p05-readonly.mjs
```

No se debe pegar en el chat la configuración de las variables. El operador puede compartir únicamente la salida JSON sanitizada.

**Salida / código de diagnóstico:** salir con código `0` ahora requiere plan mensual USD 2.99 **y además** `plan_overridden:false` y `quantity:'1'` explícitos; de faltar estos últimos se retorna `1` sin conceder nada. El resultado incluye `effectiveTermsConsistent`. Fallo de red/acceso/suscripción o configuración produce `2`. **No** equiparar ninguno de estos códigos a aprobación de un periodo `paid_through` (siempre `null`).

## Evidencia E2E READ ONLY obtenida del operador (2026-10-14)

El Product Owner ejecutó desde `C:\\Users\\osori\\PAZO-F13-preview` el comando `node scripts/f16-paypal-p05-readonly.mjs` con variables merchant Sandbox y un ID de **suscripción existente**, tras corregir el uso de `Read-Host`. Compartió una salida JSON sanitizada con los siguientes resultados:

| Atributo del diagnóstico | Valor |
|---|---|
| `environment` / `diagnostic` | `sandbox` / `p05_read_only` |
| `merchantReadSucceeded` | `true` |
| `currentPlanMatches299Monthly` | `true` |
| `subscriptionPlanOverride` | `false` |
| `subscriptionQuantityOne` | `true` |
| `effectiveTermsConsistent` | `true` |
| `subscriptionCurrentlyCancelled` | `true` |
| `observedFailedPaymentCount` | `0` |
| `balanceKnown` | `false` |
| `nextBillingPresent` | `false` |
| `lastFailedPaymentPresent` | `false` |
| `retryScheduled` | `false` |
| `billingPeriodProven` / `cycleAttributionProven` | `false` / `false` |
| `financialHistoryComplete` / `mayGrantEntitlement` | `false` / `false` |
| `paidThrough` | `null` |

**Interpretación estricta:** la cuenta merchant autorizada pudo leer por API el plan y la suscripción individual de prueba, que no tenía override y tenía cantidad 1; la suscripción ya estaba CANCELLED. `observedFailedPaymentCount=0` es un snapshot, no demuestra ausencia histórica de fallos. `balanceKnown=false` significa **sin dato de saldo**, no saldo igual a cero. `nextBillingPresent=false` es congruente con cancelación, **no prueba** `paidThrough` ni cuándo comenzó/terminó el servicio; ausencia de `lastFailedPayment` y de retry tampoco demuestra que jamás existieran. No usar el pago Sandbox previo como si estuviese enlazado a una cuenta de PAZO Auth: **nunca estuvo BOUND**. No conservar ni publicar identificador de suscripción, datos de comprador o credenciales en los documentos.

Este resultado da **PASS limitado al gate de lectura del plan/contrato vigente de la suscripción**. **NO es E2E de compra Auth BOUND ni autorización de `cycle_key`, `paid_through`, meses conmemorativos o estados de membresía.**

**Auditoría Supabase alojado adicional de solo lectura (mismo día):** 4 webhooks firmados, los 4 `pending`, 0 intents, 0 ledger, 0 reversals, 0 consents. Sin SQL/Edge/worker nuevos.

**Próximo gate, requiere GO distinto:** prueba controlada de una **nueva** suscripción Sandbox vinculada a Auth PAZO, con merchant intent BOUND y seguimiento preciso del período de facturación; eso podría involucrar un cobro simulado Sandbox y una escritura alojada, **no incluidos** en el GO de lectura anterior. La política P05 de ciclo histórico para pagos atrasados, ancla 28/29/30/31 y retención financiera también espera decisiones PO. **No repetir** el GET read-only ya satisfactorio ni crear suscripciones sin un permiso concreto.

## Estado de las decisiones

**P06-A–E aprobada comercialmente**: cancelar renovaciones no anula periodo pagado; fallido/pendiente no acredita; parcial exige revisión sin prorratear; total afecta solo ciclo original; disputa bloquea nueva acreditación.

**P05 todavía NO aprobada**: no existe `cycle_key` merchant certificado ni regla final de calendario mensual. Propuesta de política para decisión PO, **sin autorizar ejecución**:

1. Cada pago sólo podrá imputarse a un `cycle_key` privado por suscripción si su origen y período contractual están demostrados independientemente.
2. Pago tardío o saldo recuperado: imputar al ciclo **histórico** que originó la deuda cuando sea verificable; **no añadir un mes nuevo** por el hecho de cobrar después.
3. Un pago que cubra más de un ciclo, transacción fuera de orden, renovación duplicada, factura/periodo no correlacionable o parcial histórico: revisión manual; **no conceder ni restituir beneficios automáticamente**.
4. Calendario mensual: calcular de acuerdo con el ancla y reglas **contractuales corroboradas** de PayPal (incluidos 28/29/30/31 días), nunca `completedAt + 30 días`. Fechas y zonas horarias a precisar en contrato.
5. **No contar insignias 3/6/12** hasta tener lista deduplicada de ciclos realmente pagados y sin reversión, con decisión separada sobre consecutividad.

Las cinco reglas anteriores son **propuesta técnica**, NO aceptación del Product Owner ni evidencia de fecha de cobertura. La primera lectura Sandbox solo valida si los campos existen; no puede resolver por sí sola P05. Un segundo experimento de suscripción nueva vinculada a Auth PAZO requerirá otro GO específico y procedimiento seguro.

## Evidencia de validación

El diagnóstico tiene pruebas offline `src/features/supporter/testing/f16P05ReadOnlyDiagnostic.test.mjs` para: credenciales/ID obligatorios, sin peticiones si faltan, salida sanitizada, fallo sin detalles sensibles, cambios de plan, deuda y prohibición universal de entitlement. Las pruebas usan `readerFactory` simulado; deben confirmarse por CI sobre HEAD exacto después de cada cambio.

**GO Y EJECUCIÓN DE LECTURA RESUELTOS (solo plan + suscripción):** el PO dio autorización expresa para la lectura merchant Sandbox de un único recurso de suscripción existente y su plan mediante OAuth y los dos GET declarados, sin otros cambios. No repetir la solicitud de GO para exactamente este alcance. El operador **ya lo ejecutó** en su Windows y compartió únicamente la salida JSON segura, registrada arriba. La suscripción se puede localizar en la sesión business Sandbox en https://www.sandbox.paypal.com/billing/subscriptions, según guía oficial PayPal, sin crear otra. Al obtener JSON sanitizado, analizarlo antes de decidir un siguiente gate. Si faltan credenciales, solicitar configuración PRIVADA, jamás pegarlas en el chat.

**Restantes:** retención financiera P01–P04/P09 y privacidad de baja, pagos auténticos Auth BOUND, backend protegido con lease y P05 contractual, antes de activar F16 en producción.
