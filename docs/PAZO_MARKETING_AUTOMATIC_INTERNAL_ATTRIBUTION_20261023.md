## Issue96 — programación de medición interna preparada, OFF (23-oct-2026)

Trabajo en PR91 sin instalación ni activación. Auditoría técnica, pruebas y gates externos: [cierre técnico](PAZO_MARKETING_TECHNICAL_COMPLETION_ISSUE96_20261023.md) y [runbook](PAZO_MARKETING_INSTALLATION_RUNBOOK_20261023.md). Estas notas prevalecen sobre propuestas históricas del módulo que aún indican cron/antiabuso sin programar.

# PAZO F17 — Automatic first-party campaign attribution (PO decision)
Decision: UTM attribution is automatic without any new signup consent checkbox. This is first-party internal measurement only, not Meta Pixel/CAPI or individual conversion sharing. This document supersedes the checkbox proposal in earlier PR #91 privacy drafts.

## Prepared flow (all release gates OFF)
1. Only allowlisted Meta paid_social UTM campaign+creative and timestamp are staged in first-party localStorage, with 72h TTL, allowing different tabs on same origin. No fbclid, raw URL, cookies of third parties, GPS, IP, or email in staging.
2. Signup requested is not conversion. Once Auth confirms a newly created account, the browser prepares 4 allowlisted UTM fields and first_touch_at; sends to Supabase Edge through current authenticated session. No checkbox.
3. Edge verifies token against Supabase Auth and takes owner ID from Auth, not browser; rejects stale accounts and unexpected fields. SQL excludes QA/founder/admin and stores one attribution per Auth ID.
4. First pet within seven days and D7 navigation are derived server-side. D7 is only a screen-activity proxy, not meaningful retention. No reliable anonymous visit counter in this PR.
5. Gates stay closed: PAZO_MARKETING_COLLECTION_ENABLED=false (browser), MARKETING_INTAKE_RELEASED=false (Edge), collection_gate.enabled=false and retention_days=0 (SQL).

## Privacy and retention prerequisites
Inform users in published Privacy Policy ES/EN before activation: PAZO may internally associate campaign/creative, first-touch time, verified signup and first-pet status with an account; no individual conversions are sent to Meta. Provide access/deletion request mechanism through existing privacy support. Do not claim that automatic analytics universally exempts PAZO from California privacy laws. Confirm applicable obligations and provider backups/PITR first.

Proposed notice ES: "PAZO puede medir internamente de qué anuncio llegaste y si completaste el registro o creaste tu primera mascota. Usamos identificadores limitados de campaña vinculados temporalmente a tu cuenta. No enviamos tus conversiones personales a Meta. Puedes solicitar acceso o eliminación mediante el contacto de privacidad."
Proposed notice EN: "PAZO may internally measure which of our ads brought you here and whether you completed registration or created your first pet profile. We temporarily associate limited campaign identifiers with your account. We do not send individual conversions to Meta. You can request access or deletion using our privacy contact."

30-day retention is a RECOMMENDATION, not an approved period. SQL hard ceiling is 90 days, initially 0; purge is not scheduled. Separate GO needed to install DDL with gates OFF; later GO to update notices, retention and enable collection; and independent GO for Meta ad spend. $0/$350.

## Nuevo incremento — contador de llegadas (solo código, OFF)

La medición de **llegadas** no puede identificarse como visitantes únicos si evitamos identificadores persistentes. Se implementó un indicador correctamente nombrado **señales de llegada** por día de Los Ángeles y por creatividad; su objetivo es orientación interna del rendimiento, no facturación Meta ni tasa exacta de conversión.

- Frontend: `stageMarketingLanding` valida los 4 UTM, no envía `fbclid`, UUID, correo ni URL; `PAZO_MARKETING_LANDING_ENABLED=false`. `sessionStorage` guarda localmente solo creatividad y tiempo para no enviar señales repetidas de la misma creatividad en la misma pestaña durante 24h. No constituye control antibots ni deduplicación entre pestañas/dispositivos.
- Edge: nuevo `pazo-marketing-landing`, flag `MARKETING_LANDING_RELEASED=false`. El endpoint está definido como público con `verify_jwt=false` en `supabase/config.toml` **solo en PR**, pero responde 503 mientras OFF. El control de cabecera Origin limita navegadores ajenos, **no autentica**: es falsificable por clientes automatizados.
- Backend: tabla `marketing_private.landing_daily` con `landing_day`, campaña permitida, creatividad permitida y conteo entero. No columnas de IP, identificador de persona, token, cookie ni evento individual. Función `public.pazo_marketing_record_landing_v1` solo service_role, gate SQL compartido OFF, incrementos atómicos y día en zona America/Los_Angeles.
- Reporte privado `marketing_private.daily_campaign_summary()`: compara señales de llegada con registros confirmados por fecha y creatividad, mostrando cada métrica por separado. **No calcular conversión visitas→cuentas con esos valores**: las altas pueden ocurrir otro día y los bots/recargas inflar llegadas; se requiere una definición confiable del denominador.
- Purga manual `public.pazo_marketing_prune_landing_v1()`, servicio exclusivamente, para filas diarias fuera de retención aprobada. No se programó cron. Todos los accesos anónimos y autenticados a tablas/RPC privadas siguen denegados.

**Bloqueadores de activación adicionales:** protección antibots/rate limiting en borde confiable, presupuesto de volumen y pruebas de carga, transparencia/retención para las señales de llegada, verificación de que la infraestructura/proveedor procesa metadatos técnicos de red conforme a su política, además de autorización separada para activar el endpoint público. Ningún anuncio o proveedor de medición externo se habilitó.

## Panel de administración — preparado, lectura OFF

La navegación existente de `AdminDashboard` ahora incluye **Campañas / Campaigns** en móvil y escritorio, manteniendo la disposición y estilo de PAZO. `AdminMarketingPanel` es una vista independiente del resumen general, soporte, mantenimiento y PayPal, para que su error eventual no bloquee las otras secciones.

- Contrato tipado: `adminMarketingSummary(days)` usa `supabase.rpc('pazo_admin_marketing_summary', {p_days: 7|30|90})`. La función se define en la migración pendiente del PR, **no está instalada**.
- Consulta SQL `SECURITY DEFINER` restringida por `auth.uid() IS NOT NULL` y `public.pazo_is_admin()` de PAZO; acceso `EXECUTE` concedido a `authenticated` solamente, denegado a `anon`, `PUBLIC` y `service_role`. Solo retorna JSON de totales y filas diarias, sin `owner_id` ni correos; ventana acotada 7/30/90 días.
- Estado `PAZO_MARKETING_ADMIN_REPORT_ENABLED=false` independiente de los interruptores de ingreso. Mientras siga OFF el panel muestra **en preparación**, sin llamar RPC, sin inventar cero ventas, cero visitantes o resultados de Meta.
- Cuando se autorice una activación posterior, mostrará señales de llegada, cuentas confirmadas, primera mascota creada en siete días y proxy D7, más filas por creatividad y fecha. Sin ROAS, presupuesto gastado ni tasa de conversión basada en los conteos de señales.
- Accesos denegados, estado no configurado, rechazo de períodos arbitrarios, datos agregados y ausencia de identificadores se comprueban en PG17 sintético; contratos de pantalla y cliente se prueban en Node. No se alteró la protección general de la cuenta administradora.

**Próximos gates:** verificación de carga responsive y compilación CI; decidir retención, implementar borrado programado y controles antiabuso reales, actualizar Política de Privacidad, instalar con autorización separada y recopilar solo tras un GO adicional. No publicar PR #91 ni activar publicidad por aprobar estas pruebas.

## F17 — Control de abuso y plan de borrado por calendario (código, aún OFF)

La ruta pública de señales de llegada incorpora ahora topes **atómicos en PostgreSQL**: hasta **30 señales por minuto y 3,000 señales por día por creatividad**. La escritura en la tabla diaria y el cupo del minuto se confirman o revierten juntos; el exceso devuelve rechazo sin incrementar el contador. Las tablas no contienen IP, UUID, identificador de visita, cookie ni user-agent. El cupo de minuto se depura después de 48 horas.

**Limitación crítica:** estos topes no autentican una visita genuina. Un bot puede falsificar Origin y UTM, inflar señales hasta el límite e impedir el conteo de tráfico legítimo al consumir el cupo. Son un *circuit breaker* de almacenamiento/costos, NO una defensa antibot suficiente ni una medición de personas únicas. La activación del endpoint anónimo exige revisar protección adicional en el borde confiable (WAF/rate limits adecuados) y su tratamiento de IP por el proveedor.

`public.pazo_marketing_prune_all_v1()` (solo `service_role`) unifica depuración de atribuciones por plazo aprobado, agregados diarios y ventanas de límite de 48h. La migración por sí sola **NO instala un cron**, mantiene recopilación y purga programada inactivas. El archivo de operación separado `supabase/operations/marketing-retention-cron-activation.sql` propone Supabase Cron **cada 6 horas** (minuto 17 UTC), con precondiciones explícitas: extensión `pg_cron` ya habilitada, periodo mayor que 0, versión publicada del aviso. No se ejecuta con db push ni con CI y requiere GO específico de operador.

**Secuencia de activación futura:** revisar el aviso de privacidad ES/EN y obligaciones regulatorias; aprobar el plazo de datos (30 días es solo una propuesta); configurar `retention_days` y `policy_version` todavía con recopilación OFF; instalar y verificar cron y ejecuciones; comprobar backups/PITR; revisar WAF y cuotas del endpoint; validar pruebas end-to-end; habilitar recopilación en un GO independiente. No se debe activar la recopilación con el programador de borrado sin verificar. Los respaldos no se eliminan instantáneamente por una purga de la tabla viva.

Los tests SQL/Node son sintéticos y sin datos reales. Los anuncios y gastos siguen detenidos, y el PR #91 continúa DRAFT.
