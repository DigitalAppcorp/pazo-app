# PAZO — Auditoría publicitaria de solo lectura (2026-10-23)

**Estado:** `PAID_ADS_NOT_READY`; no ejecutar medios todavía. Auditado bajo Brain OS Marketing v0.1.0. Este documento registra **preparación**, no una QA E2E de producto ni una revisión legal definitiva.

## Alcance y evidencia confirmada
- Repositorio: `DigitalAppcorp/pazo-app`; base auditada `main` SHA `a99f05d2dab3baf5a4bc26b8fb64d790e7c4be2d`; cambios concurrentes/PRs posteriores deben revisarse antes de implementar.
- Aplicación: React/Vite PWA, `public/manifest.webmanifest`; `index.html` sin etiquetas GA4/Meta visibles; `src/App.tsx` flujo de splash (2.5s regular, 150ms reduced-motion), onboarding/actividad interna; no demuestra funcionamiento de URL desplegada.
- Auth: `src/context/AuthContext.tsx` ejecuta signup Supabase y llama `captureEvent('auth_signup_succeeded')`; `src/services/observability.ts` impide envío PostHog porque `isObservabilityEnabled() => false` (decisión PO 2026-10-10). No confundir llamada al método con evento recolectado.
- Onboarding: `src/components/views/OnboardingView.tsx`: registro con email/contraseña, confirmación de 18+, puede requerir confirmación de email, y creación de mascota. Existe fricción legítima; medir abandonos paso a paso con minimización antes de asignar ads.
- Telemetría first-party **existente pero no de adquisición**: `admin_private.app_activity_daily`, `public.place_usage_events`, `public.search_usage_events`, `public.module_validation_*`; `src/services/placeTelemetryService.ts` y `src/services/featureExperimentService.ts`. Ninguna une por sí sola campaña y usuario activado.
- Supabase proyecto de PAZO confirmado ACTIVE_HEALTHY en `us-east-1`; SQL estrictamente SELECT y conteos agregados. Snapshot: Auth8, profiles5, pets5 (4 propietarios), posts4, usuarios con actividad de módulo histórica4, sin Auth creados últimos 7 días. **Incluye pruebas/QA: prohibido describirlo como tracción externa.** No se consultaron emails, mascotas nominativas, GPS ni secretos.
- Dominio externo `https://pazo-app.vercel.app/`: web fetch de esta sesión no logró cargarlo; entorno de contenedor tampoco obtuvo conexión DNS. Por tanto **NO hay prueba nueva** de home/runtime, velocidad, funnel, mapa, cookies ni dispositivo real.
- Cuenta Meta Ads Manager/Instagram/Facebook y facturación **no conectadas/auditadas**. No se ha inspeccionado un Pixel, Dataset, Event Manager ni restricciones reales.

## Semáforo operativo
| Control | Estado | Evidencia/gate |
| --- | --- | --- |
| Visión del producto y propuesta de valor | PARCIAL | docs/PAZO_PRODUCT_VISION.md; hipótesis de comunidad aún no validada comercialmente |
| URL canónica/landing móvil | SIN PRUEBA VIVA | Requiere HTTP/navegador reales, Android e iOS y sesión nueva |
| Registro/confirmación email | IMPLEMENTADO EN CÓDIGO / SIN QA ADS | `OnboardingView`, `AuthContext`; probar E2E real |
| Evento completo de adquisición | NO VERIFICADO | No hay ruta first-party UTM→usuario confirmado→mascota→D7 |
| Retención y actividad interna | PARCIAL | app_activity_daily por módulo sin atribución de origen |
| Eventos Meta Pixel/CAPI / GA4 | NO VERIFICADO | No aparecen en archivos principales revisados; no inferir ausencia total del sitio/entorno |
| Exclusiones QA | NO GARANTIZADAS PARA ADS | Población actual incluye pruebas, se requiere cohortes separadas |
| Privacidad y tracking | GATE OBLIGATORIO | `PAZO_PRIVACY_DATA_GOVERNANCE.md` y `PAZO_DATA_INVENTORY.md`; nada de autocapture/GPS exacto/sesión-replay |
| Acceso Meta Ads, límites, facturación | NO AUDITADO | Conexión explícita del PO, solo lectura inicialmente |
| Dirección de creatividades | LISTO COMO BRIEF | Tres ángulos; assets finales aún no hechos/probados |

## Problemas de medición prioritarios
- `auth_signup_succeeded` puede corresponder a solicitud exitosa con `verify_email` y no representa usuario con acceso confirmado.
- Para `D7`, token refresh o actividad de cuenta QA no son retención comercial.
- Crear varias mascotas por cuenta no aumenta usuarios adquiridos.
- PostHog beta desactivado expresamente; no reactivarlo por conveniencia sin aprobación.
- Meta Pixel/CAPI podría añadir tratamientos de datos con reglas de consentimiento, configuración y supresión: no integrarlo por defecto.
- Confirmar que el evento de conversión se emita solo después de verificaciones reales de backend y sea deduplicado.

## Acciones propuestas, NO ejecutadas
1. Especificar protocolo first-party de UTM/sesión, consentimiento y event taxonomy; aprobar privacidad antes de escribir backend o UI.
2. Agregar/validar medición con mínimo de datos y separación QA, sin datos sensibles ni PostHog.
3. Smoke E2E real desde URL de un anuncio simulado → email verificado → primera mascota → acción útil; QA tablet/móvil.
4. Auditar Meta account billing/objetivo/Pixel con conexión read-only, verificar anuncio conforme a 18+, privacidad.
5. Revisión creativa real ES/EN, presupuesto por etapas y GO humano específico **posterior**.

**Autorizaciones intactas:** cero gasto, cero ad launch, cero cambios de cuentas, backend, producción, dominio y PayPal.
