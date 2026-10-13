# PAZO — Plan técnico PRE-AUTORIZACIÓN: muro Amigo de PAZO

**Estado:** BORRADOR SQL Y TESTS CREADOS POR AUTORIZACIÓN PO (2026-10-13); **NO APLICADOS A SUPABASE ALOJADO**. Solo probados en CI PostgreSQL sintético.  
**Fecha:** 2026-10-13.  
**Repositorio:** `DigitalAppcorp/pazo-app`, rama `f13/section-titles-20261012`, PR #44 DRAFT.  
**Proyecto Supabase:** `mrybvqdebbgcayuvgkkr`.  
**Base de requisitos aprobada:** [política de consentimiento](PAZO_SUPPORTER_WALL_CONSENT_POLICY_PROPOSAL_20261013.md).  
**Límites:** no activar proveedor, no cambiar DB alojada, no aplicar el SQL `NOT_APPLIED`, no fusionar PR ni desplegar.

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

**Secuencia eficiente:** evitar construir un muro que muestra supuesto apoyo hasta que haya estado server-side verificable; pueden diseñarse/validarse contratos y QA offline antes de cualquier migración. El PO **autorizó y se preparó** un paquete de migración en GitHub **SIN APLICAR A SUPABASE**. El siguiente paso requiere nueva aprobación técnica y de privacidad antes de promoverlo a `supabase/migrations/`, aplicarlo, o habilitar pagos.

### Borrador SQL preparado (no aplicado alojado)

- [`supabase/drafts/20261013_f16_supporter_wall_consents_NOT_APPLIED.sql`](../supabase/drafts/20261013_f16_supporter_wall_consents_NOT_APPLIED.sql): tabla privada de consentimientos, roles/RLS sin grants directos, RPC propias autenticadas, sin lista pública. Función interna de entitlement **retorna FALSE intencionadamente** hasta gate de pagos, impidiendo aprobar consentimientos reales anticipados.
- [`supabase/tests/supporter/consent-metadata.sql`](../supabase/tests/supporter/consent-metadata.sql): aserciones del catálogo (RLS/ACL/search_path/ownership de funciones).
- [`supabase/tests/supporter/consent-synthetic.sql`](../supabase/tests/supporter/consent-synthetic.sql): actores/pets ficticios, cambio temporal de gate solo dentro de transacción `BEGIN..ROLLBACK`, autorización/revocación, propiedad, transferencia, versiones inválidas y vencimiento. Guardias de `f14_synthetic`/PG17.
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): job existente `f14-postgres` prueba el **borrador** contra DB efímera tras operaciones F14; run `38472636836` PostgreSQL SUCCESS. **No es prueba en Supabase alojado ni verificación de cobertura PayPal**.
- Criterio posterior: auditar RLS combinadas `pets_public_read`/`f14_moderated_pets_select`, exposición `profiles.paypal_subscription_id`, efectos de deletion SOP, retención/consentimiento, textos legales y flujo con proveedor real. **El borrador es insuficiente para publicar mascotas aunque sus pruebas pasen.**

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

No se ha modificado la base de datos, ni su política RLS, ni se han activado cobros. Este documento es un análisis y plan sujeto a revisión; **no SQL ejecutable aprobado**.
