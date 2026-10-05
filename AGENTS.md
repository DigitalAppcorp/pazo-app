# PAZO — Reglas permanentes para agentes

Antes de cualquier modificación de código, base de datos, arquitectura o documentación de producto:

1. Leer `docs/PAZO_MASTER_ROADMAP.md`.
2. Trabajar únicamente en la fase marcada como **SIGUIENTE** o **EN CURSO**.
3. No inventar decisiones marcadas como **DECISIÓN PENDIENTE**.
4. No saltar fases sin aprobación explícita del Product Owner.
5. Para Supabase: auditar primero, versionar la migración, pedir autorización antes de aplicarla y verificar después.
6. No declarar una fase COMPLETADA hasta que esté merged en `main`, el backend correspondiente esté aplicado y las pruebas hayan sido aprobadas.
7. Después de cerrar una fase, actualizar `docs/PAZO_MASTER_ROADMAP.md`.
8. En fases de rediseño visual, preservar la funcionalidad y los contratos de datos existentes; cualquier cambio de comportamiento requiere aprobación explícita del Product Owner.
9. Si la fase activa tiene una sub-ruta maestra en `docs/`, leerla completa antes de modificar código, datos o arquitectura de esa fase. La sub-ruta gobierna las decisiones específicas y no puede contradecir la hoja maestra general.

La hoja maestra es la fuente canónica del estado y orden de desarrollo de PAZO.
