# PAZO — Reglas permanentes para agentes

**Project Brain OS version: 1.4.0**
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
20. Antes de ejecutar una instrucción, clasificarla como **Implementación**, **Regla permanente de PAZO**, **Mejora de Brain OS** o **Handoff**. No convertir instrucciones temporales en reglas permanentes ni modificar una política fundamental ambigua sin autorización del Product Owner.
21. Las reglas específicas de PAZO permanecen en este repositorio. Una mejora reutilizable e independiente puede proponerse para `DigitalAppcorp/project-brain-os`, pero no debe copiar detalles exclusivos de PAZO ni modificar el repositorio separado sin revisión y autorización explícita.
22. Codex/local es el responsable técnico principal por defecto. ChatGPT normal puede actuar como respaldo, pero ambos deben continuar desde Git, `docs/PAZO_ACTIVE_HANDOFF.md` y los documentos canónicos; la memoria de una conversación nunca es fuente única de verdad.
23. Después de cada hito importante o antes de transferir el trabajo, actualizar `docs/PAZO_ACTIVE_HANDOFF.md` con rama/HEAD/upstream, cambios locales pendientes, decisiones aprobadas, pruebas ejecutadas, estado de backend/deploy y siguiente paso exacto. No sobrescribir ni adjudicarse cambios locales sin confirmar su procedencia.
24. Ningún agente puede ejecutar migraciones remotas, mutar producción, hacer push, merge o deploy sin autorización explícita y vigente del Product Owner para esa acción concreta.

`docs/PAZO_ACTIVE_HANDOFF.md` define el estado operativo actual. La hoja maestra define el estado global. `docs/PAZO_MODULE_LIFECYCLE.md` define cómo una idea llega a implementación. `docs/PAZO_ARCHITECTURE_CONTRACT.md` gobierna ownership/ubicación del código. `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` gobierna datos/tracking/privacidad. `docs/PAZO_DATA_INVENTORY.md` registra categorías y terceros conocidos. Las sub-rutas gobiernan el módulo específico.


## Local-first operating mode — active

25. Durante el desarrollo activo de PAZO, trabajar **local-first**:
   - implementación, runtime, build y backend local por defecto;
   - no usar Vercel Preview/Production por cada cambio;
   - no hacer merges/pushes por microcambios;
   - producción solo por excepción o en release gate.
26. Distinguir siempre cinco estados: working tree local, local HEAD, remote feature branch, `main` y producción. Nunca asumir que son iguales.
27. Usar un único gate local de verificación para el ciclo diario:
   - `npm run verify` = governance + build;
   - lint legacy queda fuera del bloqueo diario hasta su limpieza específica.
28. Para ahorrar tokens, pedir al Product Owner solo `verify PASS` o el primer error útil; no solicitar logs completos salvo necesidad.
29. Supabase diario debe correr localmente. En comandos destructivos usar `--local` explícitamente cuando aplique. No ejecutar `db reset --linked`, `db push` ni `migration repair` contra producción durante desarrollo normal.
30. El baseline local actual NO equivale automáticamente a una migración de producción. Antes del lanzamiento debe hacerse reconciliación formal de migraciones local/remoto/producción.
31. Vercel y demás providers se reactivan en lote en Release Candidate, salvo integración que no pueda verificarse localmente.
32. Si existe trabajo local no empujado, el handoff debe decirlo explícitamente y el siguiente chat debe empezar auditando `git status --short` + `git log -1 --oneline` antes de asumir el estado.

## Modo temporal MVP: hosted-first — decisión PO 2026-10-08

Esta decisión temporal del Product Owner **sustituye los puntos 25–31 que imponen local-first**, solamente para el ciclo de construcción y prueba del MVP anterior al lanzamiento oficial. El Product Owner prefiere que el ejecutor haga el trabajo directamente mediante los conectores GitHub/Supabase/Vercel, sin descargas, PowerShell ni copia manual por hito.

- El carril de implementación es **hosted-first** y de acceso controlado: cambios versionados en rama GitHub, verificación de build/seguridad, migraciones aprobadas en Supabase PAZO y deploy al proyecto autorizado de Vercel. No declarar una funcionalidad implementada hasta comprobar UI y backend. Usar previews solo para pruebas; NO equivalen a publicación oficial.
- Toda modificación remota, push/merge/deploy, SQL de producción, costos o eliminación de datos exige autorización explícita del Product Owner para el alcance vigente; esta decisión de proceso no constituye permiso ilimitado para fases posteriores.
- Cualquier prueba con datos de producción deberá identificar sus registros y plan de eliminación antes del lanzamiento oficial. No borrar a ciegas datos de otros usuarios; considerar retención de copias/logs y terceros. Las reglas de privacidad y F14 siguen vigentes.
- Priorizar acciones directas de los conectores. Si una conexión impide un paso con 403, DETENER; no cambiar de proyecto, reescribir `main` ni omitir controles. Pedir reconexión del equipo correcto en lugar de volver al ciclo manual.
- La historia de migraciones del repo y la aplicada en Supabase no coincide por completo: registrar el vínculo de cada migración aplicada y reconciliar antes del lanzamiento. No usar migraciones locales retrospectivas para sobrescribir producción.
- Después del lanzamiento oficial, reevaluar y restaurar el modo local de desarrollo conforme al Product Owner; no asumir que los datos de prueba de backups/proveedores desaparecen en el acto.
