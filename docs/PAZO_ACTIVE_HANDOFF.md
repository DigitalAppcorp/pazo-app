# PAZO — ACTIVE HANDOFF | 2026-10-10, post-reset y recuperación de perfil

**Reglas:** `AGENTS.md` y `docs/PAZO_MASTER_ROADMAP.md`. **Brain OS:** `DigitalAppcorp/project-brain-os` v1.4.1 (`SKILL.md` + `patterns/VERIFIABLE_HANDOFF.md`). **Historial:** `docs/archive/PAZO_ACTIVE_HANDOFF_BEFORE_RESET_20261010.md` y `docs/archive/PAZO_ACTIVE_HANDOFF_BEFORE_PROFILE_RECOVERY_20261010.md` (conservan evidencia, estados previos y decisiones).

## Fuente de verdad y estado Git

- Repositorio `DigitalAppcorp/pazo-app`, rama `f14/beta-reporting-integration-20261009`, [PR #37](https://github.com/DigitalAppcorp/pazo-app/pull/37) **DRAFT, NO MERGED**, base `main`. PR #36 sigue siendo dependencia lógica de integración; no fusionar ni rebasear sin gate PO.
- **Último código verificado:** commit `a9f7f85a1b31a5126add26ed69cec8ff29b91856`; GitHub Actions CI **PASS** #38034600644 (hardening, arquitectura, privacidad, tests MVP, build; lint legacy no bloqueante). Un commit documental posterior requiere comprobación de su propio CI. El HEAD puede avanzar por la documentación; leer PR vivo.
- Estado de worktree local Windows/Antigravity: **DESCONOCIDO**. QA de navegador actualizado post-integración: **PENDIENTE**. Ni el CI ni el test SQL simulado demuestran funcionamiento real con credenciales.
- No se ha hecho merge a main, deploy de Vercel, creación de infraestructura de pago ni purga de datos en este gate.

## Supabase alojado — verificado

Proyecto `mrybvqdebbgcayuvgkkr`. Después de la limpieza autorizada del 10-oct-2026, **NO REPETIR NINGÚN BORRADO**. SELECT posterior a nueva migración: **6 `auth.users`, 6 identidades, 0 `public.profiles`, 1 `public.pets`, 1 `storage.objects`**; la mascota y el avatar son de la prueba post-reset validada por PO mediante su «listo». La ausencia de perfil se debe a que `handle_new_user()` solo corre cuando se registra una cuenta Auth nueva. No crear cuentas nuevas ni restaurar fixtures viejos.

**Nueva migración APLICADA, autorizada en este chat por el PO al aceptar el gate solicitado:** `20261010072555_f14_recover_missing_profile`. SQL versionado `supabase/migrations/20261010072555_f14_recover_missing_profile.sql` (se mantiene el borrador anterior en `supabase/drafts/` solo como historia, NO volver a ejecutarlo). Crea la RPC `public.pazo_ensure_my_profile()` con verificación de `auth.uid()`, acceso exclusivo de `authenticated`, inserción solo de `id` y flags falsos, `ON CONFLICT DO NOTHING`. No permite insertar o modificar arbitrariamente `profiles`; `anon` no tiene EXECUTE y `authenticated` no tiene INSERT directo. No crea perfiles en masa.

**QA de backend:** dos invocaciones de la RPC bajo rol autenticado con identity JWT simulada dentro de **BEGIN/ROLLBACK** resultaron en exactamente un perfil temporal, ambos flags false; después de rollback `profiles` permanece en cero y Auth/pets/Storage no cambiaron. Prueba de permisos `anon=false`, `authenticated=true`. No se probaron credenciales reales después de conectar el cliente; no reportar ese caso como E2E PASS. Supabase Security Advisor enumera la RPC como `authenticated_security_definer_function_executable` WARN (acceso intencional y restringido); otras advertencias históricas permanecen y no se corrigieron por este gate.

**Migraciones F14 antes aplicadas:** `20261010043307_f14_media_jwt_claim_compat_single_test`, `20261010045708_f14_account_request_intake`, `20261010053708_f14_community_ownership_continuity`. **SIN APLICAR:** `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql`; requiere aprobación separada y no implica worker de eliminación Auth/Storage. Edge `f14-moderation-purge` v5, verify_jwt=true, purge global OFF; no encenderla.

## Código de recuperación y alcance probado

- `src/features/auth/ensureOwnAccountProfile.ts`: única llamada cliente `supabase.rpc('pazo_ensure_my_profile')`, sin user ID suministrado por browser.
- `src/context/AuthContext.tsx`: tras reconocer una sesión válida, recupera perfil **antes de permitir montar la app**; cubre login nuevo y sesiones almacenadas, acepta reintento/Sign Out ante fallo y no bloquea pantalla de recuperación de contraseña. No reconfigura login ni onboarding de mascota.
- `src/App.tsx`: estado previo conserva la distinción entre pets vacías y error y encamina mascota nueva a A03. `OnboardingView` evita volver a registro cuando ya hay sesión. Creación de mascota post-reset previa **PASS PO**, DB `pets=1`, sin prueba nueva tras cambio de AuthContext.
- Revisión estática de estados vacíos: Feed muestra «Todavía no hay publicaciones», Comunidades «Todavía no hay comunidades», Lugares «No encontramos lugares…» y carga/error con reintento; **runtime aún no verificado**.
- No crear datos de moderador ni catálogo de Lugares a escondidas. `moderator_grants` y `pet_places` fueron vaciados por reset y sus accesos/estados deben tratarse explícitamente; autorizaciones antiguas de usuario moderador no se recrean por perfil.

## ÚNICA SIGUIENTE ACCIÓN — Gate de aceptación post-reset

**PO:** actualizar worktree visual a último SHA del PR #37 **sin sobrescribir trabajo local no guardado**, iniciar sesión con una de las 6 cuentas Auth retenidas y confirmar una sola vez: no queda atrapado en «Preparando tu cuenta», entra a PAZO, ve su mascota después de F5, y la navegación de Feed/Comunidades/Lugares con datos vacíos no da errores. No crear cuenta Auth nueva ni repetir suites anteriores. Una vez confirmado, **AI:** verificar con SELECT que `profiles=1` para su cuenta (agregado, sin IDs), `auth.users=6`, ausencia de flags privilegiados, y comprobar HEAD/CI del checkpoint. Corregir cualquier fallo reversible en la rama antes de pasar a los bloqueadores siguientes de MVP/F14.

**Después del gate:** revisar cierre de beta (retirada segura Storage/CDN D3-A, A3 eliminación real de cuenta, D3-B retención, A4 documentos legales, email de Auth real y PR apilados). Decisiones de producto de transferencia de Comunidades y «Autor eliminado» permanecen cerradas; implementación y release no lo están.

**Límites inalterables:** NO repetir el borrado; no tocar Auth/identidades ni restaurar fixtures, no merge a main, no Vercel, no migraciones adicionales, no purgas de media, no borrar cuentas, no crear recursos de pago sin autorización específica. El futuro borrado final pre-lanzamiento es otro gate con inventario, alcance y aprobación; decidir expresamente si conserva o no Auth.

**Activación nuevo chat:** «Activa Brain OS v1.4.1 y PAZO PR #37, lee AGENTS/handoff/roadmap; audita HEAD/CI/Supabase y continúa solo desde el gate de aceptación post-reset. Conserva las 6 Auth, no hagas merge/Vercel ni más migraciones sin permiso».

## QA visual reportada; discrepancia de persistencia — 2026-10-10

El Product Owner confirmó que sus pruebas locales pasaron. Se registra PASS visual reportado, sin evidencia del SHA del directorio ejecutado. Consulta read-only posterior: 6 cuentas Auth, 0 perfiles, 1 mascota y 1 objeto Storage. Por tanto, la restauración real de perfil aún NO está demostrada en Supabase alojado. Las pruebas de backend reversibles y CI del cambio pasaron anteriormente. No repetir la suite visual ni la purga. Próxima comprobación: identificar rama y commit de la carpeta ejecutada en Antigravity; después contrastar el entorno Supabase antes de declarar el gate cerrado.

## Identificación visual de versión en splash — 2026-10-10

- Decisión PO: mostrar una versión corta para no confundir builds de Antigravity con HEAD GitHub.
- Código: `vite.config.ts` genera `__PAZO_BUILD_VERSION__` con `VITE_APP_RELEASE` (CI) o `git rev-parse --short=8 HEAD` (local); marca `· modificado` si el checkout contiene cambios rastreados no confirmados. `src/features/release/buildVersion.ts` lo expone; `src/App.tsx` lo muestra como texto discreto bajo «Su mundo, más cerca» en el splash. En desarrollo agrega `· local`; sin Git/env: `desconocida`. No agrega dependencias, bordes, migraciones ni tracking. Código en `9f0caed7ed6fdc12cb76a4845c653312a605b8b1`.
- La versión local se calcula **al arrancar/reiniciar Vite**; si se hace checkout mientras el servidor sigue abierto, reiniciar dev server antes de comparar. Los cambios no rastreados `untracked` no están incluidos en el marcador. El número mostrado es la revisión de fuente, NO un test de Supabase conectado ni aprobación de E2E.
- **Gate todavía abierto:** el PO reportó flujo visual PASS pero SELECT alojado resultó 6 Auth, 0 profiles y 1 mascota. Con la nueva versión visible en splash, pedir solo la cadena exacta de versión local y comparar con el commit fuente, más el origen de Supabase si persiste la discrepancia. No repetir QA anterior ni afirmar auto-restauración E2E hasta ver fila en `profiles`.
- PR #37 sigue DRAFT, no merge/main/Vercel; CI de este nuevo cambio se debe verificar separadamente.

## Ajuste aprobado del indicador de versión en splash — 2026-10-10

- PO rechazó letras/etiquetas visibles porque llamaban la atención; solicitó **solo números** en el **centro inferior**, con presencia discreta. Esta decisión sustituye la presentación anterior `Versión <SHA> · local/modificado`, aunque se conserva automáticamente la identificación del checkout.
- `vite.config.ts` convierte los primeros 6 dígitos hexadecimales del SHA del commit a un número decimal de 8 posiciones y define una etiqueta visual `0.1.NNNNNNNN` (solo dígitos y puntos). Si hay cambios rastreados sin commit, agrega el indicador numérico `.1`; si no hay Git válido muestra `0.0.0` como valor de desconocido. Es identificador de QA, **no** SemVer oficial ni garantía matemática de unicidad absoluta (24 bits pueden colisionar).
- `src/App.tsx` muestra **únicamente** `{pazoBuildVersion}`, centrado en `bottom-4`, fuente `10px`, color secundario atenuado, sin rótulos «Versión»/«local» ni letras visibles, sin contornos. El `aria-label` accesible no forma parte del texto visible.
- Para comparar compilación local y GitHub se debe calcular la misma transformación sobre el SHA deseado, y **reiniciar Vite** después de checkout/cambios. El valor puede diferir si hay modificaciones sin confirmar. Commits de código: `4fcc9fdd` y `bbf82eea` en PR #37. CI del SHA de código y QA visual específicos deben verificarse; no confundirlos con aceptación del gate de perfil.
- Otros gates sin cambios: `profiles=0` a última inspección pese a PASS visual reportado; reconciliar instalación/entorno, no repetir borrados. No Vercel, migraciones, ni merge.

## Corrección de texto del splash — 2026-10-10

- El PO precisó que el indicador inferior central SÍ debe decir `Versión` seguido del identificador numérico, por ejemplo `Versión 0.1.08229221`. La petición de usar solo números se refería al **identificador**, no a quitar la palabra «Versión».
- `src/App.tsx` restablece `Versión {pazoBuildVersion}`, conserva ubicación inferior central, tipografía pequeña y discreta, sin contornos ni texto adicional (`local`, `modificado`). Commit de código `d52e0d38` en PR #37; comprobar CI de ese SHA por separado.
- El resto de la funcionalidad y las restricciones de base de datos, Vercel, Auth y merge no cambian. La aceptación visual específica de este ajuste aún es independiente del CI.

## Gate integrado de MVP — reconciliación no destructiva (2026-10-10)

**Evidencia GitHub y CI:**
- PR #37 HEAD auditado antes de este commit documental `25268442c53d5d2f4bfa5ad051de26c664a8764a` y CI #38037587661 **SUCCESS**; DRAFT, abierto, **no merged**. `main` continúa en `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`.
- Comparación exacta #36 `beef7a68` → #37: `ahead_by=78`, `behind_by=0`; #37 contiene la base de código MVP #36, además de F14 y recovery/splash. Esto NO implica que el merge sea seguro ni autorizado. No duplicar #36.
- PR #38 de baja A3 está **divergido** de #37 (`ahead_by=60`, `behind_by=69` al comparar #37 → #38). Incluye `AccountDeletionPanel`, coordinator y numerosos SQL `NOT_APPLIED`. **No cherry-pick/merge masivo**, ni reanudar 13 drafts; la decisión fast-track anterior lo mantiene pausado. Reutilizar ideas puntuales solo tras revisión de compatibilidad.
- PR #35 DRAFT contiene trabajo avanzado F14 pero no se fusiona porque puede introducir guard de Mapa solo desarrollo. PR #34 es carril de validación de Lugares; no sustituye el `MapView` real ya conectado en #37.

**Chequeo estático de P0:**
- `src/App.tsx` mantiene `MapView` real en la navegación (no hay bandera `PLACES_MAP_DEVELOPMENT_ONLY` en ese archivo).
- `src/features/legal/legalCopy.ts`: `LEGAL_RELEASE_READY=false`; aviso de borrador, **política pública aún no lista**.
- `src/features/account/deletionPreflight.ts`: `ACCOUNT_DELETION_EXECUTION_ENABLED=false`; `deletionRequestState.ts`: `DELETION_EXECUTOR_ENABLED=false`; solicitud intake existe pero no permite prometer eliminación definitiva.
- `supabase/functions/f14-moderation-purge/index.ts`: `F14_MEDIA_PURGE_RELEASE_APPROVED=false`; función bloqueada con respuesta 503. No habilitar por un simple cambio de bandera: verificar Storage/CDN y worker antes de Beta.
- SELECT alojado tras último PASS visual: **6 Auth, 0 profiles, 1 pets, 0 posts, 1 Storage**. Ninguna purga/DDL/escritura aplicada durante esta auditoría. La migración de autor eliminado sigue NOT_APPLIED.

**Decisión ejecutiva:** la integración de código #36 → #37 es consistente por ascendencia; **no está habilitada para merge o release** mientras F14 P0 esté pendiente. No repetir suites aprobadas ni desbloquear banderas artificialmente. Próximo paso de coste casi cero para el gate Auth: el PO comparte **el número exacto que ve junto a «Versión» en el splash del proyecto abierto en Antigravity**; se compara con el algoritmo vigente en `vite.config.ts`, teniendo en cuenta checkout modificado y reinicio Vite. Si el número coincide con un commit que contiene `ensureOwnAccountProfile`, confirmar Supabase `profiles` por SELECT y diagnosticar origen; si no, actualizar local con `git status` antes de cualquier pull. Este dato no reemplaza la evidencia de Auth real y no debe forzar pruebas reiteradas. En paralelo, trabajo siguiente de F14 exige un **único gate PO** para solución mínima de baja/media, nunca operaciones irreversibles por omisión.

## Incidencia nueva: splash no termina en Antigravity — 2026-10-10

- El PO informó **«Ahora ya no pasa del splash»** después de actualizar el indicador de versión. No tenemos captura de consola ni SHA local confirmado: la causa exacta del entorno todavía NO está probada.
- Auditoría directa de `src/App.tsx`: `if (showSplash || loading)` mantenía el splash animado después de los 2,5 s si `AuthContext.loading` permanecía `true`. Auditoría de `AuthContext.tsx`: `supabase.auth.getSession().then(...)` no tenía `catch`, timeout ni recuperación visible. La recuperación `pazo_ensure_my_profile` también carecía de timeout, por lo que podía bloquear la pantalla «Preparando tu cuenta».
- **Corrección de frontend solamente** en `AuthContext.tsx` y `App.tsx`, commits `7d3b5d05`, `eba7bc74`: el splash dura lo que establece su temporizador, separa «Verificando tu sesión» del splash; la sesión se comprueba con `INITIAL_SESSION` o `getSession` y error/timeout de 10 s; en fallo aparece «Reintentar» sin considerar autenticada una sesión desconocida. La RPC de perfil conserva permiso solo authenticated, timeout 10 s y reintento fail-closed. El indicador inferior `Versión 0.1.NNNNNNNN` no se modificó.
- **No asegurar todavía que sea el único origen de la avería**: el usuario debe ejecutar la rama/commit nuevo en Antigravity; GitHub CI de código y QA local requieren evidencia separada. Si aparece un error tras reintentar, diagnosticarlo por etapa y consola sanitizada, sin credenciales/tokens.
- **No** se ejecutaron SQL de escritura, borrados, migraciones, deploy, merges ni cambios a cuentas por esta incidencia. Sigue pendiente reconciliación de `profiles=0` en DB hospedada. No repetir QA de Feed/Comunidades/Lugares anteriores: comprobar solo que termina splash → sesión/onboarding, F5 y perfil de DB.

## Versión duplicada en pantalla de bienvenida — 2026-10-10

- PO confirmó QA local PASS con instalación limpia `C:\\Users\\osori\\Downloads\\pazo-app-versionado`, rama `f14/beta-reporting-integration-20261009`, checkout `0541521` sin cambios locales. Se conserva carpeta antigua `pazo-visual-qa` como respaldo. No confundir este PASS general de la compilación anterior con QA visual del cambio nuevo.
- A solicitud del PO se reutiliza `pazoBuildVersion` también en **A01 Bienvenida** (`src/components/views/OnboardingView.tsx`), bajo los botones «Comenzar», «Ya tengo una cuenta» y «Demo»: texto visible `Versión 0.1.NNNNNNNN`, pequeño, gris suave, centrado y sin bordes. El número es exactamente la misma fuente dinámica del splash; no se cambia Git, backend, Auth, otros pasos de onboarding ni diseño de botones. Commit de código `ac74ecc6`.
- QA requerido solo del cambio afectado: actualizar con `git fetch` + `git pull --ff-only` desde la nueva carpeta limpia, reiniciar Vite, comprobar splash y **A01** con mismo número, y que sus botones siguen accesibles. No repetir suites de Feed/Comunidades/Lugares ya aprobadas. Se requiere CI de código antes de reportar build PASS.
- Mantener PR #37 DRAFT, no merge, Vercel ni operaciones Supabase. El anterior estado alojado `profiles=0` no fue revisado en esta tarea visual y no se declara resuelto por inferencia.

## Gate post-reset: login local + persistencia hosted confirmados — 2026-10-10

- **Confirmación explícita PO:** desde la instalación nueva y actualizada `pazo-app-versionado`, el splash ya no queda bloqueado; inició con su cuenta Auth existente, accedió sin errores reportados a PAZO y observó los apartados «Privacidad y reglas» / «Cuenta y datos». La captura muestra los accesos «Privacidad», «Reglas de uso» y «Solicitar eliminación de cuenta»; no demuestra envío de solicitud ni eliminación de cuenta.
- **Supabase alojado, SELECT read-only posterior al login:** `auth.users=6`, `public.profiles=1` (antes `0`), `public.pets=1`, `public.posts=0`, `storage.objects=1`, `profiles.is_founder=true=0`. Además, JOIN agregado `pets` → `profiles`: `pets_without_profile=0`, `pets_with_owner_profile=1`. La discrepancia previa **sí quedó resuelta para esta cuenta/mascota**, coherente con la RPC `pazo_ensure_my_profile()`; no extrapolar a las otras cinco cuentas no reconectadas.
- **Gate de splash/auth/perfil asociado a cuenta probada: PASS de PO + persistencia en base real.** CI de la rama y QA del footer A01 son pruebas separadas: el usuario confirmó navegación general pero no describió expresamente la versión A01 ni equivalencia de ambos números, por lo que no afirmar ese detalle visual comprobado.
- La UI A3 («Solicitar eliminación de cuenta») sigue siendo **intake/revisión**, NO ejecutor de borrado. Privacidad/reglas siguen en borrador pre-beta. NO se ha probado cierre de solicitud, eliminación real de datos o purga Storage/CDN; flags de F14 continúan OFF.
- **Acción siguiente:** no repetir login, splash, creación de mascota, Feed/Comunidades/Lugares históricamente aprobados. Continuar con un único lote P0 de lanzamiento: plan mínimo y gate explícito para eliminación segura de cuenta/medios y conciliación de políticas públicas, sin reactivar PR #38 completo ni ejecutar drafts/migraciones por inercia. Mantener PR #37 DRAFT, sin Vercel, main/merge, SQL de escritura ni costos.
