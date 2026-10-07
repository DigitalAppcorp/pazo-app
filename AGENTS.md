# PAZO — Reglas permanentes para agentes

**Project Brain OS version: 1.3.0**  
Canonical OS: `DigitalAppcorp/project-brain-os`.

Antes de cualquier modificación de código, base de datos, arquitectura o documentación de producto:

1. Leer `docs/PAZO_ACTIVE_HANDOFF.md`.
2. Leer `docs/PAZO_MASTER_ROADMAP.md`.
3. Trabajar únicamente en la fase marcada como **SIGUIENTE** o **EN CURSO**.
4. No inventar decisiones marcadas como **DECISIÓN PENDIENTE**.
5. No saltar fases sin aprobación explícita del Product Owner.
6. Para Supabase: auditar primero, versionar la migración, pedir autorización antes de aplicarla y verificar después.
7. No declarar una fase COMPLETADA hasta que esté merged en `main`, el backend correspondiente esté aplicado, las pruebas hayan sido aprobadas y se haya ejecutado **Scope Closure Reconciliation** contra todo el scope/DoD aprobado.
8. Después de cerrar una fase, actualizar `docs/PAZO_MASTER_ROADMAP.md` y `docs/PAZO_ACTIVE_HANDOFF.md`.
9. En fases de rediseño visual, preservar la funcionalidad y los contratos de datos existentes; cualquier cambio de comportamiento requiere aprobación explícita del Product Owner.
10. Si la fase activa tiene una sub-ruta maestra en `docs/`, leerla completa antes de modificar código, datos o arquitectura de esa fase. La sub-ruta gobierna las decisiones específicas y no puede contradecir la hoja maestra general.
11. Antes de diseñar o programar un módulo nuevo/incompleto, leer `docs/PAZO_MODULE_LIFECYCLE.md` y continuar desde el gate pendiente. Para experimentos/fake doors, además leer `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.
12. Si existe un PR abierto para la fase activa, auditar ese PR y su branch antes de asumir que `main` contiene el estado más reciente.
13. Build/backend PASS no implica aprobación visual. La aprobación del Product Owner cubre únicamente lo que realmente vio/probó.
14. Fake doors, modelos 3D, assets visuales, instrumentación y estados UX cuentan como entregables reales cuando fueron incluidos en el scope aprobado; no convertirlos silenciosamente en trabajo futuro.
15. Ningún agente puede crear recursos pagados, subir de plan, habilitar add-ons facturables, aumentar límites de gasto o activar infraestructura con costo recurrente/por uso sin autorización explícita del Product Owner. Antes debe indicar proveedor, motivo, costo conocido o variable y alternativa gratuita/actual.
16. La arquitectura de código nuevo se rige por `docs/PAZO_ARCHITECTURE_CONTRACT.md`: nuevas funcionalidades de dominio deben vivir bajo `src/features/<domain>/` por defecto. No añadir nuevos services/views/modals de dominio a carpetas globales legacy sin justificar y actualizar conscientemente el contrato/baseline.
17. Cualquier cambio que recolecte, registre, envíe, publique o comparta datos del usuario debe leer y cumplir `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` y mantener actualizado `docs/PAZO_DATA_INVENTORY.md`. Session replay, autocapture indiscriminado, GPS exacto en analytics, contenido de mensajes/posts/documentos y datos de pago están prohibidos por defecto.
18. Privacy Policy/Terms públicos no pueden afirmar prácticas que el producto todavía no cumple. Antes de Beta pública deben reconciliarse contra implementación real, proveedores, retención y flujos de eliminación.
19. No recolectar fecha de nacimiento, ID u otra prueba de edad solo por comodidad. PAZO es 18+; cualquier age-assurance adicional requiere decisión de producto/privacidad y minimización de datos.

`docs/PAZO_ACTIVE_HANDOFF.md` define el estado operativo actual. La hoja maestra define el estado global. `docs/PAZO_MODULE_LIFECYCLE.md` define cómo una idea llega a implementación. `docs/PAZO_ARCHITECTURE_CONTRACT.md` gobierna ownership/ubicación del código. `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` gobierna datos/tracking/privacidad. `docs/PAZO_DATA_INVENTORY.md` registra categorías y terceros conocidos. Las sub-rutas gobiernan el módulo específico.
