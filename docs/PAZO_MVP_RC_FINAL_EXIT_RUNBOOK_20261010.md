> **ESTADO VIGENTE — 2026-10-10:** `docs/PAZO_MVP_TECHNICAL_RELEASE_READINESS.md` supersede los pasos históricos incompatibles de abajo. SHA inicial `654f5e2fb51f11f5175990bd75aaa4f44dd8a312`, CI #673 PASS. E2E baja Codex PASS: no repetir. Legal efectivo queda null hasta publicación. Preview Vercel bloqueado por 403; no hay URL verificada. PWA base estática/local PASS; falta smoke HTTPS e instalación Android/iOS. F14 global OFF; la migración local de reintentos no se aplicó y el ensayo de medio nuevo necesita gate separado. El cierre público es NO-GO hasta resolver estos gates y F13 debe presentarse al PO antes del gate final.
> **GATE PWA / HTTPS — 2026-10-10:** `test:pwa`, gobernanza y build PASS en CI #670 commit `0d60dd87`. HTTPS viene del proveedor de hosting en el Preview; no es sinónimo de PASS de GitHub Actions. Único intento Vercel Preview sobre el SHA correcto, proyecto `pazo-app-t83r`, rechazado por límite gratuito **402 api-deployments-free-per-day** (retry 24h). NO hay Preview PWA recién creado ni instalación móvil E2E. Ambos proyectos Vercel carecen de `VITE_MAPBOX_ACCESS_TOKEN`, necesaria para que el mapa real funcione: configurar token público desde entorno autorizado antes de release, sin activar pagos ni escribir secretos en Git. Cuando se restablezca la cuota: un único Preview del SHA CI aprobado; verificar manifest y SW por HTTPS, Android/Chrome instalación y standalone, iOS/Safari Añadir a pantalla de inicio, recarga/cierre de sesión, Mapbox si tiene token; registrar PASS/FAIL sin beta pública ni main. F13 continúa pendiente y se recordará antes de autorización PO. Codex conserva QA de baja sin interferencia.

> **ACTUALIZACIÓN PWA OBLIGATORIA Y F13 (2026-10-10):** El PO confirmó que una beta web no instalable NO cumple el MVP. Manifest, SW network-only, iconos y PWA wiring tienen CI #667 PASS (commit `fe1a5fc4`); **queda la prueba real de instalación en el dominio HTTPS** una vez autorizada la publicación, en Android/Chrome e iOS/Safari con Añadir a pantalla de inicio, apertura standalone y reinicio de sesión seguro si aplica. No es un módulo nuevo: es smoke de despliegue. La F13 NO está completada; **recordar al PO justo antes de GO/NO-GO** para que decida realizarla o diferirla. No interpretar frases históricas de esta página como permiso para lanzar web-only.

# PAZO — RC de beta listo para decisión condicionada (2026-10-10)

**Propietario del producto:** Product Owner. **Ejecutor técnico:** ChatGPT. **Ensayo exclusivo de baja descartable:** Codex.  
**Rama:** `release/mvp-beta-fast-track-20261010`. **Último SHA con cambios funcionales/legal verificado:** `95669313584064ddd3008da42a693edc4f074902` — CI #650 `SUCCESS` (governance, 91 pruebas MVP, build y lint).

## Alcance del RC congelado

- Sin nuevas funcionalidades ni repetición de pruebas de Auth, Feed, Comunidades, Cuidados, Lugares previamente aceptadas.
- PostHog explícitamente apagado mediante `isObservabilityEnabled() => false`; no habilitar eventos, dashboards ni tokens.
- Política/Reglas ES/EN existentes, ajustadas para Supabase, Mapbox, Unsplash, ubicación voluntaria, check-ins persistentes, reportes de avistamiento, tratamiento de solicitudes manuales, DNT y límites reales de conservación.
- El operador identificado por PO es Alvarado Solutions LLC, California; contacto `appdigital.corp@gmail.com`. No inventar domicilio, registro adicional ni retenciones exactas.
- El texto legal ES/EN quedó fechado para esta versión (10 oct 2026), con `LEGAL_RELEASE_READY=true`: significa **texto preparado**, no autorización de beta. La prueba E2E de baja manual aún no está certificada y bloquea el acceso público.
- Procedimiento de atención humana documentado en `docs/PAZO_MVP_PRIVACY_OPERATIONS_RECONCILIATION_20261010.md`. Moderación DB asignada, sin prueba final de eliminación física de medios/CDN; no prometerla.

## Dependencia única de ensayo funcional: Codex

Codex debe informar PASS/FAIL documentado sobre **su única cuenta QA** según `docs/PAZO_CODEX_PENDING_QA_20261010.md`. No ejecutar por este carril pasos de registro, onboarding, eliminación, SQL ADMIN_ONLY, Auth Admin ni Storage API. No alterar las seis identidades originales, el moderador ni otros registros. La llegada de un PASS no activa automáticamente el despliegue.

## Gate de salida mecánico — ejecutar tras PASS de Codex

1. Incorporar al handoff el PASS/FAIL con evidencia mínima no sensible, y conciliar si cambió realmente el comportamiento descrito en Privacidad/Reglas. FAIL mantiene beta pública bloqueada.
2. El código y los avisos legales del commit `956693135` ya tienen CI #650 PASS; si hay cambios de código posteriores, certificar solo ese SHA nuevo. La actualización puramente documental de este runbook no reabre QA del producto.
3. Los textos están preparados ES/EN, con fecha de vigencia 10 oct 2026 y límites reales de baja manual, backups, medios y terceros. Tras PASS de Codex no elaborar una nueva política por rutina; solo reabrirla si la prueba revela que su contenido es falso.
4. Revisar que los enlaces legales sean visibles antes de registro y en la app pública. Para evitar rehacer QA, verificar únicamente diferencias introducidas por la publicación, no recorrer todos los módulos aprobados.
4A. **Configuración de apertura (no es desarrollo):** el intake de eliminación está deshabilitado por defecto en compilaciones públicas; al desplegar tras PASS de Codex y con operador disponible, activar deliberadamente `VITE_F14_DELETION_REQUESTS_ENABLED=true` en el entorno de publicación y comprobar la entrada a la cola. No activar antes del PASS ni abrir beta sin ese flujo funcional.
5. Solicitar aprobación específica del PO para merge y despliegue. **Hasta esa aprobación: no tocar `main`, Vercel ni abrir beta pública**. La limpieza de datos de prueba fuera de la cuenta QA requiere otra autorización explícita.

## Evidencia y límites de esta sesión

- GitHub confirmado: `956693135` incorpora textos y enlaces legales finales para beta y `src/services/observability.ts` conserva PostHog OFF.
- GitHub Actions: consultado a través del endpoint autenticado de runs de push del repositorio. **CI #650 SUCCESS** para `956693135`, incluida instalación, gobernanza, build y lint.
- No se ejecutó build local por falta de red en este runtime; **GitHub Actions sí ejecutó las pruebas y el build exitosamente**, y es la evidencia de referencia.
- Checks Vercel reportan cuota de builds, no prueba de fallo del código; no tocar Vercel.

## Regla de estado

**PREPARACIÓN INDEPENDIENTE CERRADA EN DOCUMENTOS, NO RELEASE READY.**
No quedan cambios técnicos independientes identificados. **Única validación funcional pendiente: PASS de Codex en baja manual.** CI y textos legales quedan cerrados para el RC. Publicación/merge siguen necesitando autorización expresa del Product Owner; eso no es una prueba ni una nueva fase de desarrollo.
# **ESTADO MÁS RECIENTE — AUDITORÍA PRELANZAMIENTO 2026-10-10**

Consultar [`PAZO_PRELAUNCH_TECH_AUDIT_20261010.md`](PAZO_PRELAUNCH_TECH_AUDIT_20261010.md): Codex E2E de baja PASS; CI local/Actions del commit de auditoría se debe comprobar al publicar el cambio. El flag de solicitud pública de baja continúa sujeto a disponer del operador. `f14-moderation-purge` v5 sigue bloqueada y no se ensayó una retirada física; F14 queda parcial. F15 PWA estática/local queda parcial hasta Preview HTTPS e instalación Android/iOS. El aviso legal se fecha al publicar. Mapbox falta configurar en el entorno de Preview. Antes del GO/NO-GO, recordar F13 PLANIFICADA para decisión expresa del PO. No se alteró Vercel, hosted SQL ni `main`.
