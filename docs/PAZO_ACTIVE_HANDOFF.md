# PAZO — Handoff activo (resumen verificable)

> **Solo estado operativo.** El historial íntegro previo a esta compactación está en [docs/history/PAZO_ACTIVE_HANDOFF_PRE_COMPACTION_20261106.md](history/PAZO_ACTIVE_HANDOFF_PRE_COMPACTION_20261106.md). Las entradas históricas, incluso si dicen «ACTUAL», «GO» o «pendiente», NO son órdenes vigentes sin revalidar.

## Corte y límites de la verificación

- **Revisión:** 2026-11-06. Fuente comprobada: **GitHub**, rama `main` y PR abiertos, mediante lectura remota. Sin escrituras de backend ni despliegues.
- **HEAD de `main` observado:** `3cc9d54898e484329a7013badf0f877336212d3f` (commit `feat(auth): one-time email confirmation reminder`, 2026-11-06 09:54 UTC). Este SHA es un corte documental, no un identificador de producción.
- **No verificado en este corte:** CI del SHA exacto, HEAD local o cambios no publicados de Claude/Codex, Supabase hospedado (migraciones/flags/Edge/crons/datos), estado actual de Vercel, entrega real de correos y push, sesión real de usuario, resultados de anuncios. **No inferir PASS ni despliegue de un merge/commit.**
- **Precaución:** Claude puede disponer de `continuidad/ESTADO.md` en el equipo del Product Owner; no está verificado aquí. Reconciliarlo con GitHub y los proveedores antes de reanudar tareas.

## Estado de trabajo respaldado por GitHub

| Frente | Evidencia remota observada | Implicación para el siguiente agente |
| --- | --- | --- |
| Reactivación de usuarios | [PR #212](https://github.com/DigitalAppcorp/pazo-app/pull/212) **MERGED** el 2026-11-06: oferta de push tras primera mascota, barra de registro y aviso de spam; el último `main` agrega código para un recordatorio de confirmación a las 24 h. | Implementado/integrado en código, **no demostrado como publicado o observado en un teléfono/correo real** en esta auditoría. No repetir estas funciones sin inspección. |
| Hoja de ruta de reactivación | [PR #211](https://github.com/DigitalAppcorp/pazo-app/pull/211) **ABIERTO**: `docs/reatraccion/HOJA_DE_RUTA_REATRACCION_20261106.md` existe en su rama, NO en `main` al momento del corte. El texto todavía describe #212 como «sin publicar» y el recordatorio como propuesta. | Su matriz necesita reconciliación con `main`, autorización de despliegue y evidencia de proveedor. No tratar sus estados como actualidad confirmada. |
| Transición legal | [PR #197](https://github.com/DigitalAppcorp/pazo-app/pull/197) **ABIERTO / borrador**. | No implica transferencia jurídica efectiva, cambio de operador en producción ni autorización de release. |
| Video y biblioteca visual | [PR #185](https://github.com/DigitalAppcorp/pazo-app/pull/185) y [PR #165](https://github.com/DigitalAppcorp/pazo-app/pull/165) **ABIERTOS**. | Trabajo pendiente de integrar; no confundir con funcionalidades publicadas. |

## Siguiente acción única para producto

**Reconciliar el roadmap de reactivación del PR #211 con lo que ya está fusionado en `main` (PR #212 y commit `3cc9d54`), y verificar contra CI, Supabase y Vercel qué se publicó realmente.** Actualizar estados punto por punto sin rehacer trabajo integrado. Solo después continuar el siguiente punto autorizado por el Product Owner. Si Claude tiene cambios locales no subidos, pedir su estado verificable antes de reemplazarlos.

Para este frente, el documento de detalle está en **la rama del PR #211** hasta que sea integrado: [hoja de ruta en revisión](https://github.com/DigitalAppcorp/pazo-app/pull/211/files). Las cifras de usuarios, notificaciones y atribución dentro de ese PR son una fotografía fechada, no contadores actuales.

## Orden de lectura y fuente de verdad

1. Este handoff breve + `AGENTS.md` para el contexto y los límites. `AGENTS.md` contiene bloques fechados: una afirmación histórica no supera una lectura nueva de proveedor.
2. `main`, ramas y PR abiertos (HEAD exactos, diffs, CI, aprobación); [contrato de arquitectura](PAZO_ARCHITECTURE_CONTRACT.md) e [inventario de datos](PAZO_DATA_INVENTORY.md) cuando proceda.
3. Entorno real de Supabase y Vercel, revisado en **solo lectura** cuando sea relevante; comprobar por separado código, CI, backend aplicado y experiencia E2E.
4. Project Brain OS: [patrón de handoff](https://github.com/DigitalAppcorp/project-brain-os/blob/main/patterns/VERIFIABLE_HANDOFF.md). Las reglas generales viven allí; el estado específico de PAZO vive aquí.
5. [Archivo histórico íntegro](history/PAZO_ACTIVE_HANDOFF_PRE_COMPACTION_20261106.md) y actas con fecha: consultar como evidencia y contexto, **nunca como estado vivo por defecto**.

**Precedencia:** proveedor vivo verificado > Git/CI del commit específico > este snapshot fechado > informes/entradas históricas. Si chocan, detener la acción irreversible y reconciliar en lectura antes de escribir.

## Límites de autorización y seguridad

- Esta compactación es **solo documental**: no autoriza `merge`, despliegue, migraciones, `db push`, activación de flags, cobros, cambios a PayPal, rotación de secretos ni campañas.
- No reinstalar migraciones ni ejecutar `db push` global por instrucciones históricas; cotejar primero el estado realmente aplicado.
- Proteger Auth/MFA, RLS, PayPal Live, privacidad ES/EN, consentimientos, retención, exclusiones QA y datos reales. No exponer identificadores privados, secretos ni registros individuales en handoffs.
- Conservar la distinción **propuesto → commit → CI PASS → backend aplicado → validación E2E → aprobación del PO → publicación**. Ninguna fase implica automáticamente la siguiente.
- No borrar ni sobrescribir el trabajo local o PR de otro agente sin comprobar su estado.

## Frase para retomar en otro chat

> Activa Brain OS desde `DigitalAppcorp/project-brain-os`; lee `DigitalAppcorp/pazo-app/AGENTS.md` y `docs/PAZO_ACTIVE_HANDOFF.md`. Verifica de nuevo `main`, PR abiertos, CI y los proveedores relevantes antes de ejecutar. Prioriza reconciliar la hoja de reactivación #211 con #212 y la implementación de confirmación de correo; no confundas un merge con producción y conserva los gates del PO.

**Mantenimiento:** reemplazar este resumen con evidencia más reciente en vez de anexar cronologías. Objetivo: 3–8 KB; mover registros antiguos a `docs/history/` o enlazar actas inmutables. Registrar fecha, fuente, alcance, incertidumbres y una sola acción siguiente.
