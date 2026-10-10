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
