# PAZO — Plan técnico y estado alojado: muro Amigo de PAZO

**Estado:** BASE DE CONSENTIMIENTOS PRIVADOS APLICADA POR AUTORIZACIÓN PO (2026-10-13), versión Supabase `20261013215221`. Pago, vista pública de mascotas y consentimiento positivo siguen BLOQUEADOS.  
**Fecha:** 2026-10-13.  
**Repositorio:** `DigitalAppcorp/pazo-app`, rama `f13/section-titles-20261012`, PR #44 DRAFT.  
**Proyecto Supabase:** `mrybvqdebbgcayuvgkkr`.  
**Base de requisitos aprobada:** [política de consentimiento](PAZO_SUPPORTER_WALL_CONSENT_POLICY_PROPOSAL_20261013.md).  
**Límites:** solo se aplicó la migración privada descrita; no activar proveedor, no añadir nuevos cambios alojados sin gate nuevo, no fusionar PR ni desplegar.

## 1. Preflight alojado READ ONLY (2026-10-13)

Herramientas empleadas: Supabase `list_tables` (public, verbose), `list_migrations`, y dos consultas `SELECT` de catálogos Postgres `pg_policies`/`pg_proc`; ninguna sentencia DML/DDL, ningún acceso a cuentas o registros individuales.

**Evidencia factual del schema alojado:**
- `public.pets` tiene `id uuid`, `owner_id uuid` (FK a `auth.users`), `name text`, `photo_url text`, y **RLS habilitado**. Ya existen políticas de lectura `pets_public_read` para anon y authenticated, más `f14_moderated_pets_select` en el catálogo. Debe revisarse el efecto combinado de las políticas permisivas, especialmente moderación; no asumir que una política excluye a otra.
- `public.profiles` tiene `id uuid`, `is_founder boolean`, y **`paypal_subscription_id text` legado, nullable**, con RLS habilitado. También existe política de lectura `profiles_public_read` (anon/authenticated). **ATENCIÓN:** nunca usar el identificador legado, `is_founder` ni `username` como prueba de pago, consentimiento, o identidad visible del muro. Verificar por separado la proyección y los grants actuales del perfil público: la política amplia merece auditoría de exposición sin introducir un cambio incidental en la rama de F16.
- No se encontró una tabla pública específica de `supporter_entitlements`, `supporter_wall_consents` ni membresía pagada verificada; tampoco RPC pública con nombre `%support%`, `%paypal%` o `%subscription%`. La inspección **no demuestra la ausencia de objetos en otros esquemas/Edge Functions**: ampliar el preflight antes del diseño final de SQL.
- El esquema `private` y funciones privadas ya existen. La separación de dominio nuevo debe seguir `src/features/supporter/`, el contrato `docs/PAZO_ARCHITECTURE_CONTRACT.md`, y el procedimiento de baja supervisada `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`.
- Ya hay migraciones alojadas F14 y de notificación de comunidades, incluida `community_join_owner_notifications` (20261013025451). **Hacer diff con migraciones versionadas del repositorio** antes de crear una nueva, nunca asumir migraciones solo por nombre.
- Los resultados previos de filas en tablas son información incidental de un resumen de schema, **no se consultaron ni recopilaron identidades**.

## 2. Modelo mínimo a preparar, NO ejecutar todavía

**Área privada de consentimiento por mascota**
- Preferir tabla en `private` con FK `pet_id` única a `public.pets`, referencia del dueño solo si requiere auditar ownership de forma segura, `consent_notice_version`, fecha de autorización, fecha de revocación, y marca de confirmación posterior a reactivación. Diseño temporal exacto y política de retención sujetos a revisión.
- **No crear consentimientos por defecto.** Titularidad de la mascota se valida server-side contra `pets.owner_id=auth.uid()` en cada autorización/revocación; si cambió titularidad, el consentimiento anterior debe quedar no elegible aunque siga existiendo un registro.
- El histórico de opt-in (si se mantiene) es **privado**; no usar un `public SELECT` directo al consentimiento. Restricción de unicidad por mascota, cambios idempotentes, manejo de carreras y evento seguro de retirada. Si mascota/cuenta se elimina, excluirla por estado verificable antes de finalizar baja supervisada.

**Área privada de cobertura/entitlement**
- Representar períodos de cobertura verificada por cuenta mediante autoridad del servidor/proveedor (identificador interno de proveedor, vigencia con tiempo `timestamptz`, estado, revisión de eventos, idempotencia y registro mínimo de correlación). Modelo final depende del procesador realmente elegido. No guardar datos de tarjeta ni credenciales PayPal.
- Las notificaciones/cancelaciones/reembolsos deben conciliarse de manera idempotente y con verificación de autenticidad; no derivar privilegios de un estado frontend, campo `profiles.paypal_subscription_id` o `is_founder`.
- **No crear un beneficio ficticio para QA:** las pruebas usan datos de test controlados/aislados sin tocar identidades existentes; no activar pagos o estados persistentes sin otro gate PO.

**Interfaz pública mínima**
- Lectura `anon` y `authenticated` a través de función/API de dominio que devuelva **exclusivamente** `pet_id`, `pet_name`, `pet_photo_url` y tipo de insignia confirmado (sin valores de facturación). Comprobar en cada página: `owner` vigente + consentimiento expreso sin revocar + cobertura efectiva + moderación/visibilidad. Fallo de validación = no publicar.
- NUNCA exponer vistas/tablas privadas ni permitir a `anon` consultar historial de pagos/consentimiento. Revisar grants y `EXECUTE` de wrappers; minimizar privilegios y usar `search_path` seguro en funciones privilegiadas. Documentar límite de paginación y mitigaciones de abuso/caché.
- **Exclusión y revocación:** confirmar retirada únicamente cuando la transacción se confirme. Cachés de páginas públicas propias deben respetar la baja; evitar caché persistente de lista sin revalidación. La consulta también debe excluir fechas vencidas aunque falte procesar un evento externo.
- **Más tiempo apoyando:** solo después de verificar cálculo acumulado de meses pagados (con reembolsos/contracargos); hasta entonces la tab puede informar de su estado, sin orden ficticio.

## 3. Plan de cambios condicionado a autorización

| Gate | Entregable | Bloqueo |
|---|---|---|
| A. Contrato y privacidad | esquema versionado propuesto; matrices owner/anon/authenticated/service; inventario de datos y retención | Revisión arquitectura, consentimiento público, RLS existente |
| B. Consentimientos privados | migración revisada, ownership/opt-in/opt-out, fallo cerrado, tests de acceso ajeno y revocación | **Autorización explícita PO para aplicar** |
| C. Cobertura pagada | contrato de entitlements, eventos idempotentes del proveedor y seguridad de webhook | **Decisión/proveedor/precio y autorización específica de pagos** |
| D. Muro verificado | consulta pública minimizada y paginación; errores diferenciados de muro vacío; controles de caché | A, B y C reales, pruebas de privacidad |
| E. UI real | sustituir solo simulación de participación por estados del servidor; preservar A01 aceptado, cuadrícula y ES/EN | D, nueva validación PO y pruebas móviles |
| F. Baja/migraciones | actualizar preflight y SOP manual, retención, inventario, SQL tests/rollback; verificar extremo a extremo | Procedimiento F14 aprobado; no borrados ad hoc |

**Secuencia eficiente:** evitar construir un muro que muestra supuesto apoyo hasta que haya estado server-side verificable; pueden diseñarse/validarse contratos y QA offline antes de cualquier migración. El PO primero autorizó preparar el borrador sin aplicar, y después **autorizó expresamente el gate de la migración privada**. Se aplicó la versión `20261013215221` con verificación alojada de privacidad PASADA. Un gate separado es obligatorio para cualquier cambio posterior, especialmente habilitar permisos positivos o pagos.

### Migración de base privada aplicada alojada (F16 todavía no activo)

- [`supabase/migrations/20261013215221_f16_supporter_wall_consents_foundation.sql`](../supabase/migrations/20261013215221_f16_supporter_wall_consents_foundation.sql): tabla privada de consentimientos, roles/RLS sin grants directos, RPC propias autenticadas, sin lista pública. Función interna de entitlement **retorna FALSE intencionadamente** hasta gate de pagos, impidiendo aprobar consentimientos reales anticipados.
- [`supabase/tests/supporter/consent-metadata.sql`](../supabase/tests/supporter/consent-metadata.sql): aserciones del catálogo (RLS/ACL/search_path/ownership de funciones).
- [`supabase/tests/supporter/consent-synthetic.sql`](../supabase/tests/supporter/consent-synthetic.sql): actores/pets ficticios, cambio temporal de gate solo dentro de transacción `BEGIN..ROLLBACK`, autorización/revocación, propiedad, transferencia, versiones inválidas y vencimiento. Guardias de `f14_synthetic`/PG17.
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): job existente `f14-postgres` prueba el **borrador** contra DB efímera tras operaciones F14; run `38473628996` (verify + PostgreSQL SUCCESS). **Además se auditó el esquema alojado después de aplicarlo**: RLS forzada, 0 consentimientos, roles y funciones correctos. Esto NO es verificación de cobertura PayPal.
- Criterio posterior: auditar RLS combinadas `pets_public_read`/`f14_moderated_pets_select`, exposición `profiles.paypal_subscription_id`, efectos de deletion SOP, retención/consentimiento, textos legales y flujo con proveedor real. **La base de consentimientos es insuficiente para publicar mascotas aunque sus pruebas pasen.**

### F16 GATE siguiente: textos finales ES/EN y entitlement (propuesta, NO implementada)

La revisión PO del copy contextual por mascota y el contrato de pagos está en [`docs/PAZO_F16_CONSENT_COPY_BILLING_VERIFICATION_GATE_20261013.md`](PAZO_F16_CONSENT_COPY_BILLING_VERIFICATION_GATE_20261013.md). PayPal **no** está aprobado como procesador definitivo; comprobar tarifas y elegibilidad antes de cualquier configuración. No hay nuevas migraciones, servidores, eventos ni permisos desplegados. El helper `supporter_private.wall_has_verified_entitlement()` conserva su retorno false.

## 4. Pruebas obligatorias para el futuro gate de implementación

- Sin membresía, sin permiso, permiso revocado, entitlement vencido/reembolsado o mascota moderada → 0 filas públicas.
- Titular A no puede seleccionar/revocar mascota del titular B. Ninguna persona anónima puede leer tabla de consentimientos ni estado de pago.
- Revocación durante paginación/caché y acceso desde otra sesión → no reexponer.
- Renovación cancelada con cobertura aún válida; expiración al vencimiento; pago fallido; webhook duplicado/fuera de orden; reactivación requiere opt-in fresco.
- Cambio de titularidad o baja de mascota/cuenta; respetar documentos privados, contenido de terceros y SOP de baja.
- ES/EN, teclado, viewport bajo, link público A01, botonera de bienvenida sin regresión; avatar/insignia únicamente para mascotas permitidas.
- Pruebas locales sin insertar datos en Supabase alojado; auditoría de scripts y diff antes de pedir autorización para aplicar.

## 5. Pendientes sin inventar decisiones

1. Ubicación de **lectura del muro para usuarios ya autenticados** (la A01 está aprobada; no volver a Explorar por defecto).
2. Texto legal final y **retención** mínima del consentimiento/retiro según política y proveedor.
3. Modelo exacto de pagos, proveedor, condición de gracia, refund y cálculo meses acumulados.
4. Permisos/grants/funciones del schema `private` actual y revisión del perfil público legado `profiles.paypal_subscription_id` — *auditar antes de dar privilegios o crear wrappers*.
5. Fijar gate de autorización para crear/aplicar migración; no confundir la aprobación de **reglas del producto** con aprobación de **cambios técnicos**.

**Actualización posterior:** se aplicó únicamente la migración privada F16 versión `20261013215221` con el consentimiento positivo bloqueado y sin alterar otros esquemas existentes. No se activaron cobros ni vista pública ni publicación de mascotas. Para nuevas fases del muro y pagos se requiere autorización separada.


## 6. Auditoría incremental de seguridad y privacidad — 2026-10-13 (SOLO LECTURA)

**Alcance y evidencia:** consultas SELECT a `pg_class`, `pg_policies` y `has_column_privilege` sobre el proyecto alojado `mrybvqdebbgcayuvgkkr`. No se leyeron filas de usuarios, no se ejecutó SQL de escritura, no se modificaron RLS ni funciones. CI del commit documental anterior `4284e9b`: SUCCESS, run `38478928123`. La aprobación visual del consentimiento individual por mascota fue confirmada por el PO; no repetirla.

| Objeto | Estado confirmado | Consecuencia para F16 |
| --- | --- | --- |
| `supporter_private.wall_consents` | RLS ON y FORCE RLS ON | Protección estructural verificada; no implica entitlement ni muro real |
| `public.pets` | RLS ON; `pets_public_read` PERMISSIVE `true` (anon/authenticated) y `f14_moderated_pets_select` RESTRICTIVE con `f14_content_visible('pet_profile',id)` | La política restrictiva se combina con la permisiva en SELECT; conservar moderación y verificar que proyección pública futura no evada esta condición |
| `public.profiles` | RLS ON; `profiles_public_read` PERMISSIVE `true` (anon/authenticated) | La fila es públicamente legible para columnas concedidas; NO usar `profiles` como roster ni entitlement |
| `public.profiles.paypal_subscription_id` | `has_column_privilege(...,'SELECT')` = false para anon y authenticated | Riesgo de exposición directa de esa columna **no confirmado**; los grants de columna la protegen en los roles verificados. No inferir protección de otros roles, RPC, vistas o endpoints sin auditar |
| `public.profiles.id`, `is_founder`, `username` | SELECT = true para anon y authenticated | Son datos legibles públicamente bajo las reglas actuales; el muro F16 futuro debe proyectar solo identidad PET-ONLY sin estos campos |

**Decisiones de cierre del bloque:**
1. Mantener todos los permisos y políticas actuales sin cambios. Una auditoría no autoriza endurecimiento incidental que pueda romper perfil y Feed.
2. El muro futuro deberá usar una proyección server-side mínima y verificada por titularidad, consentimiento vigente, entitlement pagado y moderación; nunca SELECT directo de `profiles`, `wall_consents` o ledger.
3. Antes de cualquier escritura/activación: auditar wrappers/RPC, roles con privilegios, Storage de fotos, comportamiento de sesión anónima y autenticada, baja/retirada y revocación con caché.
4. **Retención NO CERRADA:** documentar períodos/criterios y obligaciones legales de conservación frente a borrado antes de guardar autorizaciones reales; no inventar plazos ni afirmar cumplimiento legal.
5. **Pagos NO AUTORIZADOS:** ninguna creación de plan, webhook, ledger, claves o entitlement. `wall_has_verified_entitlement()` permanece bloqueado según último preflight alojado documentado.
6. El acceso aprobado desde Bienvenida A01 y el preview de consentimiento individual quedan **GATES VISUALES CERRADOS**. La ubicación adicional dentro de sesión iniciada no debe presentarse como trabajo de rediseño obligatorio para este gate de seguridad.

**Resultado:** auditoría de políticas/grants acotada PASS (lectura), implementación/activación de F16 sigue BLOQUEADA por gates separados. No declarar revisión legal ni seguridad integral completadas.

## 7. Reconciliación de retención y baja F16 — análisis documental (2026-10-13)

**Estado: análisis técnico cerrado; decisión de retención/legal NO cerrada.** Contraste de `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`, `docs/PAZO_MVP_RETENTION_MATRIX_DRAFT_20261010.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` y la migración versionada `20261013215221_f16_supporter_wall_consents_foundation.sql`. No se ejecutó SQL ni se modificaron datos alojados.

### Ciclo de vida comprobado en el SQL versionado

| Evento | Efecto estructural o previsto | Validación pendiente |
| --- | --- | --- |
| Mascota sin permiso | No se crea una fila por defecto; el gate positivo permanece desactivado | Mantener exclusión del muro |
| Retirada por titular | `pazo_wall_consent_disable` establece `revoked_at`, sin exigir membresía y sin borrar la fila | Definir conservación mínima del registro revocado; no presentar retiro exitoso antes de confirmación del servidor |
| Eliminación física de mascota | FK `wall_consents.pet_id → pets.id ON DELETE CASCADE` elimina la fila ligada a esa mascota | Confirmar que el SOP de baja procesa relaciones y Storage antes de borrar la mascota; no borrar directamente |
| Eliminación física de usuario Auth | FK `owner_id_at_grant → auth.users.id ON DELETE CASCADE` elimina consentimiento si el borrado realmente se completa | No significa que toda la baja sea automática; preservar F14 y excepciones de retención |
| Cambio de titularidad | `pazo_wall_my_consents` filtra dueño actual y dueño al otorgar; `enable` exige dueño actual | La exclusión del muro público futuro debe aplicar ambas verificaciones y consentimiento nuevo tras cambio |
| Cancelación, vencimiento, reembolso | Sin ledger/entitlement real, el gate de autorización positiva retorna falso | Establecer reglas vinculadas a cobertura verificada antes de activar; no deducir estado por navegador |

### Criterio de conservación propuesto, NO aprobado como política legal

- **Consentimiento vigente:** conservar exclusivamente identificadores internos mínimos y versión/fechas mientras exista la mascota/cuenta y la finalidad de exhibición esté activa; nunca usar email, tarjeta, identidad humana pública o analytics.
- **Consentimiento retirado:** mantener solo el registro mínimo imprescindible para demostrar retirada o resolver reclamaciones justificadas; **no se ha fijado duración ni mecanismo de expiración**. La fila revocada ya no deberá habilitar publicación.
- **Solicitud de eliminación:** el SOP manual F14 gobierna verificación de identidad, relaciones y datos de terceros; la cascada de F16 no demuestra la finalización de eliminación de Auth, Storage, cachés ni respaldos. La evidencia administrativa debe limitarse al mínimo permitido por obligaciones aplicables.
- **Backups/copias externas:** no garantizar destrucción inmediata; documentar comportamiento real de proveedor y ventanas verificadas antes de prometer plazos.
- **Nuevos consentimientos:** están bloqueados hasta que exista cobertura pagada server-side, aviso vigente y nuevas autorizaciones expresas. La validación visual previa no autoriza persistencia.

### Condiciones de salida para el gate legal/retención

1. Definir con revisión jurídica/aplicable **criterio o duración operacional verificable** de conservación de autorizaciones y retiros, incluidos casos de reclamación.
2. Confirmar si la retención elegida requiere migración de purga de registros revocados o cambios de respaldo; diseñar y probar por separado, nunca ejecutar automáticamente sin gate PO.
3. Incorporar categoría y criterio final en la Privacy Policy/Terms ES/EN y `docs/PAZO_DATA_INVENTORY.md` antes de activar almacenamiento de consentimiento positivo.
4. Reconciliar con el SOP de cuenta/mascota y los escenarios de revocación, cambio de titularidad, pérdida de elegibilidad, remoción pública y caché.
5. Mantener `wall_has_verified_entitlement()` cerrado, la UI en simulación y PR #44 DRAFT mientras faltan verificación de pago, permisos de muro y cierre legal.

**Resultado:** no se encontró un motivo para aplicar una nueva migración ahora. La estructura actual contempla retirada y cascada por borrado físico, pero **no implementa caducidad de registros revocados por tiempo**; no declarar cumplimiento legal ni eliminación integral por ese hecho.


## 8. Comparación económica preliminar de procesadores — 2026-10-13 (SIN ACTIVACIÓN)

**Alcance:** membresía voluntaria Amigo de PAZO, USD 2.99/mes, pago doméstico estadounidense en USD. Se consultaron fuentes oficiales publicadas, sin abrir cuentas, crear planes, instalar SDKs ni generar cobros.

| Alternativa | Tarifa ilustrativa por cobro | Coste teórico a USD 2.99 | Neto teórico | Condiciones |
| --- | --- | --- | --- | --- |
| PayPal Checkout estándar | 3.49% + USD 0.49 | USD 0.59435 | USD 2.39565 | No equivale a cotización definitiva del producto de suscripciones ni confirma ausencia de cargos opcionales |
| Stripe Payments tarjeta doméstica + Billing por volumen | 2.9% + USD 0.30, más 0.7% de Billing | USD 0.40764 | USD 2.58236 | Supone plan Billing pay-as-you-go, tarjeta doméstica y sin otros cargos |

Cifras matemáticas sin redondeo individual de la tasa intermedia; los proveedores redondean y aplican tarifas realmente vigentes en cada cargo. Impuestos, devoluciones, disputas, conversión, pagos internacionales y servicios opcionales excluidos. **Ventaja teórica Stripe de USD 0.18671 por transacción, USD 18.671 por 100 transacciones**; no es una predicción de margen de PAZO. Tarifas sujetas a elegibilidad y revisión de cuenta mercantil.

**Fuentes oficiales consultadas (2026-10-13):**
- PayPal Merchant Fees (last updated 2026-10-01): https://www.paypal.com/us/business/paypal-business-fees
- Stripe Billing pay-as-you-go 0.7%, sin cuota fija en esa modalidad: https://stripe.com/billing/pricing
- Stripe Payments tarjeta doméstica 2.9% + 30 centavos: https://stripe.com/pricing
- PayPal Subscriptions webhooks: https://developer.paypal.com/subscriptions/webhooks/
- Stripe Billing/Checkout: https://stripe.com/payments/checkout

**DECISIÓN POSTERIOR DEL PRODUCT OWNER (2026-10-13), prevalece sobre la recomendación económica:** **PayPal es el proveedor inicial elegido** debido a las limitaciones actuales del PO para cobrar mediante Stripe. **Stripe será una integración adicional futura** cuando el PO cumpla los requisitos necesarios; no se plantea sustituir necesariamente a PayPal. La comparación económica anterior es solo referencia, no una decisión de proveedor. Para PayPal, verificar condiciones reales de suscripciones, tarifas, cuenta receptora y requisitos antes de cualquier activación. No usar Checkout/URL de retorno como acreditación: planificar verificación webhook autenticada, consulta server-side de factura/cobro, ledger idempotente y cobertura temporal confirmada. El cambio a proveedor no altera consentimiento PET-ONLY.

**Gate previo a cualquier integración pagada:** el procesador inicial **ya está seleccionado: PayPal**; siguen pendientes comprobación de la cuenta receptora y tarifas aplicables, Privacy/Terms, cancelación/reembolsos y autorización técnica específica de entitlements, webhooks y plan. Diseñar abstracción de proveedor para futura coexistencia PayPal + Stripe, sin construir Stripe ahora. **NO crear producto, plan, claves, endpoint, migración, ni activar entitlement.**
