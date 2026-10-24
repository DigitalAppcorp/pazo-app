## Issue96 — programación de medición interna preparada, OFF (23-oct-2026)

Trabajo en PR91 sin instalación ni activación. Auditoría técnica, pruebas y gates externos: [cierre técnico](PAZO_MARKETING_TECHNICAL_COMPLETION_ISSUE96_20261023.md) y [runbook](PAZO_MARKETING_INSTALLATION_RUNBOOK_20261023.md). Estas notas prevalecen sobre propuestas históricas del módulo que aún indican cron/antiabuso sin programar.

> VIGENTE: decisión del Product Owner, atribución interna AUTOMÁTICA sin casilla en registro. Cualquier propuesta de opt-in UI o cadena `pazo-marketing-optin-v1` más abajo es histórica y queda reemplazada por `docs/PAZO_MARKETING_AUTOMATIC_INTERNAL_ATTRIBUTION_20261023.md`. Privacidad/retención y activación siguen pendientes.

# PAZO — Instrumentación inicial de campañas (código inerte / no lanzamiento)

Fecha: 2026-10-23. **Estado:** `CODE_PREPARED_OFF`. Rama específica de medición basada en F17 HEAD 860c036d82b5fdfe0712b738f6528f7e31505d84; el PR #90 sobre main quedó superado y no debe integrarse. Complementa PR #89 (estrategia de $350), no modifica sus decisiones ni cambia main/producción.

## Alcance realizado
- `src/features/marketing/attribution.ts`: parsers de UTM allowlist para `utm_source=meta`, `utm_medium=paid_social`, `utm_campaign=pazo_beta_local_202610`, seis `utm_content` de creatividad. Rechaza fuente arbitraria, duplicados, fechas inválidas y creative no reconocido. Nunca almacena la URL completa, click ids, emails, GPS ni valores libres.
- Máquina de embudo local en `sessionStorage` de una sola pestaña, TTL de 72 horas y idempotencia: `landing → signup_requested → signup_verified → first_pet_created`. Se distingue solicitud de signup vs cuenta verificada. La segunda mascota no infla la conversión.
- Hook de entrada de URL y hooks de Auth/Onboarding: después de `signUp` exitoso, después de sesión con correo verificado+alta reciente y después de `createPetProfile` confirmado.
- Pruebas de validación, duplicados, no-op, fechas y almacenamiento bloqueado.
- Sin dependencias, sin Pixel/CAPI/GA4, sin conexión de Ads Manager, sin SQL ni servicios de terceros.

## Seguridad y estado real
**`PAZO_MARKETING_COLLECTION_ENABLED = false`** está fijado expresamente en código. Ni siquiera se lee `sessionStorage` en la app real. No hay escrituras a Supabase, red, cookies o proveedores externos; tampoco cambios de políticas. Una PR o branch no habilita nada en la aplicación oficial.

## Límites intencionales — no declarar campaña medible todavía
1. **No existe atribución autoritativa server-side ni dashboards**. Este prototipo solo prueba contrato/flujo local y no guarda conversiones en Supabase.
2. **Confirmación de email en otra pestaña/dispositivo** puede perder `sessionStorage`; no afirmar cobertura de campañas hasta diseñar persistencia lícita con política de retención y consentimiento apropiados.
3. `SIGNED_IN` no demuestra adquisición por sí mismo; el filtro client-side de fecha evita algunos falsos positivos, pero el backend deberá derivar creación/verificación desde Auth confiable y excluir cuentas QA.
4. No se implementaron `first_value` ni `D7_return`: deben definirse con acción útil concreta y base de cohortes autoritativa. No confundir creación de mascota con retención.
5. La fecha de campaña es nominal para el primer piloto: revisarla cuando el PO autorice fecha de anuncio.
6. Necesita prueba E2E real tras configuración/compilación en preview local, sin despliegue automático a producción.

## Siguiente Gate técnico (requiere autorización propia antes de escribir al backend)
- Aprobar finalidad/consentimiento, tipos de datos, retención, supresión por borrado de cuenta, exclusión QA y esquema privado por usuario único.
- Diseñar endpoint/RPC de almacenamiento con auth ownership y límites de idempotencia, sin acceso indiscriminado.
- Crear migración versionada usando CLI y realizar ensayo/revisión SQL, sin aplicar a Supabase hasta GO de migración explícito.
- Añadir pruebas backend y funnel E2E (email confirmada con app abierta y enlace externo), y política de cookies/storage si corresponde.
- Activación del gate de captura y cualquier Pixel/CAPI requiere GO independiente, nunca se deduce de esta implementación.

## Comando de verificación local
`node --experimental-strip-types --test src/features/marketing/attribution.test.mjs`
`npm run test:privacy`
`npm run build`

## Prohibiciones preservadas
No modificar `main`, Vercel, Supabase alojado, Auth provider, anuncios, PayPal, settings ni credenciales. Cero gasto. Mantener PostHog OFF y sin autocapture.

## Evolución del PR #91: Backend preparado para revisión
La migración privada está versionada como `supabase/migrations/20261024020632_pazo_marketing_firstparty_attribution.sql`, generada con nombre oficial de Supabase CLI en CI aislado (run 40052740127). **Sin instalación Supabase ni permiso de habilitar captura**. Incluye un puente REST accesible solo a `service_role`, sin acceso de clientes al schema privado.

`supabase/functions/pazo-marketing-attribution` tiene handler y adaptador Auth, pero `MARKETING_INTAKE_RELEASED=false`. Además `PAZO_MARKETING_COLLECTION_ENABLED=false` bloquea la UI. `consent_recorded_at` usa reloj SQL; la afirmación de opt-in no sustituye revisión real de UX/consentimiento y retención. La suite `npm run test:marketing` cubre UTM, validación de llamada, Auth y adaptador server-only. La tabla nueva está vacía hasta instalación aprobada y el gate está OFF incluso en el esquema.

El texto anterior que describe la migración como `no creada` fue una limitación histórica: después de la CLI de CI el archivo se añadió al PR, pero sigue **NO APLICADA** y la fase no está completa.
