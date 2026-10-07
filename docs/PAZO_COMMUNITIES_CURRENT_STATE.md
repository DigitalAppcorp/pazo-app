# PAZO — Estado activo de Comunidades

**Fecha:** 2026-10-06
**Rama:** `feat/communities-mvp`
**Gate:** 8 CERRADO — COMPLETADA
**Decisión:** MVP reducido real — MERGED TO MAIN

## Regla vigente

Comunidades se construirá como un núcleo funcional usable dentro del MVP.

No volver al fake door de módulo completo salvo decisión explícita del Product Owner.

La validación se utilizará para extensiones avanzadas dentro del módulo real.

## Fuentes actuales

- `docs/PAZO_PHASE_7_COMMUNITIES_MASTER.md`
- `docs/PAZO_PHASE_7_COMMUNITIES_MVP_SPEC.md`
- `docs/PAZO_PHASE_7_COMMUNITIES_ARCHITECTURE.md`

## Gates

- Gate 6 — producto: CERRADO / aprobado por Product Owner.
- Gate 7 — arquitectura técnica: CERRADO.
- Gate 8 — implementación: EN PREPARACIÓN.

## Decisiones de arquitectura

- membership por cuenta;
- display pet para representar al miembro;
- contenido por mascota activa;
- tablas sociales separadas del Feed global;
- posts de Comunidad no entran al Feed/perfil general automáticamente;
- comunidades públicas en MVP;
- un Owner principal;
- administración/moderación básica;
- buckets de media separados;
- RLS/grants mínimos;
- ninguna nueva función pública SECURITY DEFINER.

## Estado técnico heredado

- PR #16 cerrado sin merge.
- PR #17 sincronizó a main las migraciones de validación ya aplicadas.
- instrumentación genérica disponible para extensiones futuras.
- legacy validation signals were cleaned with explicit Product Owner authorization.
- backend real de Comunidades APLICADO.
- migración registrada en Supabase: `20261007014214 communities_mvp_core`.
- fix forward-only de Storage registrado: `20261007014624 fix_community_storage_policies`.
- RLS/ownership/counters probados con dos/tres cuentas reales dentro de transacciones con `ROLLBACK`.
- Storage INSERT policies probadas: owner avatar, member post media, foreign path denied, removed-member denied.
- Storage DELETE directo no puede probarse por SQL porque Supabase lo bloquea mediante `storage.protect_delete()`; debe validarse desde la Storage API/UI.
- Security Advisor sin findings nuevos atribuibles a Comunidades.
- legacy validation signals: 0 views / 0 interests / 0 intents.

## Validación end-to-end

- Visual/end-to-end real desde la app: PASS.
- Community image upload/change via Storage API: PASS.
- Community post image upload/delete via Storage API: PASS.
- persistence after F5: PASS.
- Join/participation/member removal flow: PASS.
- Product Owner confirmed expected behavior.

## Community extension experiments

**Status:** APPLIED / VALIDATED / PRODUCT OWNER APPROVED.

Active experiments:
- `communities_events`;
- `communities_challenges`;
- `communities_badges`;
- `communities_qa`;
- `communities_admin_tools` (Owner/Admin only).

Registry:
- `20261007023800 community_extension_experiments`;
- `20261007023927 harden_community_extension_experiment_eligibility`.

Validation:
- view dedupe per session: PASS;
- interest unique per account+experiment: PASS;
- member general-extension eligibility: PASS;
- Owner general + admin-tools eligibility: PASS;
- normal member admin-tools: BLOCKED;
- outsider extension view/interest: BLOCKED;
- transactional tests rolled back; real extension evidence begins only from Product Owner UI usage;
- Security Advisor: no new findings attributable to experiment layer.

## Product Owner fake-door review

- Fake-door visual review: PASS.
- Interest persistence behavior accepted.
- Owner/Admin visibility rule accepted.
- Community core + contextual extension layer are both approved for final closure.

## Final cleanup

- Legacy validation cleanup: COMPLETE.
- Removed only:
  - 2 `module_validation_views` rows for `module_key='communities'`;
  - 1 `module_validation_interests` row for `module_key='communities'`.
- Preserved current extension evidence:
  - 5 views;
  - 1 interest;
  - all under `communities_*`.

## Cierre

- PR #18 merged to `main`.
- Merge commit: `169b9a47453de0653a3aba27338ea80cd046e0d6`.
- Gate 8 closed.
- Next active area: Fase 8 — Lugares, mapa y Check-ins.
