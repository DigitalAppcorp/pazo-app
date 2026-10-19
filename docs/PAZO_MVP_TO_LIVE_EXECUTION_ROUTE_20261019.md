# PAZO — Ruta de lanzamiento MVP Beta → PayPal Live
Fecha: 2026-10-19 · Product Owner: usuario · Ejecutor: ChatGPT / Project Brain OS 1.4.1
Estado: **EN CURSO / MVP_RELEASE_NO_GO / LIVE_NO_GO**.
Documento de ejecución, no certificación. Fuente: `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, PR #44 y gates F14/F16. Los snapshots históricos pueden haber sido supersedidos.

## Decisiones invariables
1. PAZO y QR gratis; «Amigo de PAZO» opcional USD 2.99/mes, beneficios aprobados: insignias, cinco fondos, muro con consentimiento individual por mascota, medallas por 3/6/12 meses pagados completamente.
2. Desarrollo en `http://localhost:5173`, pagos exclusivamente PayPal Sandbox. Webhooks públicos HTTPS ya van a Supabase; retorno QA existente usa HTTPS. **No** registrar localhost como webhook público ni dominio oficial.
3. Beta futura en HTTPS público; dominio todavía no decidido. No pedirlo ahora ni fijar preview temporal como oficial.
4. Cambio Sandbox→Live desde administración: automático **solo en la mecánica posterior a una acción administrativa autorizada**, con preflight, segundo consentimiento explícito del Product Owner, versionado, registro, monitor y rollback. **NO** cambiar por detectar beta pública, por pegar claves o por desplegar frontend.
5. No usar `main`, deploy público, credenciales Live o modificaciones financieras hosted sin el gate correspondiente. No replicar pagos Sandbox ya probados, no falsificar ledger por retorno PayPal.
6. «Cero contornos» permanente. Conservar QA funcional ya aprobada, verificar exclusivamente integraciones que faltan y regresiones.

## Evidencia válida y estado
- **CODE** = programado. **CI** = pruebas automáticas, no backend listo.
- **HOSTED** = deploy/migración y postflight exactos.
- **E2E** = operación real, owner y webhook/payments verificados. **PO** = aprobación de capturas/comportamiento.
- **RELEASE** = publicación, monitoreo, rollback y merge aprobado. Ninguna columna implica la siguiente.

| Gate | Prioridad / salida requerida | Estado verificado | Próximo paso y DoD |
|---|---|---|---|
| R0 integridad | rama y build PR #44; revisar secretos/CI | PASS HEAD `0d3ac9c` con CI+6 labs 7/7. PR DRAFT | Cada SHA nuevo: CI+6 y source audit. |
| R1 membresía visual | «Mi mascota» sin parpadeo y «Mi membresía» limpia con cancelar/actualizar | CODE/CI PASS, **PO visual pendiente** | PO muestra dos pantallas con cuenta pagada sin debug; corregir diferencias y cerrar por captura. |
| R2 pagos Sandbox | intención/consentimiento idempotentes, abandono, status, venta firmada, período, refund/reversal, cancelación | OAuth de Edge Legacy real PASS; pago previo PASS; **conciliación venta más reciente no cerrada** | Ejecutor audit/reconcile sin nuevo cargo; casos negativos, historial, evitar doble cobro; una prueba genuina solo si falta evidencia indispensable. |
| R3 beneficios | insignia Feed/perfil, cinco fondos, muro opt-in/out, medallas 3/6/12 | backend/UI existen; flag público OFF; E2E y visual pendientes | QA de dueño pagado/no pagado, expiración y reversión, medallas solo con datos sintéticos. No encender beneficios públicos aún. |
| R4 gateway administrable | dos entornos, merchant+generación históricos, Vault, selector server-only, rollback | panel y OAuth PASS; contratos offline CI; **runtime conmutador no existe** | Ejecutor programar adaptadores reales y DDL versionado en PR, probar con PG17. Aplicar hosted solo con GO por migración/función. |
| R5 privacidad/moderación | retirada de media acotada, solicitudes/baja, textos legales/retención, atención real | baja de cuenta QA previa PASS; purge general OFF, prueba de medio y legal en beta pendientes | Test físico solo con nuevo objeto descartable/GO específico; SOP/ACL, publicación legal con fecha real. |
| R6 social MVP | Auth, mascotas/QR, Feed, cuidados, comunidades/eventos/lugares, denuncias/administración | múltiples QA locales aceptadas. Admin overview referencia no validada aún | Smoke del build definitivo móvil + visual admin y estados; no repetir E2E de Auth/Feed sin regresión. |
| R7 observabilidad | estadísticas veraces, backup/restore, costes, logs, alertas, incidentes | admin panel y métricas parciales; backups y monitor de release no certificados | Revisar retención/restore, egress y límites, alertas de fallos de pago, SOP; no inventar KPIs Live. |
| R8 hosting beta | HTTPS, versión exacta, dominio, Auth/links, PWA Android/iOS instalada/no instalada, rollback | Vercel conexión `digitalapp`: **403** al leer proyecto/deploy/aliases. Dominio futuro indefinido | PO resuelve acceso al scope; después desplegar beta y verificar PWA, callback y SW con QA de dispositivo. |
| R9 Live | app REST Live, credenciales Vault, plan Live USD2.99, webhook firmado, facturación+reversión, canary y selector | **NO-GO**: dominio/credenciales no dados, checkout Live/backend E2E no implementados | Preparar código/offline hoy; tras R8 verificar merchant, plan, webhook y un cobro REAL supervisado con GO separado. |

## Secuencia crítica sin microfases
**A — hoy, dominio no requerido:** fuente/CI, arreglar UI F16, conciliación Sandbox, conectar beneficios verificados y seguridad; implementar gateway server-only por versión/merchant y tests, preparar SQL no instalado, documentar rollback; corregir puntos reales de MVP en PR. Ninguna compra Live.
**B — beta HTTPS publicada:** resolver acceso Vercel; configuración URL estable y variables Auth/CORS, PWA instalada/no instalada, retorno/cancel de PayPal; usar panel admin para credenciales Live en Vault sin pegarlas al chat, validar app/merchant/plan/webhook Live por API, probar flujo de períodos, renovación/cancelación, privacidad, incidentes; aprobar canary único de dinero real bajo GO.
**C — primer cobro Live:** botón admin con preflight **del servidor** fresco + confirmación explícita, escritura transaccional con compare-and-swap, auditoría y rollback, solo **nuevas** altas Live. No convertir subs Sandbox en Live. No habilitar por fecha/domino/redirect.
**D — primeros siete días:** monitorear doble cobro, APPROVAL_PENDING, reintentos webhook, conciliación, pagos fallidos/reversos, bajas, errores, costos. En incidente, kill switch solo para nuevos checkouts; las suscripciones Live existentes retienen lectura/cancelación por su merchant original. Cerrar Scope Closure Reconciliation y merge solo con PO GO.

## Arquitectura exigida
App UI (localhost/beta HTTPS) → API Auth/owner/consent/limiter/idempotencia → selector de NUEVA compra administrado en backend → binding inmutable (entorno/merchant/app/generación/plan) → endpoint PayPal correspondiente → HTTPS webhook separado por entorno con firma, anti-replay e inbox idempotente → ledger real de períodos → beneficios.

Históricos:
- Sandbox Legacy: conservar secretos Edge y lectores/cancelación **inmutables**.
- Sandbox nuevo: configuración Vault versionada, tras GO de QA.
- Live: App REST, Vault y host PayPal Live independientes, tras GO final.
Un error leyendo un merchant NUNCA debe redirigir automáticamente a otro; tampoco dar premios por `ACTIVATED` o retorno de browser. Cambio de precio requiere nuevo plan/consentimiento versionado.

## Seguridad y riesgos
Supabase Advisor 19-oct: 29 RLS enabled/no policy principalmente esquemas privados, 4 SECURITY DEFINER anon, 38 authenticated; revisar riesgo/ACL, no revocar funciones públicas utilizadas por RLS/UI por reflejo. Performance: 16 FK sin índices y 1 índice duplicado, optimización P1 previa o posterior según carga. Vercel API 403 para scope `digitalapp`; no afirmar preview/producción READY. PayPal requiere webhook HTTPS con firma: https://developer.paypal.com/api/rest/webhooks/rest/ ; documentación Live https://developer.paypal.com/api/rest/production/ .

## Únicamente ayuda humana indispensable
**Ahora:** restaurar permisos de la conexión de Vercel al scope `digitalapp` o confirmar acceso CLI del PO; sin eso no se verifica despliegue, variables o rollback.
**QA visual:** dos capturas del nuevo «Mi membresía» y parpadeo «Amigo de PAZO» + referencia admin final. No repetir Auth/Feed ya aceptados.
**Gates sensibles:** autorización por DDL, Edge financiero o destrucción de medio descartable, indicando exactamente impacto y rollback.
**Solo con beta oficial:** dominio estable, credenciales Live guardadas en el panel (nunca aquí), merchant/plan Live comprobados y GO del primer cobro real supervisado.

No marcar ninguno de estos pendientes como completado por CI; ruta vigente **MVP_RELEASE_NO_GO / LIVE_NO_GO** hasta evidencias enumeradas.
