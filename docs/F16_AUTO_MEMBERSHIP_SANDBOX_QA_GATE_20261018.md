# PAZO F16 — Cambio automático oferta ↔ panel Amigo de PAZO · QA Sandbox
**Fecha:** 2026-10-18 · **PO:** «ok go» para implementar el comportamiento previamente aprobado, en PR #44 DRAFT.

## Contrato de producto — ratificado, no redefinido
- Todas las cuentas Supabase Auth **confirmadas** pueden ensayar el checkout en Vite local Sandbox sin altas QA manuales. Esta admisión automática ya existe en Edge v16 + `f16_qa_v2_auto_admit_local_sandbox_owner`, al consentir `begin`, con excepciones por permisos previamente denegados o intentos pendientes que deben conciliarse. Una cuenta no recibe beneficios por pertenecer a QA.
- **Sin período pagado verificado:** botón «Amigo de PAZO» -> oferta voluntaria de US$2.99 mensuales (Sandbox en desarrollo local), con consentimiento y PayPal.
- **Período pagado y no revertido:** el MISMO botón cambia aspecto y abre `SupporterBenefitsHome` (insignia, fondos, muro opt-in, hitos y administración). No pedir intervención ni permisos por cuenta después del pago; no inferir membresía por `ACTIVE`, callback, browser event ni flag de build.
- El usuario puede no tener mascotas al comprar; la membresía pertenece al propietario Auth. Los cosméticos por mascota esperan a que exista mascota propia.
- Cuenta con `APPROVAL_PENDING`, sin pago o intento ambiguo: conserva controles de revisión/recuperación, nunca recibe beneficios ni crea segundo intento inseguro.

## Cambios en rama, no en Live
1. `src/features/supporter/supporterUiRelease.ts`: entorno de presentación QA exclusivamente `import.meta.env.DEV && VITE_PAZO_F16_SANDBOX_QA_UI==='true' && loopback`. El flag de publicación `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED` sigue siendo independiente para releases futuros. Esta variable solo cambia visibilidad de los controles; los permisos son decisiones del servidor. Consumen la política Hook de membresía, Feed, perfil social, fondos y muro público.
2. `SandboxV2AccountPanel.tsx`: después de un `resume_approval` owner-bound con estado PayPal `ACTIVE`, inicia UNA comprobación del primer ciclo de la suscripción EXISTENTE mediante `verify_payment` (no `begin`, no segunda suscripción). Solo al recibir período verificado por merchant y respuesta `verified_first_sandbox_cycle / cycleVerified / mayGrantBenefits / paidThrough` avisa al padre y emite evento sin PII, que hace RE-LECTURA Supabase. Estado de aprobación antiguo no permanece visible después de verificación.
3. `useSupporterMembershipStatus.ts`: reconsulta al volver a la pestaña o tras evento local de pago confirmado, conservando fail-closed. `PetView` enseña la cifra US$2.99 a cuentas sin membresía y presentación decorada a las pagadas.
4. Para cuentas **sin mascota**, se preparó `supabase/migrations/20261018213000_f16_sandbox_qa_owner_membership_read.sql`: RPC `public.pazo_supporter_my_account_status()`, autenticada, sin parámetros ni PII, únicamente `{active,milestone}`. Lee proyección privada que exige QA owner enabled y períodos merchant-verificados no revertidos. Niega ejecución a anon/service_role, sin DML, sin petición de PayPal, sin elevar privileges de las tablas. En el Hook se usa solo cuando el propietario no tiene mascota.
5. Tests de integración estructural (sin checkout real) actualizados/añadidos; CI y laboratorios cuentan como código validado, **no** equivalen a E2E de navegador.

## Alcance de comprobación, riesgos y próximo gate
- Snapshot READ ONLY previo: **8 cuentas Auth confirmadas**, 5 de ellas sin mascotas, 2 inscritos en QA, 1 período pagado Sandbox vigente. No conceder derechos ni permitir pagos duplicados a las demás.
- **MIGRACIÓN NO APLICADA**, conforme AGENTS.md: se requiere GO explícito separado para aplicar **solo** la función de lectura propuesta en Supabase. Por el momento, el acceso de cuentas sin mascotas falla cerrado si falta RPC. Las cuentas con mascotas usan el mecanismo vigente de lectura verificada.
- **Front-end tampoco publicado en Live/Vercel/main**; PR #44 sigue DRAFT. No cambiamos el Edge ya alojado v16, ni la función webhook, ni dinero. Se necesita sincronizar Vite local después de pasar CI para ver el comportamiento.
- **Pendiente UX HTTPS:** PayPal Sandbox aún vuelve a un preview Vercel protegido. El nuevo flujo revalida al reabrir/focalizar PAZO local, pero no resuelve por sí solo la redirección de PayPal a un origen público estable. Requiere solución de retorno HTTPS y prueba de navegador antes de Live.
- E2E posterior: una cuenta pagada debe abrir beneficios sin pago adicional; cuenta gratuita debe ver oferta de US$2.99; cuenta con checkout pendiente debe ver revisión sin beneficios; una cuenta sin mascotas puede comprar/administrar, pero no personalizar hasta crear una mascota; recarga/relogin; pruebas visuales del muro, fondos, badges y cancelación.
- Sigue pendiente ubicación exacta de mini-insignia sobre el avatar (código anterior la dibuja junto al nombre), no ocultarlo ni declararlo aprobado.

**Gate:** `F16_AUTO_MEMBER_SWITCH_BRANCH_IMPLEMENTED_OWNER_RPC_DEPLOY_GO_PENDING_E2E_PENDING_LIVE_OFF`.

## Corrección complementaria del lanzador local
El script `scripts/f16-run-real-sandbox-qa.ps1` se ajustó para iniciar `VITE_PAZO_F16_SANDBOX_QA_UI=true` con `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED=false`. La presentación de los beneficios QA se permite por `import.meta.env.DEV + loopback + flag QA`, siempre leyendo la cobertura real de Supabase. No se requiere publicar, activar o editar manualmente el flag global de beneficios después de un pago; el script no concede privilegios.


## Postflight autorizado: lectura owner-only instalada
PO autorizó explícitamente «sí» aplicar solamente la nueva función de lectura. Supabase `mrybvqdebbgcayuvgkkr`, mismo proyecto PAZO con rutas aisladas Sandbox; no se instaló una base nueva ni se tocó checkout.
- Preflight SQL: `current_database()=postgres`, RPC `pazo_supporter_my_account_status()` ausente, proyección privada y RPC mascota presentes, y migración de nombre aún no instalada. PR #44 `f13/section-titles-20261012` DRAFT, no merged. Migración canónica leída de GitHub sin modificaciones: `20261018213000_f16_sandbox_qa_owner_membership_read.sql`.
- `apply_migration` ejecutó **solo** `f16_sandbox_qa_owner_membership_read` y devolvió `success=true`. Versión efectiva asignada por Supabase a la migración: **`20261018184603`** (el nombre conserva el archivo fuente canónico con fecha de edición distinta).
- Catálogo postflight: `public.pazo_supporter_my_account_status()` existe; `SECURITY DEFINER`, owner `postgres`, `search_path=''`, parámetros **ninguno**, retorno jsonb, `auth.uid()` y `supporter_private.f16_sandbox_qa_projection` presentes. EXECUTE: `anon=false`, `authenticated=true`, `service_role=false`.
- Cobertura financiera pre/post idéntica: `paid_periods=1`, `holds=0`, `enabled_qa_owners=2`, `saved_themes=0`, `wall_consents=0`, `legacy_payment_entries=0`, `pending_sale_events=4`. La migración solo creó una RPC, sin tocar ventas, renovaciones, consentimientos, perfiles ni Live.
- **Estado operativo:** la lectura de cuenta sin mascota está instalada pero **no hay E2E autenticado en Vite todavía**. Para probar, sincronizar el PR #44 en Antigravity con `git status --short`, `git pull --ff-only` si está limpio; ejecutar `./scripts/f16-run-real-sandbox-qa.ps1` en PowerShell desde raíz con Vite local. Evaluar cuenta pagada, gratis, sin mascota y pendiente, sin comprar nuevamente en la cuenta pagadora ni cambiar flags financieros. El retorno de PayPal a Vercel protegido todavía exige QA específica antes de Live.
**Gate:** `F16_QA_OWNER_ACCOUNT_READ_RPC_INSTALLED_ACL_PASS_FINANCIAL_ZERO_CHANGE_WAIT_BROWSER_E2E`.
