> **Actualización #84 (23-oct):** #83 ya está integrado en F17; SQL/3 Edge y beta oficial están instalados inactivos, desde d9fd7506. Checksum corregido antes del primer apply y matriz alojada/Live en [reporte #84](PAZO_ISSUE84_BETA_RELEASE_EVIDENCE_20261023.md). Las etiquetas «no autorizado/no instalado» y el hash inferior describen #82 antes de esa autorización y quedan superados por ese registro; la matriz de pruebas aisladas se conserva. No hay GO financiero ni revisión visual PO nueva.

# F16 — implementación gradual Live, issue #82

**Fecha:** 23-oct-2026. **Estado de entrega:** código implementado en rama,
`CODE_DONE / DB_MIGRATION_PREPARED / READY_FOR_HOSTED_GATE`; **no release**.
Base auditada en GitHub: F17 `872ff8c37c8332c5412fbbbb79db33d09ae1f003`, PR #81
DRAFT hacia `main`. Rama: `f16/gradual-live-event-rollout-20261023`, [PR #83 DRAFT hacia F17](https://github.com/DigitalAppcorp/pazo-app/pull/83). Código verificado: [`8f0869a02e462908dcfc23d11f20d76dc146d433`](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433). [CI PASS, ambos jobs](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101). La actualización posterior de este documento registra esa evidencia; no cambia código de producto. CI también comprueba el HEAD documental del PR.
No se modificaron producción, credenciales, merchant, plan, scheduler ni `main`.
No hubo PayPal CREATE, emails, SMS, push ni notificaciones a cuentas reales.

Precedencia: orden de implementación del 23-oct, GR-01…22 y EVT-01…19.
Las decisiones 1→5→20→50, umbrales 1/3/10 y ausencia de espera de 24h están
implementadas; los documentos anteriores se conservan como historia superada.

## Cambios concretos y contratos

| Superficie | Implementación / propósito |
| --- | --- |
| PostgreSQL | Migración `20261023211315_pazo_f16_gradual_live_event_rollout.sql`: campaña privada inactiva/gate falso, FIFO por dueño, invitaciones 72h, reservas, admisión histórica, incidencias, auditoría, eventos y outbox. FORCE RLS, ACL y grants explícitos |
| Admisión | Lock de campaña antes de original checkout_begin y provider_claim. Conserva consentimiento inmutable, idempotencia por cuenta/intento, generación/origen y confirmación del proveedor. Ningún permiso del navegador sustituye el POST |
| Cuota | Un cupo inicial; 1/3/10 dueños distintos con venta firmada+período+proyección promueven 5/20/50. Renovaciones/cortesías/ACTIVE sin venta no promueven. Aprobación real del contrato consume admisión histórica conservadora; incertidumbre retiene reserva. Cancelación no revende plazas históricas |
| Worker | Triggers solo encolan, evitando invertir locks del escritor financiero. Tras completar el drain privado original se reconcilia campaña y se entregan hasta diez avisos con lease. Un fallo de entrega jamás repite liquidación financiera. Siguiente drain recupera lo durable; health/procesamiento OFF no ejecutan mantenimiento |
| Salud | Webhook GET original, worker fresco, artifact y switch coherentes, ausencia de holds/inbox retenido/incidentes. Proyección inválida o excepción produce pausa segura. Revisión de incidente no reanuda por sí sola |
| Usuario | `useGradualStatus`, `GradualCampaignPanel`, integración real en membresía y beneficios. ES/EN, estados de cola/cupo/pago/verificación/beneficio/incidencia y cobertura terminada. Estado/acciones/pending derivados juntos del servidor, incluidos vencimientos. GET al entrar/focus/online/retorno/hash; fallback 20s visible, sin Realtime obligatorio. Cambio de cuenta cancela/descarta respuestas anteriores |
| Checkout UI | Interés accesible aunque GET PayPal deniegue pagar. Cambio de cupo relee oferta del servidor sin remount ni nuevo CREATE automático; un POST incierto sigue protegido. Se conserva recuperación/abandono aprobados |
| Notificaciones | `supporter_campaign` y `supporter_verified`, dos identidades por campaña/dueño. Invitación actualiza mismo UUID a espera/cupo; ACK+inbox en transacción, versión/lease rechazan escrituras viejas. Navega a cuenta protegida; no abre PayPal. Copy `review_v1` preservada; `thanks_v2` preparada, sin control que la active automáticamente |
| Feedback | OK/problema/omitir, un resultado por cuenta; componente enumerado. Problema crea ticket F17 privado idempotente y no cambia pago, entitlement ni cuota. Cuenta pagada ajena a campaña no recibe formulario huérfano |
| Administración | Métricas agregadas, ingresos ledger sin períodos retenidos separados de cortesías, reservas/admitidos/cola/pago/feedback/avisos, incidentes, worker y auditoría. Nuevo Edge valida GoTrue/admin/TOTP reciente, origen oficial, JSON acotado, confirmación exacta, nonce y CAS; respuestas sin secretos |
| Controles | Inicio, pausa, STOP, revisión, reanudación y GO público separado tras 50. Inicio bloqueado por legado incierto/gate pendiente; contrato anterior pagado/proyectado se aísla sin exigir cancelación. El control antiguo no puede pasar a canary/public después del inicio gradual. Pausa no cambia worker/webhook ni gestión histórica |
| Privacidad | Inventario y textos legales ES/EN actualizados. Limpieza operativa real en worker: eventos procesados 90d, avisos/intereses sin intento/feedback 90d tras STOP; Auth CASCADE. Admisión y auditoría financiera conservan política restringida existente |
| Integración | Sin cambio de dependencias de producción. Mapbox y recursos del mapa sin diff contra F17. Nuevo workflow comprueba el SHA exacto de la rama, no solo el merge sintético |

Decisión técnica: lease de reserva no iniciada configurable en tabla privada,
`reservation_seconds=900` por defecto (60–3600); **no** timeout de PayPal. Se
expira solo sin claim, suscripción, recovery lease ni eventos. Después de CREATE
se exige conciliación terminal original. Reingresar tras retirar interés recibe
nueva secuencia FIFO; dedupe evita reiniciar cupo por un retry y el reenrolamiento
se limita a una vez por diez segundos. Opt-out impide recontacto de campaña.

## Pruebas reproducibles

- `npm run test:gradual:pg17`: crea/reutiliza solo Docker `pazo-f16-gradual-lab`, PostgreSQL17, sin puertos públicos; ejecuta kernel F16 real preexistente, rehearsal ROLLBACK y COMMIT de la migración exacta, fallos, permisos y concurrencia. Los modelos Auth/perfiles/notificaciones son mínimos sintéticos; las funciones financieras son las migraciones reales. El runner no acepta URL Supabase ni secretos alojados.
- SQL directo: `supabase/tests/gradual/{kernel,failures,security}-pg17.sql`. Cuota 1/3/10, décima venta retenida no promueve, renovación misma cuenta no cuenta, proyección futura/excepción, replay/lease, tickets privados, expiry, CAS, gate inicial, legado intacto, cobertura vencida y limpieza sin tocar ledger.
- `scripts/f16-gradual-live-concurrency.mjs`: sesiones PG reales simultáneas; 25 intereses → 1 cupo/24 espera, 25 lecturas propias y retries; 60 intereses en cap50 → 50 reservas/10 espera; POST del que espera rechazado; drains simultáneos; 50 admisiones históricas y cancelación no liberan cuota ni abren público.
- `npm run test:gradual`: **50 PASS** (14 nuevos casos Edge/avisos y 36 regresiones existentes). Incluye MFA/actor/confirmación/CORS/body acotado, pérdida de ACK, límite diez entregas, readiness LIMITED, error del mantenimiento sin replay financiero, copy ES/EN y fuentes tipadas.
- Navegador interceptado: `npm run test:gradual:browser`, Vite local 5183, configuración pública sintética y Playwright efímero. **72 PASS**, 390/1440px, ES/EN, pantalla real de cuenta, cola con checkout denegado, grant relee términos, reconexión, estados financieros, feedback, cambio de cuenta y gates admin. **Cero CREATE** y cero tráfico externo sin interceptar. Capturas en artifact CI; inspección local confirmó distribución y foco sin contornos. Esto no equivale a aprobación visual PO.
- `npm run test:governance`: PASS (hardening, arquitectura, privacidad, ops, MVP/PWA, 511 casos de closure, cero emojis). Harness de aislamiento anterior adaptado para la dependencia nueva; su aserción de no filtrar cuentas no se elimina.
- `npm run test:f16:synthetic`: **1194 PASS**, contratos offline. No se reejecutó el QA Sandbox real aprobado ni se recreó plan/webhook.
- Regresión F17/map/maintenance: **20 PASS**; `test:release:guard` PASS. Mapbox `src/features/places` y assets sin diff contra base; no se repitió revisión del mapa con proveedor real.
- TypeScript/Vite build PASS; aviso de bundle grande ya conocido. ESLint de módulos nuevos PASS. El lint global tiene 142 errores/18 warnings frente a 143/18 en la misma base F17, sin diagnósticos nuevos por archivo/regla/mensaje; no se presenta como gate global PASS.

Commit reproducible: el workflow `f16-gradual-live.yml` hace checkout de
`github.event.pull_request.head.sha`. Cada fila siguiente refiere al **mismo commit de código
8f0869a0**, probado íntegramente en la ejecución enlazada. Los posteriores cambios documentales se comprueban nuevamente en [los checks del PR #83](https://github.com/DigitalAppcorp/pazo-app/pull/83/checks), sin convertir los gates alojados en PASS. El lab espera el servidor TCP final de la imagen PG17, evitando confundir el socket temporal de initdb con disponibilidad estable.

## Scope Closure — GR

`PASS` significa código/prueba aislada indicados. `BLOCKED` identifica un gate
real reservado al PO; no implica que se haya omitido su implementación.

| GR | Estado | Prueba directa | Commit | Enlace CI |
| --- | --- | --- | --- | --- |
| 01 | PASS | Oferta existente intacta, legal ES/EN y navegador real de cuenta | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [gradual-browser](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 02 | PASS | Cinco/72h/reemplazo, dos hilos, lease/ACK; copy bilingüe y CTA cuenta | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + tests](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 03 | PASS | Auth FIFO/dedupe, opt-out, onboarding/ban/deletion/operator, 25 cuentas | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 04 | PASS | Interés no crea intent; queue GET propio, POST sin cupo denegado | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + browser](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 05 | PASS | 25/60 sesiones concurrentes, 50 reservas/admisiones, cancelación conserva cuota | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 06 | PASS | RPC wrappers llaman consentimiento/claim original, expiry rechaza claim, 36 regresiones | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [tests + pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 07 | PASS | Recuperación original preservada; cuenta anterior aislada y CTA sin cambios | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [governance + tests](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 08 | BLOCKED Live real; PASS aislado | Ledger/recibos originales sintéticos, renovación/replay/holds; falta autorización E2E Live | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + synthetic](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 09 | BLOCKED Live real; PASS aislado | Proyección requerida, excepción/expiry/hold sin falsa activación; falta E2E alojado | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 10 | PASS | Aviso solo ledger+beneficio, una vez, ACK perdido/renovación sin duplicar | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + tests](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 11 | PASS | Feedback idempotente, un ticket privado, derechos intactos, skip en navegador | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + browser](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 12 | PASS | Pausa por proyección/holds/worker, recuperación segura y cola preservada | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + tests](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 13 | PASS | Gatillos 1/3/10, décima retenida bloquea, nunca auto-public | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 14 | PASS | Agregado admin/RLS, métricas separadas, estados vacíos/error/móvil ES/EN | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + browser](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 15 | PASS código; BLOCKED GO real | MFA/origen/nonce/CAS/audit, legacy guard y gate público | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [tests + pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 16 | PASS aislado | Pausa no toca worker/switch/ledger, recovery histórico y refund/lifecycle regression | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + governance](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 17 | PASS preparado | Legal/inventario, RLS own/admin/service, limpieza comprobada sin borrar finanzas | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + governance](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 18 | PASS automatizado; BLOCKED QA PO | PG concurrente y 72 comprobaciones UI con screenshots; CI requerido | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [ambos jobs](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 19 | PASS preparado; BLOCKED despliegue | Runbook y fallback pausa; no SQL/Edge/Vercel alojados ejecutados | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [build](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 20 | PASS conservación | Diff vacío del mapa/recursos y 20 pruebas F17; QA PO previo conservado | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [governance](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 21 | PASS preparado | review_v1 intacta y thanks_v2 versionada, cambio futuro no activado | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [tests](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 22 | PASS rama/PR; BLOCKED main | Base F17 auditada, PR DRAFT, CI mismo SHA; no merge autorizado | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [checks](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |

## Scope Closure — EVT

| EVT | Estado técnico | Prueba directa | Commit | Enlace CI |
| --- | --- | --- | --- | --- |
| 01 | PASS | 25 sesiones PG simultáneas, 1/24 | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 02 | PASS | Primera venta/proyección promueve 5 en tick durable | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [kernel-pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 03 | PASS | Tercer dueño verificado promueve20 | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [kernel-pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 04 | PASS | Expiry sin CREATE; begin sin claim cierra seguro y siguiente cola | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [security-pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 05 | PASS | Provider_started retiene cupo vencido; original recovery regresión | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [failures-pg17 + tests](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 06 | PASS | Event replay + otro ciclo del mismo dueño no cuentan ni avisan de nuevo | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [kernel-pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 07 | PASS | Pago sin proyección y excepción pausan, agradecimiento aplazado | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [failures + security](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 08 | PASS | En L3 conserva 21…25; décimo válido entrega nuevos cupos | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [kernel-pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 09 | PASS | 25 GET propios, retries dedupe, online PWA y términos releídos | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + browser](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 10 | PASS | Ledger durable, drain simultáneo y recuperación tras falta de proyección/ACK | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + tests](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 11 | PASS aislado | Pausa solo admisión; recovery/ledger/switch conservados; financieros regresión | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17 + governance](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 12 | PASS aislado | Ausencia de firma/beneficio no emite; formulario requiere campaña y pago | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 13 | PASS | POST sin slot responde controlled_release_admission_denied | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [concurrency](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 14 | PASS | 60 writers y 15 drains concurrentes, locks reales | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [concurrency](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 15 | PASS código; BLOCKED legado real | Intent pendiente bloquea inicio; contrato pagado/proyectado se aísla y conserva renovación; alojado intacto | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [kernel-pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 16 | PASS | Décimo distinto firmado+proyección promueve50 sin espera | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [kernel-pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 17 | PASS | Nueve + décimo en hold no promueven; otra renovación no suma dueño | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [kernel-pg17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 18 | PASS | 50 contratos/admisiones acumulados; 51.º queda en cola, nunca público | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [concurrency](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |
| 19 | PASS | 25 filas persisten y L4 ofrece siguientes cupos FIFO | [8f0869a0](https://github.com/DigitalAppcorp/pazo-app/commit/8f0869a02e462908dcfc23d11f20d76dc146d433) | [kernel + concurrency](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40031193101) |

## Estados independientes y siguiente operación

| Estado | Resultado |
| --- | --- |
| CODE_DONE | Implementado y probado en rama; no fase COMPLETADA/merged |
| DB_MIGRATION_PREPARED | PASS; SHA-256 `1962cedd721923cbc1846e51b4037dda2c3fca76a77def03c5391c72a0f99a38` |
| DB_HOSTED_APPLIED | BLOCKED: no autorizado ni ejecutado |
| EDGE_DEPLOYED | BLOCKED: funciones nuevas/actualizadas no publicadas |
| USER_UI_QA | Automatizado local PASS; revisión alojada/visual PO BLOCKED |
| PAYPAL_LIVE_E2E | BLOCKED: ningún pago real autorizado/intentado |
| LIVE_LIMITED_RELEASE | BLOCKED: requiere GO financiero posterior y legado conciliado |
| PUBLIC_RELEASE | BLOCKED: GO independiente futuro, nunca automático |

Auditoría alojada inicial **solo lectura agregada**, sin identidades: modo
`canary`, revisión1, un intent abierto, cero períodos pagados, cero tablas
graduales. No faltan credenciales por suposición. No se cambió ese estado.

Única siguiente intervención necesaria: revisión del PR y autorización precisa
para **el gate alojado inactivo**, sin cobro ni campaña. El despliegue y el GO
financiero no se mezclan. Procedimiento completo y apoyo desde la computadora:
[runbook](PAZO_F16_GRADUAL_HOSTED_GATE_RUNBOOK_20261023.md).
