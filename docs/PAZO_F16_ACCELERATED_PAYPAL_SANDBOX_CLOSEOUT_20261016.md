# PAZO F16 — cierre acelerado de PayPal Sandbox (2026-10-16)

**Nueva autorización del PO:** «sí» a concentrar cambios de código y migraciones **revisadas** de Sandbox, con PayPal Live, cobros reales y beneficios financieros deshabilitados hasta su aprobación final. Esto prioriza resultado de compra Sandbox y contabilidad segura; **no es GO de cobro Live ni permiso para conceder beneficios sin prueba merchant**.

## Auditoría de lo que EXISTE (no repetir P43/P42)

- Supabase proyecto alojado PAZO `mrybvqdebbgcayuvgkkr`, región US-East; la UI identifica ese proyecto como **PRODUCTION**, aunque el proveedor PayPal configurado en F16 es **Sandbox**. No es una base aislada para QA. Cualquier SQL alojado exige control de impacto y revisión; ninguna nueva migración se aplicó en este checkpoint.
- Edge Functions observadas: `f16-paypal-webhook` v14 ACTIVE (intake PayPal Sandbox verificado); `f16-paypal-supporter-account` v5 ACTIVE (estado/cancelación, no compra nueva); checkout consumidor `f16-paypal-supporter` es solo código de GitHub y no se liberó ni desplegó con nueva capacidad.
- SQL de metadatos alojado **read-only**: tablas privadas `paypal_p06_offers`, `paypal_p06_checkout_attempts`, P06 RPC `f16_p06_read_published_offer`, `f16_p06_begin_checkout`, P07 RPC `f16_p07_claim_provider_create` ya presentes por migraciones anteriores. No reinstalarlas; el SQL `supabase/drafts/f16_p06_durable_checkout_consent_DO_NOT_APPLY.sql` es laboratorio con `f14_synthetic` y no es aplicable directamente a hosted.
- Snapshot a fecha de revisión: ofertas **0**, ofertas publicadas **0**, intentos P06 **0**, intents `pending=0`, `bound=1` (binding antiguo de QA, NO un pago probado), ledger **0**, reversals **0**, P40 bindings **0**, P42 keys **0**, writer P42 OFF y worker P21 OFF. No datos personales extraídos ni IDs de usuarios.
- El código `f16-paypal-supporter/index.ts` tenía `RELEASE_APPROVED=false`; el borrador de términos ES/EN P13 contiene placeholders y declara su revisión jurídica/PO pendiente. Está PROHIBIDO publicar esa copia como oferta definitiva.
- P05/P27 merchant GET y worker de revisión solo disponen de evidencia offline, sin ensayo real correlacionado; P39/P42 atribución originada en webhook sigue pendiente. No reconocer un período pagado por un `ACTIVATED`, `SALE.COMPLETED` aislado o por retorno del navegador.

## Trabajo técnico ejecutado en PR #44 DRAFT, SIN nuevos cobros

1. `supabase/functions/f16-paypal-supporter/p06SandboxQaGate.mjs`: guardia server-only con **default denied** que requiere `PAZO_F16_PAYPAL_ENV=sandbox`, `PAZO_F16_P06_QA_ENABLE=true` y exactamente **un** usuario de prueba validado en Supabase Auth, con UID `PAZO_F16_P06_QA_OWNER_ID` fijado por operador privado. Nunca usa UID/permiso afirmado por navegador.
2. El Edge entrypoint `f16-paypal-supporter/index.ts` conserva respuesta `503` mientras flag QA esté ausente, comprueba luego la cuenta autenticada y deniega a cualquier otro UID. No habilita Live, pagos, ledger ni beneficios. Se desplegará solo bajo su futuro gate de QA configurado con dueño descartable y oferta publicada revisada.
3. `src/features/supporter/components/SandboxCheckoutQaPanel.tsx`: flujo consumidor **oculto por defecto** (flag frontend `VITE_PAZO_F16_SANDBOX_QA_UI`), lee la oferta ES/EN real publicada por backend, exige aceptación inicialmente desmarcada, crea request UUID una sola vez, prohíbe reintentar tras respuesta ambigua y únicamente redirige a origen PayPal **Sandbox** verificado. Nunca representa un regreso PayPal como pago acreditado.
4. `SupporterAccountManagement.tsx`: integra el panel solo bajo flag QA de build. El botón regular y la pantalla principal siguen sin presentar un checkout público.
5. `src/features/supporter/testing/f16P06SandboxQaGate.test.mjs`: pruebas de falta de configuración, Live, UID no autorizado, error de entorno y único usuario Auth autorizado.

**Evidencia de código:** commit técnico `90a6967acb8564e546dfe176d54e0f028af2a1e8`. GitHub Actions: CI [#38940669667](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38940669667) **SUCCESS** y PostgreSQL desechable [#38940669834](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38940669834) **SUCCESS**. CI/lab no equivalen a aprobación de compra o despliegue.

## Camino de cierre, máximo tres bloques

**Bloque A: una compra de prueba Sandbox.** El PO designa **una cuenta de prueba propia o descartable** (no usar la suscripción antigua desconocida); el operador resuelve el UID **privadamente**, sin contraseña en chat. Preparar y aprobar texto ES/EN exacto sin placeholders, con cancelación y evidencia descargable; publicar únicamente la versión validada (los términos una vez publicados son inmutables). Comprobar seguridad de RPC/roles y origin, configurar allowlist server y flag frontend de entorno QA. Desplegar únicamente el endpoint consumidor **Sandbox** cuando todos los guards estén completos. Realizar **una** compra PayPal Sandbox con el usuario autorizado; verificar vínculo Auth/intent/PayPal y cancelación. Ninguna acreditación por checkout.

**Bloque B: verificación financiera real Sandbox.** Implementar y probar la ruta server-only desde webhook firmado → inbox idempotente → owner/intención BOUND → PayPal merchant GET de venta/transacción/suscripción → prueba del ciclo contractual y refund/dispute coverage → ledger con at-most-once, corrección por reversos → estado pagado y beneficios. Reutilizar P21/P22/P27/P29-P37; excluir P28 histórico y pruebas de contraseñas. No suprimir el trust boundary de P42 sin arquitectura sustitutiva **equivalente y auditada**. Si no existe prueba suficiente, retornar revisión/bloqueo y no activar beneficios.

**Bloque C: activación pública en otra autorización.** Cerrar copia legal/California ES/EN, política de renovación y recibos/cancelación, privacidad y retención; pruebas de pago/reembolso/cancelación/regresión, comprobar configuración PayPal Live (merchant, plan, webhook y secreto diferentes de Sandbox) y finalmente solicitar GO final del PO para cobros Live. Mantener PR Draft hasta DoD y reconciliación del scope.

### Bloqueos actualmente imprescindibles para A

- No hay oferta publicada. No se debe publicar el borrador P13 con placeholders ni prometer recompensas incompletas.
- Falta designar UNA cuenta Auth QA. Nunca inventar o reutilizar la antigua `bound=1` atribuida a un usuario provisional.
- No consta configuración de los flags QA en Supabase ni Vercel; no activar fuera de esta prueba ni desplegar por anticipado un endpoint consumidor.
- Aun un Sandbox Checkout exitoso NO implica ledger ni beneficios hasta terminar B.
- **No se requiere resetear DB password, ni ejecutar P43, ni generar P42 al concluir A.** La gestión de claves solo se vuelve a examinar si B demuestra necesidad real después de elegir el trust boundary.

**Resultado:** `F16_ACCELERATED_SANDBOX_QA_CHECKOUT_CODE_READY_HIDDEN_BY_DEFAULT_NO_HOSTED_MUTATION`.
