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

## Siguiente paso

1. validación visual/end-to-end real desde la app;
2. comprobar upload y DELETE mediante Storage API;
3. corregir cualquier regresión;
4. decidir limpieza de señales antiguas de validación;
5. pasar PR #18 de draft a ready;
6. merge;
7. actualizar roadmap/handoff y marcar COMPLETADA solo después del merge.
