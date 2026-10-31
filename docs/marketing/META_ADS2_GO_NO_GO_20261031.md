# PAZO — Meta Ads 2 | Acta GO/NO-GO de integración (31-oct-2026)

**Estado: NO-GO para cualquier transmisión a Meta o lanzamiento de campaña.**
**Issue:** #169 (dependencia #168) · **PR:** #171 DRAFT, base `feat/issue168-ads2-attribution`.
**SHA candidato auditado:** `789460d71757512e23ef0ceb0cf25dcd3e062d9f`.
**Autorización vigente:** implementación de código, laboratorio, CI y preparación. No hay autorización para merge, SQL hosted, despliegue de Edge, aviso de privacidad publicado, activación de Pixel/CAPI, campañas o presupuesto.

## Matriz de evidencia

| Control | Estado | Evidencia / condición |
| --- | --- | --- |
| Build y regresión general | PASS | [Ads2 isolated contracts — 41175724463](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41175724463), mismo SHA |
| Tests de Meta OFF y barrera de activación | PASS | [Meta Pixel CAPI fail-closed — 41175724499](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41175724499): **113/113**, `META_OFF_BOUNDARY_PASS` |
| Atribución, deduplicación y retirada en PostgreSQL 17 | PASS EN LABORATORIO | `ads2-pg17.mjs` y `meta-outbox-pg17.mjs` en PG17 descartable; ningún SQL alojado |
| E2E de navegador para Ads2 | PASS EN CI | `ads2-browser.mjs` (Playwright/Chromium); no es un E2E de Meta Events Manager |
| Evento confirmado y mismo ID en Pixel/CAPI | PASS EN CONTRATOS SINTÉTICOS | UUIDv4 único de base de datos y `CompleteRegistration`; deduplicación real en Meta **NOT_TESTED** |
| Consentimiento separado, retirada y GPC | PASS EN CONTRATOS / BLOQUEADO PARA RELEASE | Endpoints Auth + RPC candidatos; aún no instalados ni validados con Auth real en staging |
| Exclusiones QA/admin y opt-out | PASS EN SQL/UNIT | Faltan pruebas reales de roles, usuarios y señales de GPC en staging autorizado |
| Inventario/aval legal de campos enviados a Meta | BLOCKED | Pixel expone al menos datos técnicos de conexión; CAPI requiere campo de matching aprobado. No asumir anonimato de hash |
| Aviso público ES/EN y aprobación Design OS | BLOCKED | Solo existe `META_CONSENT_ES_EN_DRAFT.md` como borrador **no publicado**; aviso actual no cubre este intercambio |
| Dataset/Pixel/CAPI token, cuenta y Meta Test Events | NOT_VERIFIED | No se consultó Meta Events Manager; no se usó token real ni se enviaron eventos |
| Migración oficial y funciones Edge | NOT_DEPLOYED | Candidatos en `supabase/tests/marketing/` y `supabase/functions/pazo-meta-*`, sin instalación |
| Activación de tracking/producto | OFF | Todos los flags hardcoded OFF; `App.tsx`/entrada pública no importan Meta; CI vigila la frontera |
| Campañas e inversión | NO ACTIONS | No se modificaron anuncios ni presupuestos. **No** inferir gasto actual de Meta Ads sin acceder a la cuenta |

## Condiciones de salida obligatorias (ninguna se presume aprobada)

1. **Privacidad:** resolver con revisión competente las obligaciones aplicables, finalidad, aviso ES/EN, aprobación granular del inventario de datos de transporte y matching, periodo de retención, GPC cross-device, retirada y experiencia UX. Consultar Design OS; no cambiar la política publicada sin GO.
2. **Infraestructura controlada:** disponer de entorno staging separado y claves administradas exclusivamente en secretos del entorno, no PR, logs ni chat. Auditar y promover **solo la migración nueva revisada** (sin `supabase db push` global ni tocar el historial), y instalar funciones con flags aún OFF. Verificar RLS, propietarios y autorizaciones Auth.
3. **Interfaz y recorrido:** integrar el consentimiento deliberado en el momento apropiado después de email verificado, sin bloquear QR, registro, MFA, PayPal, demo o herramientas cuando Meta falle. Validar ES/EN en 390/430 px, GPC real, logout/login, múltiples pestañas, QA/admin y retirada; no usar el alta solicitada como conversión.
4. **Proveedor:** obtener de Events Manager del titular el Dataset/Pixel ID, token CAPI restringido a servidor, versión vigente y entorno de pruebas propio. No inventar la disponibilidad del objetivo `CompleteRegistration`. Verificar eventos en **Test Events** y dedup real de Pixel/CAPI por mismo `event_name` y UUID, respetando la privacidad y evitando contaminar audiencias; no inferir que un test code excluye aprendizaje.
5. **Decisión de negocio:** entregar evidencia vinculada a SHA/entorno de privacy, E2E y Test Events; solicitar GO **separado y explícito** para cambios productivos, transmisión real y cualquier lanzamiento/gasto.

## Seguridad y rollback

- **Antes de liberar:** conservar Pixel/CAPI/worker/consent UI OFF y las opciones de opt-out disponibles cuando se instalen; no ejecutar requests externos.
- **Si se autoriza liberar en el futuro:** activar por etapas solo después de pruebas reales y rollback probado; apagar primero el gate del proveedor ante incidentes, detener el worker, inhibir el SDK y confirmar que el usuario puede retirar el permiso aun con proveedor OFF.
- Una retirada no deshace datos ya transmitidos ni elimina una solicitud CAPI en vuelo. El sistema debe informar un fallo de persistencia como `withdrawal_unconfirmed`, no fingir éxito.
- La auditoría actual no prueba cumplimiento legal, disponibilidad de Meta, conversión pagada ni resultados de campañas.

**Conclusión:** Código modular y laboratorio considerablemente preparados, con CI verde. **Integración funcional en producción NO completada; Meta no verificado; NO-GO de activación.** Mantener #168 abierto y PR #171 DRAFT hasta cerrar los requisitos anteriores y contar con autorización específica.
