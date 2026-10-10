# PAZO — RC de beta listo para decisión condicionada (2026-10-10)

**Propietario del producto:** Product Owner. **Ejecutor técnico:** ChatGPT. **Ensayo exclusivo de baja descartable:** Codex.  
**Rama:** `release/mvp-beta-fast-track-20261010`. **HEAD auditado al preparar este documento:** `11b516d7b0b183e6c1eaab8f243eb3e142113490`.

## Alcance del RC congelado

- Sin nuevas funcionalidades ni repetición de pruebas de Auth, Feed, Comunidades, Cuidados, Lugares previamente aceptadas.
- PostHog explícitamente apagado mediante `isObservabilityEnabled() => false`; no habilitar eventos, dashboards ni tokens.
- Política/Reglas ES/EN existentes, ajustadas para Supabase, Mapbox, Unsplash, ubicación voluntaria, check-ins persistentes, reportes de avistamiento, tratamiento de solicitudes manuales, DNT y límites reales de conservación.
- El operador identificado por PO es Alvarado Solutions LLC, California; contacto `appdigital.corp@gmail.com`. No inventar domicilio, registro adicional ni retenciones exactas.
- La política sigue **borrador** (`LEGAL_RELEASE_READY=false`) porque la ejecución real de baja manual NO está certificada; no declarar beta pública lista todavía.
- Procedimiento de atención humana documentado en `docs/PAZO_MVP_PRIVACY_OPERATIONS_RECONCILIATION_20261010.md`. Moderación DB asignada, sin prueba final de eliminación física de medios/CDN; no prometerla.

## Dependencia única de ensayo funcional: Codex

Codex debe informar PASS/FAIL documentado sobre **su única cuenta QA** según `docs/PAZO_CODEX_PENDING_QA_20261010.md`. No ejecutar por este carril pasos de registro, onboarding, eliminación, SQL ADMIN_ONLY, Auth Admin ni Storage API. No alterar las seis identidades originales, el moderador ni otros registros. La llegada de un PASS no activa automáticamente el despliegue.

## Gate de salida mecánico — ejecutar tras PASS de Codex

1. Incorporar al handoff el PASS/FAIL con evidencia mínima no sensible, y conciliar si cambió realmente el comportamiento descrito en Privacidad/Reglas. FAIL mantiene beta pública bloqueada.
2. Verificar el HEAD exacto a publicar y **certificar CI de ese SHA** con `npm ci`, `npm run test:governance` y `npm run build` (preferir GitHub Actions; alternativa local autorizada con el checkout correcto). El último PASS #626 pertenece a un SHA anterior y NO valida los commits actuales. No declarar PASS sin resultado efectivo.
3. Convertir los borradores ES/EN en política/Reglas finales solo cuando el flujo de solicitudes, alcance de moderación, retención/cachés y operación humana se puedan afirmar verazmente. Fijar **fecha efectiva real al publicar** y aprobar texto final; no inventar períodos ni un sistema automático de baja.
4. Revisar que los enlaces legales sean visibles antes de registro y en la app pública. Para evitar rehacer QA, verificar únicamente diferencias introducidas por la publicación, no recorrer todos los módulos aprobados.
5. Solicitar aprobación específica del PO para merge y despliegue. **Hasta esa aprobación: no tocar `main`, Vercel ni abrir beta pública**. La limpieza de datos de prueba fuera de la cuenta QA requiere otra autorización explícita.

## Evidencia y límites de esta sesión

- GitHub confirmado: rama RC HEAD `11b516d7` antes de registrar este documento; `src/services/observability.ts` tiene PostHog OFF; `legalCopy.ts` y test ES/EN actualizados.
- GitHub Actions: el método de consulta conectado devuelve solo runs asociados a PR; para el SHA de push retorna vacío. **Sin certificación CI de la versión actual.**
- Este entorno no puede conectar por Git a GitHub para instalar dependencias ni correr build; por tanto **no se realizaron nuevas pruebas de ejecución**.
- Checks Vercel reportan cuota de builds, no prueba de fallo del código; no tocar Vercel.

## Regla de estado

**PREPARACIÓN INDEPENDIENTE CERRADA EN DOCUMENTOS, NO RELEASE READY.**
No quedan cambios de producto independientes **identificados y autorizados** como imprescindibles en este carril. Los bloqueos de publicación aún son (a) PASS de Codex, (b) CI final verificado, (c) política efectiva y aceptación final del PO. (b) y (c) son gates posteriores, no trabajo de desarrollo que justifique ampliar el MVP ahora.
