# PAZO — Reglas permanentes para agentes

Antes de cualquier modificación de código, base de datos, arquitectura o documentación de producto:

1. Leer `docs/PAZO_PROJECT_BRAIN_OS.md`.
2. Leer `docs/PAZO_ACTIVE_HANDOFF.md`.
3. Leer `docs/PAZO_MASTER_ROADMAP.md`.
4. Trabajar únicamente en la fase marcada como **SIGUIENTE** o **EN CURSO**.
5. No inventar decisiones marcadas como **DECISIÓN PENDIENTE**.
6. No saltar fases sin aprobación explícita del Product Owner.
7. Para Supabase: auditar primero, versionar la migración, pedir autorización antes de aplicarla y verificar después.
8. No declarar una fase COMPLETADA hasta que esté merged en `main`, el backend correspondiente esté aplicado y las pruebas hayan sido aprobadas.
9. Después de cerrar una fase, actualizar `docs/PAZO_MASTER_ROADMAP.md` y `docs/PAZO_ACTIVE_HANDOFF.md`.
10. En fases de rediseño visual, preservar la funcionalidad y los contratos de datos existentes; cualquier cambio de comportamiento requiere aprobación explícita del Product Owner.
11. Si la fase activa tiene una sub-ruta maestra en `docs/`, leerla completa antes de modificar código, datos o arquitectura de esa fase. La sub-ruta gobierna las decisiones específicas y no puede contradecir la hoja maestra general.
12. Antes de diseñar o programar un módulo nuevo/incompleto, leer `docs/PAZO_MODULE_LIFECYCLE.md` y continuar desde el gate pendiente. Para experimentos/fake doors, además leer `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.
13. ChatGPT / AI Project Brain es el ejecutor técnico principal: audita, diseña, implementa y mantiene código, GitHub, Supabase, migraciones, seguridad, pruebas, documentación y PR/merge cuando el gate lo permite.
14. No delegar programación, debugging, arquitectura ni implementación a Gemini, Claude, Copilot u otro asistente como parte normal del flujo. Solo usar otro asistente si el Product Owner lo pide explícitamente para una tarea concreta.
15. Antigravity es el entorno local del Product Owner para ejecutar comandos y revisar la app; no es el responsable de programación. Cuando una verificación local sea necesaria, ChatGPT entrega comandos exactos y el Product Owner devuelve el resultado.
16. No pedir al Product Owner que copie código o prompts entre asistentes si ChatGPT puede hacer el trabajo directamente mediante GitHub/Supabase o sus herramientas conectadas.

`docs/PAZO_PROJECT_BRAIN_OS.md` define el modelo operativo. `docs/PAZO_ACTIVE_HANDOFF.md` define el estado operativo actual. La hoja maestra define el estado global. `docs/PAZO_MODULE_LIFECYCLE.md` define cómo una idea llega a implementación. Las sub-rutas gobiernan el módulo específico.
