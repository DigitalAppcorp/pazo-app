# PAZO — Meta Ads 2 | Acta GO/NO-GO de integración (31-oct-2026)

**Estado: NO-GO para cualquier transmisión a Meta o lanzamiento de campaña.**
**Issue:** #169 (dependencia #168) · **PR:** #171 DRAFT, base `feat/issue168-ads2-attribution`.
**SHA candidato auditado:** `789460d71757512e23ef0ceb0cf25dcd3e062d9f`.
**Autorización vigente:** implementación de código, laboratorio, CI y preparación. No hay autorización para merge, SQL hosted, despliegue de Edge, aviso de privacidad publicado, activación de Pixel/CAPI, campañas o presupuesto.

## Matriz de evidencia

| Control | Estado | Evidencia / condición |
| --- | --- | --- |
| Build y regresión general | PASS | [Ads2 isolated contracts — 41175724463](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41175724463), mismo SHA |
| Tests de Meta OFF y barrera de activación | PASS | [Meta Pixel CAPI fail-closed — 41175724499](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41175724499): **113/113**, `META_OFF_BOUNDARY_PASS` |
| Atribución, deduplicación y retirada en PostgreSQL 17 | PASS EN LABORATORIO | `ads2-pg17.mjs` y `meta-outbox-pg17.mjs` en PG17 descartable; ningún SQL alojado |
| E2E de navegador para Ads2 | PASS EN CI | `ads2-browser.mjs` (Playwright/Chromium); no es un E2E de Meta Events Manager |
| Evento confirmado y mismo ID en Pixel/CAPI | PASS EN CONTRATOS SINTÉTICOS | UUIDv4 único de base de datos y `CompleteRegistration`; deduplicación real en Meta **NOT_TESTED** |
| Consentimiento separado, retirada y GPC | PASS EN CONTRATOS / BLOQUEADO PARA RELEASE | Endpoints Auth + RPC candidatos; aún no instalados ni validados con Auth real en staging |
| Exclusiones QA/admin y opt-out | PASS EN SQL/UNIT | Faltan pruebas reales de roles, usuarios y señales de GPC en staging autorizado |
| Inventario/aval legal de campos enviados a Meta | BLOCKED | Pixel expone al menos datos técnicos de conexión; CAPI requiere campo de matching aprobado. No asumir anonimato de hash |
| Aviso público ES/EN y aprobación Design OS | BLOCKED | Solo existe `META_CONSENT_ES_EN_DRAFT.md` como borrador **no publicado**; aviso actual no cubre este intercambio |
| Dataset/Pixel/CAPI token, cuenta y Meta Test Events | NOT_VERIFIED | No se consultó Meta Events Manager; no se usó token real ni se enviaron eventos |
| Migración oficial y funciones Edge | NOT_DEPLOYED | Candidatos en `supabase/tests/marketing/` y `supabase/functions/pazo-meta-*`, sin instalación |
| Activación de tracking/producto | OFF | Todos los flags hardcoded OFF; `App.tsx`/entrada pública no importan Meta; CI vigila la frontera |
| Campañas e inversión | NO ACTIONS | No se modificaron anuncios ni presupuestos. **No** inferir gasto actual de Meta Ads sin acceder a la cuenta |

## Condiciones de salida obligatorias (ninguna se presume aprobada)

1. **Privacidad:** resolver con revisión competente las obligaciones aplicables, finalidad, aviso ES/EN, aprobación granular del inventario de datos de transporte y matching, periodo de retención, GPC cross-device, retirada y experiencia UX. Consultar Design OS; no cambiar la política publicada sin GO.
2. **Infraestructura controlada:** disponer de entorno staging separado y claves administradas exclusivamente en secretos del entorno, no PR, logs ni chat. Auditar y promover **solo la migración nueva revisada** (sin `supabase db push` global ni tocar el historial), y instalar funciones con flags aún OFF. Verificar RLS, propietarios y autorizaciones Auth.
3. **Interfaz y recorrido:** integrar el consentimiento deliberado en el momento apropiado después de email verificado, sin bloquear QR, registro, MFA, PayPal, demo o herramientas cuando Meta falle. Validar ES/EN en 390/430 px, GPC real, logout/login, múltiples pestañas, QA/admin y retirada; no usar el alta solicitada como conversión.
4. **Proveedor:** obtener de Events Manager del titular el Dataset/Pixel ID, token CAPI restringido a servidor, versión vigente y entorno de pruebas propio. No inventar la disponibilidad del objetivo `CompleteRegistration`. Verificar eventos en **Test Events** y dedup real de Pixel/CAPI por mismo `event_name` y UUID, respetando la privacidad y evitando contaminar audiencias; no inferir que un test code excluye aprendizaje.
5. **Decisión de negocio:** entregar evidencia vinculada a SHA/entorno de privacy, E2E y Test Events; solicitar GO **separado y explícito** para cambios productivos, transmisión real y cualquier lanzamiento/gasto.

## Seguridad y rollback

- **Antes de liberar:** conservar Pixel/CAPI/worker/consent UI OFF y las opciones de opt-out disponibles cuando se instalen; no ejecutar requests externos.
- **Si se autoriza liberar en el futuro:** activar por etapas solo después de pruebas reales y rollback probado; apagar primero el gate del proveedor ante incidentes, detener el worker, inhibir el SDK y confirmar que el usuario puede retirar el permiso aun con proveedor OFF.
- Una retirada no deshace datos ya transmitidos ni elimina una solicitud CAPI en vuelo. El sistema debe informar un fallo de persistencia como `withdrawal_unconfirmed`, no fingir éxito.
- La auditoría actual no prueba cumplimiento legal, disponibilidad de Meta, conversión pagada ni resultados de campañas.

**Conclusión:** Código modular y laboratorio considerablemente preparados, con CI verde. **Integración funcional en producción NO completada; Meta no verificado; NO-GO de activación.** Mantener #168 abierto y PR #171 DRAFT hasta cerrar los requisitos anteriores y contar con autorización específica.

## Infraestructura y entorno de staging — verificación real, 31-oct-2026

**Auditoría read-only de Supabase y Vercel conectados (no pruebas de Auth reales):**

- **Supabase:** un solo proyecto visible, `PAZO`, ref `mrybvqdebbgcayuvgkkr`, `ACTIVE_HEALTHY`, PostgreSQL 17.11; **`list_branches` devuelve cero ramas**. No hay otro backend staging visible para pruebas autenticadas sin afectar producción.
- **Vercel:** dos proyectos visibles: `pazo-app` y `pazo-app-t83r`; ambos incluyen variables Supabase para `preview`. No se descifraron las variables ni se demostró que una vista previa use una base diferente. **Vercel preview ≠ backend staging aislado** por sí solo. Está prohibido aplicar la migración candidata o utilizar la cuenta real para pruebas de signup/opt-out sin aislamiento confirmado.
- **Repositorios:** el PR #170 de atribución sigue abierto en borrador; #171 tiene como base su rama, por lo que no se puede considerar la dependencia #168 publicada. `supabase/config.toml` contiene `[auth.email] enable_confirmations = false` para el entorno local; esto **no acredita el ajuste de Auth alojado**. Un entorno de prueba para `CompleteRegistration` debe habilitar/verificar confirmación real del correo y probar que un registro solicitado no cuenta como confirmado.
- **Copia de datos:** no copiar cuentas, correos, mascotas, medios, información de pago ni registros de personas desde producción a staging. Usar exclusivamente usuarios sintéticos y correos de captura local/staging.
- **Coste y autorización:** Supabase preview branching crea una instancia aislada con cargos por uso de compute, egress y almacenamiento. La documentación oficial indica que las ramas no están protegidas por el Spend Cap: https://supabase.com/docs/guides/platform/manage-your-usage/branching . **No se creó rama, proyecto ni gasto**, porque aún no hay autorización explícita para esos posibles cargos.

### Secuencia segura para desbloquear el E2E real

1. **Elegir un backend aislado:** preferir un laboratorio Supabase CLI efímero sin credenciales de producción para ejercitar Auth/Edge local; alternativamente, aprovisionar una rama preview Supabase o proyecto staging separado **después de aprobar el coste**. Confirmar que su project ref sea distinto de `mrybvqdebbgcayuvgkkr`.
2. **Hacer inventario de Auth y flujos de seguridad:** habilitar confirmación de correo en el entorno sintético; ensayar signup solicitado → correo confirmado por servidor → único UUID de evento; denegar autoconfirm, QA/admin, GPC, retirada y permisos ausentes. Mantener PayPal Live, MFA y servicios de producción totalmente fuera de alcance.
3. **Aplicar únicamente la migración candidata auditada al entorno sintético** después de convertirla en versión revisada. Ejecutar allí las funciones grant/withdrawal/receipt con `CAPI/Pixel OFF`, validar RLS/RPC con rol service y usuario real sintético.
4. **Validar recorridos completos de navegador y back-end:** ES/EN y 390/430 px, múltiples pestañas, logout/login, pérdida de red, reconciliación tras retirada, GPC y exclusión de sesiones QA/admin. Ningún script de Meta ni llamada externa debe aparecer.
5. **Sin activar Meta hasta el próximo GO:** concluir revisión legal/Design OS e inventario de datos; solo entonces autorizar Event Manager Test Events en un dataset de prueba y una prueba externa de deduplicación. La etapa de gasto publicitario requiere decisión independiente.

**GO de implementación:** continuar solo trabajos de laboratorio que no generen cargos ni impacten producción.

**NO-GO operativo:** no crear todavía Supabase branch/proyecto pago, no aplicar SQL hospedado, no cambiar `supabase/config.toml` global como sustituto de evaluar el Auth alojado, no conectar un Vercel preview al backend vivo para QA, no cargar SDK/CAPI ni usar Meta Events Manager.

## Laboratorio Auth/GoTrue + Mailpit sin entorno alojado

La rama `feat/issue169-meta-pixel-capi-off` incorpora `.github/workflows/meta-auth-local-lab.yml` y `scripts/meta-local-auth-lab.mjs` para ejecutar una prueba de **Auth real** en contenedores temporales del runner GitHub, sin conexión a Supabase alojado. El laboratorio tiene un proyecto Supabase `pazo-meta-auth-lab` creado de cero, activa `[auth.email] enable_confirmations=true` **solo en el fichero efímero**, conserva Auth+PostgreSQL+Mailpit+Kong, excluye servicios que no son necesarios y destruye el volumen sintético al finalizar.

Comprobaciones programadas:
1. Supabase GoTrue recibe un `signup` con correo sintético `@example.invalid` y **no** devuelve sesión ni `email_confirmed_at`.
2. `signInWithPassword` contra Auth antes de confirmar debe fallar sin JWT.
3. Mailpit captura el correo local. El laboratorio sigue **únicamente** un enlace de `/auth/v1/verify` dirigido a loopback, con redirección manual.
4. Auth devuelve una sesión verificable y `GET /auth/v1/user` contiene confirmación; otra sesión de la misma cuenta no representa un nuevo registro.
5. El script aborta antes de cualquier solicitud si la URL o el enlace salieran de `127.0.0.1/localhost`; no se escriben email/JWT/contraseñas en logs, no se envían emails reales ni solicitudes a Meta.

**Límites:** no es todavía el E2E completo de PAZO → Meta. Los permisos/meta-outbox en PostgreSQL 17 son comprobados por `meta-outbox-pg17.mjs` aparte; no están conectados al Auth real en este laboratorio. Las Edge Functions de Meta no están desplegadas, Pixel/CAPI siguen OFF y Test Events no se ha probado. El estado de este CI debe citarse por su resultado concreto, sin inferir PASS de un arranque todavía en curso.

**Creación alojada bloqueada:** se intentó `Supabase create_branch` para `pazo-meta169-auth-qa-off` sin token de confirmación y la API exigió explícitamente `get_cost → aceptación del monto → confirm_cost`. **No se creó una rama, ni se generó un cobro de instancia por ese intento.** Antes de obtener una rama alojada corresponde identificar con el propietario la organización de facturación, consultar su cotización específica y aprobar explícitamente el costo y duración. No activar automáticamente recursos facturables.

## Resultados verificados del laboratorio GoTrue local — PASS

- [**GitHub Actions local Auth — SUCCESS**](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41176777459), SHA `531586ef4d8ef92f737a730219c0d93e04a06a87`. Resultado emitido por el test: `LOCAL_GOTRUE_CONFIRMED_SIGNUP_PASS`.
- Validado sobre **GoTrue real, PostgreSQL real y Mailpit local temporal**: signup solicitado sin sesión, login denegado antes de confirmar, enlace recibido en buzón local, confirmación con `/auth/v1/verify`, sesión y `GET /auth/v1/user` después de verificar, y segundo login de la misma identidad. No datos reales, no emails externos, no proveedores Meta.
- [Log de ejecución](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41176777459) confirma que la tarea de limpieza `supabase stop --no-backup` también terminó en SUCCESS y descartó datos sintéticos.
- El primer intento detectó la necesidad de diagnósticos no sensibles y el segundo detectó una discrepancia entre la respuesta HTTP directa de GoTrue y el wrapper `supabase-js`. Ambos fueron corregidos sin modificar la política de email: esta sigue habilitada **solo en el directorio temporal del runner**, no en producción.
- **Limitación:** aún no se ha ejecutado una prueba completa de los endpoints Meta candidatos con Auth real y migración Meta aplicada a un entorno aislado. El flujo de laboratorio GoTrue no equivale a validación de Meta CAPI/Pixel, ni valida la UX de PAZO. `AUTH_CONFIRMED_LOCAL_PASS` pero `META_END_TO_END_HOSTED_NOT_TESTED`.
- **Rama alojada NO creada:** Supabase requirió ID de confirmación del coste. Falta consultar la cotización asociada a la organización correcta y obtener aceptación expresa del precio real; la autorización genérica de continuar no sustituye al consentimiento formal de facturación requerido por Supabase.

## Validación real de GoTrue JWT con endpoints Meta candidatos (laboratorio local)

**Evidencia:** [Workflow Supabase local / GoTrue + Edge candidate: SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41177663254) para SHA `dbd0d883551daf903cba024a5a4d04a64c0934a2`. Prueba `scripts/meta-local-auth-edge-flow.mjs`, invocada por `scripts/meta-local-auth-lab.mjs` tras confirmar correo con el Auth local real, bajo `.github/workflows/meta-auth-local-lab.yml`. Las tareas de verificación y `supabase stop --no-backup` finalizaron PASS.

El flujo usó **un JWT auténtico emitido por GoTrue local** y los handlers HTTP candidatos `createMetaGrantHandler`, `createMetaReceiptHandler` y `createMetaWithdrawalHandler`. El backend de consentimiento/outbox se reemplazó deliberadamente por un **almacén aislado en memoria**; el contrato de SQL/reintentos/concurrencia continúa verificado **por separado** en los tests PostgreSQL 17 descartables. No se usaron funciones Edge alojadas ni credenciales reales de Meta.

Validado:
- Signup solicitado sin sesión; login no confirmado denegado; confirmación real vía Mailpit; `GET /auth/v1/user` verifica email confirmado y propietario; regreso de la misma cuenta sin crear otra identidad.
- Handler grant reconsulta Auth real usando el JWT y no acepta credenciales desconocidas ni campos `ownerId` enviados por navegador. La decisión positiva es sintética y **no publica el aviso legal**.
- Contrato explícito grant → recibo con un solo UUIDv4 → Pixel **simulado mediante callback**. Un segundo intento no genera otro evento.
- `Sec-GPC: 1` en una solicitud de recibo provoca persistencia de retirada **en memoria**; la prueba verifica que tras retirar no se produce un recibo nuevo, que la retirada repetida es idempotente y que no se restablece el permiso automáticamente.
- Sin conexiones de salida a Meta, ningún correo externo, sin base de datos Supabase alojada, sin logs con correo/JWT/secretos.
- [Meta unitario + frontera OFF](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41177666542): SUCCESS, **113/113 PASS**. La regresión general [Ads2 aislado](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41177666589) debe verificarse al concluir; no atribuir PASS por anticipado.

**Qué NO se ha verificado aún:** Auth real + outbox SQL candidate en una **misma** base de datos Supabase, Edge Functions realmente desplegadas en staging, interacción real UI ES/EN en PAZO, consentimiento jurídico publicado, lector de identificadores CAPI aprobado o deduplicación Pixel/CAPI en Meta Events Manager. No confundir el callback Pixel simulado con un envío al proveedor.

**Costos:** No se creó ninguna rama/proyecto Supabase alojado ni se aceptó la tarifa propuesta. El laboratorio utiliza los workflows GitHub Actions existentes y sus minutos de ejecución habituales (sujetos a cuotas del plan GitHub), no nueva infraestructura facturable de Supabase. Meta Pixel, CAPI, tracking en vivo y campañas siguen OFF. La opción de staging pagado queda descartada por ahora conforme a la instrucción del PO.

## Auth real y SQL candidato en la MISMA base local — PASS

**Evidencia ejecutada:** [GitHub Actions — Supabase Auth real + SQL candidato + GPC, SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41178064177) en commit `e295147ebe25c5abb78f122b4622939a72c22863`. Resultado verificable del runner: `LOCAL_REAL_AUTH_SQL_META_PASS`, junto a `LOCAL_GOTRUE_CONFIRMED_SIGNUP_PASS` y `LOCAL_AUTH_META_EDGE_CONTRACT_PASS`. La tarea de limpieza `supabase stop --no-backup` finalizó en SUCCESS.

**Avance específico respecto a la evidencia anterior:** el usuario y el JWT provienen de GoTrue real; ahora se aplica el archivo `supabase/tests/marketing/meta-outbox-candidate.sql` **sin modificaciones** sobre el **mismo PostgreSQL 17 del Supabase CLI que contiene `auth.users` y verifica el correo**. El único esquema auxiliar `meta-local-gotrue-prerequisites.sql` construye en ese laboratorio los requisitos mínimos de adquisición/retención/eligibilidad para no instalar las ~137 migraciones de PAZO ni alterar la configuración Auth alojada. Esta simplificación se declara, no se presenta como una reproducción completa de las exclusiones de administración y QA, que tienen pruebas independientes en `meta-outbox-pg17.mjs`.

**Verificado end-to-end dentro del laboratorio local sin tráfico Meta:**

1. Un registro confirmado genera usuario real en `auth.users`; insertar la atribución sin consentimiento explícito no crea outbox.
2. La primera sesión verificada y una elección positiva explícita invocan el endpoint candidato con JWT real y un RPC SQL privado; crean **un único `event_id` UUIDv4** persistido en la tabla outbox. El comprobante HTTP usa exactamente ese ID. La parte de Pixel es **un callback simulado, no el SDK real**.
3. Una repetición de grant o refresco de sesión no emite otra conversión ni cambia el evento almacenado.
4. La función de reserva de CAPI obtiene un lease único. Una petición Auth válida con `Sec-GPC: 1` persiste la retirada real en PostgreSQL, marca la fila como `suppressed`, invalida el lease y bloquea tanto el settlement del trabajador obsoleto como un segundo comprobante de Pixel.
5. Los roles de navegador `anon` y `authenticated` no pueden leer el outbox privado ni llamar al RPC restringido de retirada.
6. No se usaron claves alojadas, no se envió nada a Meta, no se creó rama pagada y se descartaron los contenedores y usuarios sintéticos.

**Alcance NO cubierto aún:** no se aplicaron las migraciones completas de PAZO en la misma instancia; el esquema auxiliar de atribución tiene reglas simplificadas. Los handlers corrieron dentro del test Node contra Auth/SQL reales, **no mediante un despliegue real de Edge**. No se validaron la interfaz real bilingüe, los avisos legales, la aprobación de campos de CAPI, ni el envío/deduplicación en Events Manager. No activar proveedores basándose en este PASS.

**Costo:** sin nueva infraestructura Supabase facturable. Uso de runners GitHub Actions conforme a sus cuotas habituales. `META_PROVIDER_OFF / RELEASE_NOT_AUTHORIZED / NO_AD_SPEND`.
