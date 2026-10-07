# PAZO — Estado activo de Comunidades

**Fecha:** 2026-10-06
**Rama:** `feat/communities-mvp`
**Gate:** 8 — IMPLEMENTACIÓN EN PREPARACIÓN
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
- backend real de Comunidades todavía no aplicado.

## Siguiente paso

1. preparar migración Communities MVP;
2. implementar frontend/servicio;
3. build local;
4. revisar SQL/diff;
5. pedir autorización explícita antes de aplicar Supabase;
6. pruebas RLS/ownership/storage;
7. validación visual;
8. PR + merge.
