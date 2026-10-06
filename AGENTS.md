# PAZO — Reglas permanentes para agentes

Antes de cualquier modificación de código, base de datos, arquitectura o documentación de producto:

1. Leer `docs/PAZO_ACTIVE_HANDOFF.md`.
2. Leer `docs/PAZO_MASTER_ROADMAP.md`.
3. Trabajar únicamente en la fase marcada como **SIGUIENTE** o **EN CURSO**.
4. No inventar decisiones marcadas como **DECISIÓN PENDIENTE**.
5. No saltar fases sin aprobación explícita del Product Owner.
6. Para Supabase: auditar primero, versionar la migración, pedir autorización antes de aplicarla y verificar después.
7. No declarar una fase COMPLETADA hasta que esté merged en `main`, el backend correspondiente esté aplicado y las pruebas hayan sido aprobadas.
8. Después de cerrar una fase, actualizar `docs/PAZO_MASTER_ROADMAP.md` y `docs/PAZO_ACTIVE_HANDOFF.md`.
9. En fases de rediseño visual, preservar la funcionalidad y los contratos de datos existentes; cualquier cambio de comportamiento requiere aprobación explícita del Product Owner.
10. Si la fase activa tiene una sub-ruta maestra en `docs/`, leerla completa antes de modificar código, datos o arquitectura de esa fase. La sub-ruta gobierna las decisiones específicas y no puede contradecir la hoja maestra general.
11. Antes de diseñar o programar un módulo nuevo/incompleto, leer `docs/PAZO_MODULE_LIFECYCLE.md` y continuar desde el gate pendiente. Para experimentos/fake doors, además leer `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.

`docs/PAZO_ACTIVE_HANDOFF.md` define el estado operativo actual. La hoja maestra define el estado global. `docs/PAZO_MODULE_LIFECYCLE.md` define cómo una idea llega a implementación. Las sub-rutas gobiernan el módulo específico.
