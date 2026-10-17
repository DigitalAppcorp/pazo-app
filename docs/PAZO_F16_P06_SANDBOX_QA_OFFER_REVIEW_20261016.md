# F16-P06 — oferta de prueba Sandbox ES/EN para aprobación (2026-10-16)

**Solo Sandbox / cero dinero real.** Este documento no publica un producto ni concede beneficios; PR #44 sigue Draft. La prueba comercial pública PayPal Live sigue NO-GO.

## Cuenta Auth existente designada para QA

El Product Owner eligió una cuenta actual de PAZO y confirmó que puede iniciar sesión. Supabase verificó mediante consulta alojada **solo lectura**: 1 cuenta Auth con correo confirmado, **0** intents de PayPal asociados (pending 0, bound 0), **0** intentos P06 y **0** pagos registrados para la cuenta. No se publica correo ni UID en este archivo. La base en general conserva 1 `bound` histórico que pertenece a otro usuario; no alterar.

La cuenta debe autenticarse mediante `supabase.auth.getUser` en el servidor; el email proporcionado no es credencial ni autoriza por sí solo compras. El UUID exacto debe añadirse como allowlist privado del servidor, nunca a repositorio, logs o variables públicas.

## Copia QA bilingüe exacta

Revisión propuesta en `src/features/supporter/sandboxQaOfferCopyP06.mjs`:

- ID de versión: `pazo-supporter-sandbox.qa20261016-v1`.
- Precio **solo de simulación**: USD 2.99 por mes en Sandbox; renovación automática mensual, sin trial, plan anual ni setup fee.
- Explica sin ambigüedad que PAZO principal es gratuito y que no existe cargo Live ni acreditación automática de insignias, períodos o beneficios por el redirect de PayPal.
- Explica dónde se encuentra `Cancelar renovación` en PAZO, cómo se valida su resultado ante PayPal y soporte ante fallo; no presenta cancelación como confirmada si el proveedor no respondió.
- Incluye aceptación expresa sin casilla premarcada, evidencia durable de versión/hash y un nuevo contrato separado si algún día existe cobro Live.
- Idiomas ES/EN: obligatoriamente publicables en pareja, texto ya listo para revisión editorial. La política de retención de datos financieros, notificaciones y cumplimiento de CA antes de **Live** siguen como gate distinto.

**Estado inmutable del borrador:** `QA_COPY_REVIEW_ONLY_NOT_PUBLISHED`, `mayPublish=false`, `mayEnableLive=false`, `mayGrantBenefits=false`. Sin INSERT en `paypal_p06_offers` y sin cambiar flags en Supabase/Vercel en este gate.

## Verificaciones de seguridad y lo que sigue

- Nueva prueba `f16P06SandboxQaOfferCopy.test.mjs` comprueba esquema/versiones, ES y EN, referencias Sandbox, precio USD2.99, ausencia de placeholders y negación de Live.
- La casilla de `SandboxCheckoutQaPanel.tsx` ahora menciona **sin dinero real** y que el importe es simulado, para no confundir al usuario de prueba.
- Según la Fiscalía General de California, una oferta **real** de renovación automática exige aceptación expresa, cancelación online fácil, recordatorios anuales y avisos aplicables (https://oag.ca.gov/node/608083). PayPal Sandbox exige credenciales separadas de comprador del entorno de pruebas (https://developer.paypal.com/platforms/subscriptions/test-subscriptions/). No usar el login PAZO como login PayPal del comprador.
- **Siguiente GO mínimo:** el PO aprueba el texto exacto ES/EN (o pide cambios). Después se puede preparar el INSERT de oferta sandbox versión única revisado, los flags privados de un único Auth UID, comprobar el origen frontend, el despliegue limitado y una sola compra Sandbox bajo controles. Nunca reusar el `bound` histórico o realizar un POST PayPal por solo aprobar el copy.
- Hasta entonces `offers=0`, `published=0`, `checkout=OFF`, `worker=OFF`, `ledger=0`; no dinero Live ni beneficios.

**Marcador:** `F16_P06_SANDBOX_QA_OFFER_BILINGUAL_DRAFT_READY_FOR_PO_COPY_APPROVAL`.


## Actualización PO — oferta QA aprobada y SQL de publicación preparada (2026-10-16)

- **PO «sí»: aprobado el texto exacto ES/EN y autorizado PREPARAR la publicación** para la cuenta QA existente, **sin** PayPal Live, dinero real o beneficios. No interpretar «preparar» como autorización de aplicar el SQL, habilitar/redistribuir un Edge endpoint, cambiar Secrets, comprar Sandbox o publicar una oferta Live.
- **Archivo staging:** `supabase/drafts/f16_p06_sandbox_qa_approved_offer_REQUIRES_NEW_PUBLISH_GO.sql`. Un solo `INSERT` atómico con filas `es` y `en` de versión `pazo-supporter-sandbox.qa20261016-v1`; exact_copy byte-por-byte idéntico al texto PO aprobado de `src/features/supporter/sandboxQaOfferCopyP06.mjs`. Precio 299 USD cents, periodicidad `MONTH_1`, plan de PayPal Sandbox ya identificado. Utiliza tablas/RPC P06 **existentes**, sin DDL.
- **Guardias:** requiere señal contextual explícita `pazo.f16_p06_qa_publish_go` de un operador administrativo en la misma sesión (disuasión de ejecución accidental, **no es protección de autorización basada en criptografía**). Rechaza ofertas o intentos anteriores, esquema faltante y RPC pública insegura; verifica 2 traducciones publicadas y hashes SHA256 distintos; bloquea re-ejecución. Las ofertas, una vez publicadas, son **inmutables**. Esto NO restringe la tabla a una cuenta; **la exclusividad la impone el guard privado del endpoint** mediante Auth verificado y `PAZO_F16_P06_QA_OWNER_ID`/flag QA del servidor.
- **Pruebas:** `src/features/supporter/testing/f16P06StagedOfferSqlReview.test.mjs` compara copia exacta de ambos idiomas y contrato de mutación; CI prueba sin bandera=denegado, con bandera=2 filas sintéticas atómicas, repetición=denegada y checksums en PG17 descartable. Primer ensayo falló por aserción excesivamente estricta del test sobre `OR EXISTS`, corregido sin cambiar datos hosted.
- **Commit de código `edf19f9f291e8d3edd008d782039e60dd018073a`:** [CI #38944314813](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38944314813) **SUCCESS** y [F16 Disposable PostgreSQL Lab #38944315000](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38944315000) **SUCCESS**.
- **Postflight hosted READ ONLY:** `offers_total=0`, `offers_published=0`, `checkout_attempts=0`, `provider_create_claims=0`, `recorded_payments=0`, `p42_keys=0`, writer P42 OFF, worker P21 OFF. El SQL de oferta **NO fue ejecutado en Supabase alojado**. No Edge deployment, no Secrets ni Vercel changed. El PR continúa Draft.
- **Próximo GO operativo necesario:** confirmar que el único UID de prueba está configurado **privadamente** en el Edge endpoint (nunca publicarlo en GitHub ni en la UI), que el endpoint está desplegado o listo para desplegar **exclusivamente en Sandbox**, y que el panel QA permanece oculto por defecto. **Solo después** y con autorización inequívoca para publicar, aplicar ese SQL a Supabase alojado y verificar 2 filas exactas por metadatos, aún sin compra. La compra de prueba será otro acto explícito del PO (una sola ejecución PayPal Sandbox) y todavía no acredita beneficios.
- **Marcador:** `F16_P06_QA_APPROVED_COPY_STAGED_SQL_PG17_PASS_HOSTED_UNCHANGED_PUBLICATION_NEEDS_GO`. Live NO-GO / pagos reales OFF.
