# PAZO F16 — Administración de secretos Live por generación (GATE NO RELEASE)

Fecha: 20-oct-2026. PR #44 DRAFT, rama `f13/section-titles-20261012`. **No son cobros operativos.** El Product Owner autorizó terminar preparación, no encender transacciones Live antes de publicar beta. Las previews automáticas de Vercel fueron desactivadas por el PO mediante `previewDeploymentsDisabled: true`; no tocar main ni crear previews manuales.

## Contratos implementados (sin despliegue)

- `supabase/functions/pazo-admin-paypal-validate/liveEdgeProvisioning.mjs`: orquestador futuro de preparación de seis secretos de Edge **por generación**. Requiere `released=true` inyectado por servidor, confirmación explícita `PREPARAR CREDENCIALES LIVE`, sesión de administrador fresca y autorizada, generación DB `live/edge_secrets` no retirada, mismo actor/revisión, kill switch ON y checkout Live OFF, verificación externa de OAuth/plan/webhook/identidad comercial, y PAT **de alcance limitado al proyecto**.
- Supabase Management API documentada: `GET /v1/projects/{ref}/secrets` para nombres existentes; `POST /v1/projects/{ref}/secrets` cuerpo array `[{name,value}]`, HTTP 201. La petición utiliza exclusivamente el proyecto `mrybvqdebbgcayuvgkkr` y el token está inyectado desde servidor. Se rechaza pisar cualquier secreto de la misma generación. Ante un resultado ambiguo, devuelve **revisión manual, NO reintentar a ciegas**. El postflight comprueba seis nombres, pero **no constituye prueba de identidad o integridad del valor almacenado**. No activa el registry `PAZO_F16_LIVE_HISTORICAL_GENERATIONS`, no cambia checkout ni concede beneficios.
- `supabase/functions/pazo-admin-paypal-provision/intake.mjs`: entrada HTTP futura; estrictamente `POST` JSON, URL fija, sin query, bearer obligatorio, cuerpo limitado y sin respuesta con secretos. `index.ts` tiene `RELEASE_APPROVED=false`, sin dependencias de gestión conectadas y **no está desplegada**.
- `AdminPayPalSettings.tsx`: el panel distingue OAuth heredado en Vault de credenciales verificadas en Edge. El checklist de Live **no se vuelve verde** por Vault: `LIVE_EDGE_PROVISIONING_RELEASED=false`; el servidor tendrá que reportar `edge_generation_verified` después de validación real. La pantalla NO permite aún el aprovisionamiento de Edge.
- Pruebas Node cubren liberación cerrada, contrato HTTP, rechazo de credenciales incompletas, cruce de generación, no overwrite, 201 y nombres, revisión de errores ambiguos, no exposición de secretos ni falso positivo por Vault. Siete laboratorios PG17 existentes siguen separados.

## Por qué aún NO puede llamarse “habilitado”

1. Falta un **adaptador servidor real** de autenticación revalidada de administrador y lectura de `merchantGeneration` de la tabla privada, con registro auditado y control de idempotencia. Los módulos actuales reciben inyecciones simuladas, NO están conectados a las funciones alojadas.
2. Falta prueba autenticada **de identidad del comerciante** por recurso PayPal Live correcto y webhook firmado/entregado: OAuth exitoso no basta. El adaptador `inspectLivePaypalResources` es de solo lectura y no prueba entrega ni identidad comercial.
3. Falta un token de gestión Supabase **scoped** a este único proyecto con permiso mínimo `Edge Function Secrets Read+Write`; no guardar tokens clásicos amplios en Edge, no pegar PAT, Client Secret o credenciales en el chat ni en repositorios. Preferir workflow de aprovisionamiento externo temporal si el alojamiento de un PAT incluso scoped en Edge no supera revisión de amenazas.
4. Falta configuración explícita del plan Live y webhook por generación, readiness en DB, auditoría/rollback de control plane, aceptación visual del PO, reglas de recibos/reembolsos y retención, writer de reconciliación idempotente, primeros smoke supervisados y URL pública HTTPS de beta.
5. Falta un **GO de despliegue** del receptor admin en modo fail-closed, luego un GO separado de aprovisionamiento y verificación con credenciales reales y, solo al publicar oficialmente beta, GO específico para conmutación y pago real.

## Estado alojado comprobado

Supabase `mrybvqdebbgcayuvgkkr`: runtime legado sandbox:false; nuevo selector sandbox:false:kill=true; 0 merchant generations y 0 paid periods Live; 2 períodos QA y 26 eventos Sandbox conservados. Migración `20261020014049_pazo_f16_live_edge_credential_source_metadata.sql` aplicada; no nuevas migraciones en este bloque, ni cambios Edge, ni checkout Live. PR #44 DRAFT; producción `main` intacta.

**Siguiente ejecución sin nuevos permisos:** endurecer orquestador y tests hasta cerrar contrato; luego pedir al PO el GO mínimo correspondiente. Es prohibido marcar “Live listo” o activar automáticamente al publicar un dominio.
