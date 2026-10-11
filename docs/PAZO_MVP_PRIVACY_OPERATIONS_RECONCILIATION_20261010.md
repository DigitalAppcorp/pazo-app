> **RECONCILIACIÓN VIGENTE — 2026-10-10:** texto legal ES/EN preparado (`LEGAL_RELEASE_READY=true` solo en código), fecha efectiva null; PostHog hardcoded OFF aunque Vercel conserve variables antiguas; Unsplash inventariado/texto público; E2E manual de baja anterior PASS no repetido. La operación exige operador designado y método real de medios aún no probado. El análisis inicial de este documento se conserva como histórico. Fallos parciales de fotos, contacto y gates actuales: [operaciones de cierre](PAZO_MVP_CLOSURE_OPERATIONS_20261010.md). No afirmar un canal atendido, plazo o purga hasta verificarlo.

# PAZO MVP — reconciliación de proveedores y operación de privacidad (2026-10-10)

**Estado:** preparación interna, NO política pública y NO certificación legal. Complementa `PAZO_MVP_LEGAL_CLOSURE_AUDIT_20261010.md`. `LEGAL_RELEASE_READY=false`.

## 1. Hechos comprobados contra código del RC

| Superficie | Evidencia en código | Declaración segura / pendiente |
|---|---|---|
| Supabase Auth + datos | `docs/PAZO_DATA_INVENTORY.md`; `OnboardingView.tsx` registra email/contraseña y declaración 18+ | Supabase opera Auth/DB/Storage. No declarar verificación documental de edad |
| Avisos | `OnboardingView.tsx` muestra botones de borrador Privacidad/Reglas en paso A02 y `LegalPreviewDialog.tsx` muestra correo de contacto | Existen antes del envío del signup en A02; no afirmar que se certificó prominencia de la ruta inicial ni publicación de política definitiva |
| Mapbox | Inventario + `legalCopy.ts` | Informar solicitudes técnicas al mapa y GPS voluntario/efímero; reconciliar configuración real de ubicación |
| PostHog | `src/services/observability.ts` requiere `VITE_POSTHOG_PROJECT_TOKEN` para enviar. Usa eventos permitidos, pero `captureException` incluye `error.message`, `error.stack` y `componentStack`; `redact` solo elimina patrones concretos de email, ciertos query params y JWT | **Riesgo P0 de minimización**: una excepción puede contener otros identificadores/fragmentos privados; no afirmar que todos los errores están anonimizados o completamente sanitizados. Antes de activar ingestión pública, confirmar flag real y endurecer payload/captura o desactivar excepciones. No cambiar sin gate técnico |
| Recursos de imágenes ajenos | `OnboardingView.tsx` carga imagen de `images.unsplash.com` en A01 | **Proveedor de terceros no inventariado**: carga remota puede exponer metadatos técnicos al host. Registrar/revisar Unsplash y licenciamiento; no sustituir asset porque se preserva visual ya aceptada sin cambio aprobado |
| PayPal | Inventario indica checkout desactivado | No describir pagos como característica operativa del MVP |
| Soporte | `LegalPreviewDialog.tsx` crea enlace `mailto:` al contacto aprobado | Correo recibido mediante cliente de usuario; no es integración automática, y escribir al soporte no equivale a borrar cuenta |

**Nota de alcance:** las observaciones de PostHog/Unsplash surgen del código, no de una auditoría de tráfico en runtime. No se comprobó el estado exacto de variables de despliegue ni la retención de proveedores.

## 2. Procedimiento mínimo para solicitudes de privacidad (operación propuesta)

1. **Entrada:** recibir solicitudes en `appdigital.corp@gmail.com`, o intake integrado cuando esté habilitado. Si llegan por correo, **no ejecutar SQL ni baja desde un correo por sí solo**. El agente designado confirma recepción sin prometer ejecución o plazo no adoptado.
2. **Clasificación:** acceso/corrección, eliminación, privacidad de terceros, denuncia de contenido, menores, incidente o general. Escalar inmediatamente sospechas de exposición de datos; no pedir contraseñas, enlaces mágicos, JWT, tarjetas ni documentos excesivos.
3. **Identidad y titularidad:** solicitar confirmación proporcional a la operación por canal de cuenta autenticada cuando exista. Una coincidencia de dirección de correo NO autoriza por sí sola el borrado de terceros. Mantener la autenticación/privilegios fuera del correo.
4. **Verificación interna:** para eliminación, seguir exclusivamente SOP de baja/manual con cuenta objetivo validada, preflight, dependencias cruzadas, moderación y Storage API. El procedimiento de ensayo QA permanece **reservado a Codex**; este documento no autoriza acciones ni scripts.
5. **Respuesta al solicitante:** informar recepción, alcance y limitaciones comprobadas (p.ej. backups, archivos cacheados, reportes de terceros) sin afirmar que desaparecieron; informar conclusión solo tras comprobación Auth/DB/Storage requerida.
6. **Registro privado mínimo:** únicamente identificador de solicitud, categoría, estatus, hitos y evidencia técnica agregada. No guardar nombres/UUID/correos, screenshots, cuerpos de documentos o conversaciones en GitHub ni analytics. La retención de comunicaciones de soporte sigue pendiente de definición.
7. **Escalamiento:** moderación/contenido ajeno al responsable moderador existente; posible menor, incidente, solicitud legal o controversia al operador para análisis específico. No destruir evidencia de incidentes ciegamente.
8. **Cambio de política:** preparar texto ES/EN, revisar que representa el comportamiento real, determinar mecanismo de aviso de cambios y fijar fecha efectiva solo al publicar; conservar versión interna del texto sin datos personales.

## 3. Cierre pendiente y secuencia segura

- **P0** reconciliar PostHog: token/configuración efectiva sin revelar secretos y excepción potencialmente sensible; adoptar mitigación mínima antes de telemetría externa pública.
- **P0** registrar anfitrión de imagen externa en inventario y política (si sigue activo), confirmar prácticas de carga. No romper el diseño aceptado.
- **P0** criterios comprobables de retención de DB/Storage, soporte, incidentes, logs, backups y CDN; no inventar duraciones.
- **P0** cierre de baja manual E2E únicamente con evidencia independiente de Codex.
- **P0** revisión bilingüe final, prominencia, fecha efectiva real y gate del PO; solo entonces considerar `LEGAL_RELEASE_READY=true` y release.
- **CI** certificar el SHA definitivo de RC por GitHub Actions; no interpretar fallos de cuotas de Vercel como errores de build.

## 4. Sin cambios operacionales

Este documento no activa `VITE_POSTHOG_PROJECT_TOKEN`, solicitudes públicas de baja, purga media, PayPal ni flag legal; no crea plazos, no modifica datos de siete cuentas/Storage, no despliega ni ordena pruebas aceptadas anteriormente.
