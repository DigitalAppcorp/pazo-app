# PAZO — Estado activo de Comunidades

**Fecha:** 2026-10-06
**Rama:** `feat/communities-mvp`
**Gate:** 8 — IMPLEMENTACIÓN / VALIDACIÓN END-TO-END
**Decisión:** MVP reducido real

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
- existen 2 views + 1 interest de Communities provenientes de pruebas; deben limpiarse antes de medición real con autorización.
- backend real de Comunidades APLICADO.
- migración registrada en Supabase: `20261007014214 communities_mvp_core`.
- fix forward-only de Storage registrado: `20261007014624 fix_community_storage_policies`.
- RLS/ownership/counters probados con dos/tres cuentas reales dentro de transacciones con `ROLLBACK`.
- Storage INSERT policies probadas: owner avatar, member post media, foreign path denied, removed-member denied.
- Storage DELETE directo no puede probarse por SQL porque Supabase lo bloquea mediante `storage.protect_delete()`; debe validarse desde la Storage API/UI.
- Security Advisor sin findings nuevos atribuibles a Comunidades.
- señales antiguas de validación (2 views, 1 interest, 0 intents) siguen intactas; no se han borrado.

## Validación end-to-end

- Visual/end-to-end real desde la app: PASS.
- Community image upload/change via Storage API: PASS.
- Community post image upload/delete via Storage API: PASS.
- persistence after F5: PASS.
- Join/participation/member removal flow: PASS.
- Product Owner confirmed expected behavior.

## Community extension experiments

**Status:** BACKEND APPLIED / pending Product Owner visual review.

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
- tests rolled back; extension signal tables remain at 0 before Product Owner UI test;
- Security Advisor: no new findings attributable to experiment layer.

## Product Owner fake-door review

- Fake-door visual review: PASS.
- Interest persistence behavior accepted.
- Owner/Admin visibility rule accepted.
- Community core + contextual extension layer are both approved for final closure.

## Siguiente paso

1. Product Owner visually validates contextual fake doors;
2. verify real interest persists after F5;
3. verify Owner sees Admin Tools and normal member does not;
4. decide cleanup of old validation test signals;
5. final review of PR #18;
6. merge;
7. verify main and close Gate 8.
