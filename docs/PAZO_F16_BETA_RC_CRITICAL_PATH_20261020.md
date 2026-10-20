# PAZO F16 — ruta crítica real hacia Release Candidate Beta

**Fecha:** 2026-10-20. **Producto:** PAZO gratis; Amigo de PAZO opcional USD 2.99/mes. **Product Owner:** aprobó continuar desarrollo hasta cierre de beta, sin autorizar publicación de Preview, merge main, ni activación de pagos Live por el solo avance de código.

## Leyenda de evidencia
- `CODE`: módulo escrito; `CI`: pruebas unitarias/PG17 sintéticas aprobadas.
- `HOSTED`: DDL o Edge efectivamente instalados con prueba posterior.
- `PROVIDER`: identidad comercial, checkout, venta, devolución y ciclos corroborados en PayPal real.
- `E2E`: servidor + navegador/PWA, URL pública, usuario real autorizado y observabilidad.
- Una columna **no acredita** ninguna de las posteriores.

## Lo que sí está cerrado
| Gate | Evidencia | Límite |
|---|---|---|
| Sandbox legado | Pruebas y pago/cancelación anteriores aprobados por PO | No repetir sin regresión; no equivale a merchant Live |
| Dominio provisional de beta | `https://pazo-app-t83r.vercel.app` guardado mediante RPC admin y registro `draft` en Supabase | No acredita acceso público bajo Vercel SSO, HTTPS/PWA reales |
| Periodos/ventas/reembolsos | `liveVerifiedSettlement`, writer privado, refund gate y merchant-read adapters con CI | No hay worker financiero Live habilitado ni venta Live |
| Lector original de ventas | `supabase/drafts/f16_live_service_recorded_sale_reader_REVIEW_REQUIRED.sql`, `liveHostedRecordedSale.mjs`, `liveHostedRefundWorker.mjs` y tests PG17/Node | **CODE+CI solamente**, SQL no alojado y worker OFF |
| Auditoría persistente de aprovisionamiento | **HOSTED + 8/8 CI PASS**: tabla FORCE RLS, 0 filas y 3 RPC de uso exclusivo de service_role | Live sigue OFF; no hay credenciales ni merchant Live |
| Insignias originales de Amigo de PAZO | 4 PNG SHA-256/Git SHA-1 exactos en `public/supporter` y test en closure | Integración visual de UI y atribución pagada pendientes |
| PR F13 | PR #44 DRAFT, base `release/mvp-beta-fast-track-20261010` | No `main`, no deploy beta |

## Bloqueos de release (orden técnico)

1. **Auditoría persistente de provisión de secretos — HOSTED PASS.** Migración revisada `20261020200800_pazo_f16_secret_provision_audit_guarded.sql` aplicada por Supabase con postflight RLS FORCE ON, cero intentos y 3 RPC ejecutables solo por service_role; se cerraron el FK revocable y la concurrencia generación/switch. No requiere reinstalación. **El aprovisionamiento Live operativo sigue NO-GO**, pues faltan merchant, identidad verificada, reauth/endpoint y token de gestión limitado.
2. **Lectura y reclamación duradera de eventos — HOSTED NO-GO.** Inbox actual guarda `merchant_generation`, `event_id`, `event_type`, `linked_intent_id` y estado, pero no el ID/fecha de venta original ni ofrece a worker un claim firmado con la prueba completa. Diseñar RPC privada `service_role` de claim/idempotencia, recuperación tras caídas y fuente PayPal GET del evento original sin PII; no confiar en mocks ni GET directo desde navegador.
3. **Correlación de venta/ciclo histórico — PROVIDER NO-GO.** Refund puede llegar meses después de la venta. El servicio de historial de suscripciones consulta ventanas temporales limitadas a 31 días; usar fecha de webhook de reembolso para buscar una venta antigua sería incorrecto. Falta conservar/consultar `paidAt` original y adjudicación exacta de `cycleKey`, `serviceStart`, `serviceEnd` desde contrato prospectivo y PayPal. Pago tardío/retry/deuda y refund parcial pasan a revisión, jamás a un período nuevo supuesto.
4. **Credenciales de PayPal Live — SIN PROVISIONAR.** Lectura alojada: `admin_private.pazo_paypal_merchant_generations` tiene **0** generaciones Live. Panel Live tiene **dominio temporal y ID de plan guardados**, con app PayPal Developer creada y plan ACTIVE *según PO*; faltan webhook, identidad comercial verificada por API y custodia de credenciales Live por generación. PO debe proporcionarlos únicamente por flujo privado autenticado; **no** en chat, repositorio, variables Vite públicas o PowerShell.
5. **Autorización fuerte del panel — NO-GO HOSTED.** Código de GoTrue + `pazo_is_admin`, TOTP reciente y componente MFA existen con tests; faltan activación/integración completa y verificación de sesión real alojada del operador. JWT refrescado no constituye step-up. No interpretar renovación de JWT como nueva prueba de contraseña/MFA. `pazo-admin-paypal-provision/index.ts` `RELEASE_APPROVED=false` y no desplegado.
6. **Conciliador privado y beneficios — HOSTED NO-GO.** `liveHostedRefundWorker` es combinación de adaptadores con `released=false`; depende de secretos generacionales, claim duradero, lector de sale instalada y la RPC writer service-only. Validar cancelaciones, renovaciones, reversos, disputas, pagos duplicados, derechos y medallas con el período verificado. Mantener checkout Live y entitlements OFF hasta completar.
7. **Alojamiento beta accesible — NO-GO.** Proyecto Vercel `pazo-app-t83r` reporta `ssoProtection.enabled=true`, tipo `all_except_custom_domains`. El host provisional `vercel.app` y `/paypal/return` no fueron accesibles desde la comprobación externa; no asumir que la beta será pública. Resolver acceso público TLS, redirect refresh y PWA instalada/no instalada, sin desactivar protección antes del GO de publicación.
8. **QA de producto/operación — PO PENDIENTE.** **Los 4 PNG originales YA están importados e íntegros** en `public/supporter`, no repetir extracción; falta verificar su integración en UI/beneficios y aceptar visualmente panel responsive y pantallas de membresía; privacidad/retención, protección de contraseñas filtradas, ACL/seguridad, alertas/backups/rollback, URL y textos legales; generar único SHA candidato y preview privado con autorización PO.


## Regla PO sobre la beta (prevalece sobre rutas antiguas)
**F16 completo antes de publicar**: panel `Guardar y activar`, credenciales administrables sin nuevo SQL/código, Sandbox/Live, webhooks, conciliación, reembolsos, cancelaciones, períodos pagados, badges/entitlements y rollback alojados y verificados. El PO puede decidir activar Live antes o después del lanzamiento, pero la funcionalidad completa debe estar implementada y probada en ambos casos. **Una beta gratis con el sistema Live todavía por construir NO cumple la decisión aprobada.** Go de cobro real, de despliegue y de beta son decisiones independientes.

## Orden de trabajo operativo
- Terminar código/PG17 en F13 y mantener cambios en PR #44 DRAFT.
- Revisar e instalar únicamente migraciones aprobadas por su propio gate; postflight de ACL, filas, Live OFF y rollback. No sortear controles de herramientas.
- Validar reautenticación, aprovisionamiento seguro e identidad PayPal Live desde admin, sin secretos en el chat.
- Conectar queue→PayPal GET→owner/original merchant→paidAt/cycle→ledger→entitlements, y cubrir reintentos/disputas y cancelaciones.
- Completar visual, privacidad, seguridad y operaciones; resolver SSO/HTTPS; obtener aprobación PO de un único preview del SHA, QA público/PWA y GO separado para publicar/mover `main`.
- **No declarar beta LISTA** mientras cualquiera de los bloqueos anteriores siga sin pruebas HOSTED/E2E.

## Punto de continuidad
**Actualizado en recuperación 20-oct-2026:** código/branch remoto previo al handoff `1cfcf2be387978b9eb1338de5bc4424ae39dd419`, **8/8 Actions SUCCESS**. Migración de auditoría `20261020200800_pazo_f16_secret_provision_audit_guarded` INSTALADA y verificada: tabla 0 intentos y tres RPC servicio-only; no reinstalar. El lector original de ventas staged sigue solo CODE+CI. Live sigue Sandbox/killswitch ON, generaciones Live 0; dominio y plan ID guardados, webhook ID vacío. Las cuatro insignias originales ya están en la rama. Para nueva HEAD y gates precisos leer `docs/PAZO_ACTIVE_HANDOFF.md`. No repetir Sandbox aprobado.
