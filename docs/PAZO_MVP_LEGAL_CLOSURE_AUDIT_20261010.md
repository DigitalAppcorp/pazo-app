# PAZO MVP — auditoría de cierre legal independiente (2026-10-10)

**Estado:** gate EN CURSO / evidencia documental, no aprobación de lanzamiento.
**Rama:** `release/mvp-beta-fast-track-20261010`.
**Alcance:** solo lectura de repositorios y preparación legal-operativa. No se consultaron ni mutaron registros de usuarios o Storage; no se tocó Supabase, Vercel, main ni A3.

## Evidencia verificada en el RC

- Project Brain OS `v1.4.1` leído desde `DigitalAppcorp/project-brain-os/SKILL.md`; `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, roadmap y gate de release revisados en RC.
- HEAD remoto inicial `e497c794b47b9d71c04b0132dfdb47247c90b3bc`, 187 commits delante de `main` y 0 detrás al comparar. La CI #626 figura SUCCESS en el handoff para un SHA anterior. La consulta de Actions del HEAD actual no devolvió runs (el endpoint conectado solo lista ejecuciones PR asociadas); **CI del HEAD no certificada**. Los checks externos de Vercel reportan un límite de builds: fuera de alcance; no confundir con fallo de test npm.
- `src/features/legal/legalCopy.ts`: textos ES/EN presentes; `LEGAL_RELEASE_READY=false`; operador Alvarado Solutions LLC y California declarados por PO, no verificados en registro independiente; email público `appdigital.corp@gmail.com`.
- `docs/PAZO_DATA_INVENTORY.md`: datos de Auth, mascotas, UGC, comunidades, mapas/check-ins, rescate, cuidados, documentos, telemetría, soporte y proveedores inventariados. Mapbox activo; PostHog condicionado a configuración; PayPal desactivado para checkout; retención de Vercel no verificada.
- `docs/PAZO_MVP_RETENTION_MATRIX_DRAFT_20261010.md`: criterios propuestos por categoría; **ningún TTL, borrado automático ni ventana de backups verificados**. Esta matriz NO debe presentarse como política vigente.
- Intake de solicitud instalado según handoff; borrado manual E2E de QA no probado, reservado exclusivamente a Codex mediante `docs/PAZO_CODEX_PENDING_QA_20261010.md`. No activar el botón en release público ni prometer eliminación ejecutada.

## Brechas accionables, sin crear módulos nuevos

| Gate | Estado comprobado | Criterio preciso para cerrar |
|---|---|---|
| Categorías/finalidades/terceros | Inventario + previews ES/EN existen | Reconciliar texto final contra configuración real de Supabase, Mapbox, PostHog y correo, distinguiendo activos, condicionales y desactivados |
| Conservación de DB y Storage | Matriz borrador, criterios cualitativos | Verificar excepciones de moderación/terceros y documentar criterios de conservación que el operador puede cumplir; no inventar fechas |
| Backups, CDN, logs de proveedor | Sin ventanas verificadas | Consultar ajustes/documentación contractual vigente; explicar límites comprobados sin prometer purga instantánea |
| Contacto y solicitudes | Correo aprobado; intake disponible según flags | Definir respuesta humana, verificación de titularidad, seguimiento y escalamiento; Codex aporta exclusivamente PASS/FAIL de baja descartable |
| Avisos ES/EN | Borradores bilingües en código | Validar DNT, terceros con posible recopilación técnica, mecanismo real de cambios y visibilidad de enlaces antes de fecha efectiva |
| Fecha efectiva y publicación | No publicada | Asignar fecha real **al activar una política definitiva**; no publicar borrador ni cambiar `LEGAL_RELEASE_READY` sin evidencia |
| Moderación y menores | Reglas internas, 1 moderador DB según handoff | Documentar atención de denuncias/copyright y reportes de menores con procedimiento ejecutable; no afirmar QA E2E UI si no existe |
| Release y CI | #626 PASS histórico, HEAD nuevo | Verificar GitHub Actions correspondiente al SHA que finalmente vaya a release; mantener fallo Vercel fuera de este carril |

## Orden de ejecución de cierre

1. Completar reconciliación de textos ES/EN con prácticas demostradas **sin habilitar ningún flag** ni alterar Auth/Feed/otras funciones aceptadas.
2. Dejar lista la operativa mínima de recepción, triage, protección de datos y respuesta por correo; no copiar reportes sensibles a GitHub.
3. Incorporar únicamente el resultado verificable que entregue Codex, sin repetir ni competir con su prueba.
4. Certificar CI del SHA definitivo, efectuar la revisión legal proporcional y elevar al Product Owner un gate explícito de beta. **Sin merge, Vercel ni fecha efectiva antes de aprobación.**

## Límites y no-claims

No declarar `LEGAL_RELEASE_READY=true`; no prometer plazos numéricos no auditados, revocación automática de cuentas, supresión de backups/cachés/CDN ni aplicación o exención de CCPA/CPRA sin análisis. Esta auditoría no equivale a asesoría jurídica ni a validación operativa externa.
