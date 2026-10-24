# Issue85 — código instalado; L1 bloqueado por estado remoto desconocido

Al 24-oct-2026, la parte técnica está implementada, integrada en F17, instalada y probada. **L1_ACTIVATED = BLOCKED**: el GET de la suscripción original devuelve **404 RESOURCE_NOT_FOUND**. El plan original y el evento remoto coinciden con la evidencia firmada, pero no se pueden verificar el estado actual ni sus pagos/renovaciones. Ledger local0 no prueba ausencia de obligaciones en PayPal.

Autorización: [issue85](https://github.com/DigitalAppcorp/pazo-app/issues/85) y petición del PO; GO L1 ya concedido. MFA reciente sigue obligatorio dentro de PAZO. No se declara F16/F17 COMPLETADA ni se fusionó main. No se reabrieron Sandbox ni aprobaciones visuales anteriores.

| Item | Resultado | Evidencia verificada | Commit / URL |
| --- | --- | --- | --- |
| Código F17 | PASS | PR86 y corrección de diagnóstico PR87 integrados | [86](https://github.com/DigitalAppcorp/pazo-app/pull/86), [87](https://github.com/DigitalAppcorp/pazo-app/pull/87), F17 `2b63907bad17c4c8bc9581a3f3e91a15b1ae3800` |
| CI final | PASS | 4 workflows/12 jobs, PG17 real, 65 tests gradual, 1194 sintéticos, 511 governance, 84 aserciones UI ES/EN móvil/escritorio, build | [CI](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40046309216), [gradual](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40046309318), [seguridad](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40046309325), [bootstrap](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40046309350) |
| SQL / Edge | PASS | Tres migraciones; worker10/checkout6/admin2 ACTIVE, 31/9/6 archivos exactos contra source | [Manifiesto](evidence/issue85/release-manifest.json) |
| Exclusión QA | PASS | Auth8, QA8, reales0, elegibles prebeta0; admin1/MFA1 conservados | [SQL final](evidence/issue85/hosted-postflight.json) |
| Inicio sin reales e invitaciones futuras | PASS en PG17 | Inicio con0 no avisa; al llegar8 reales invita solo5, 72h/FIFO, reposición e idempotencia | `supabase/tests/gradual/real-cohort-pg17.sql` |
| Beta oficial | PASS | Production READY, alias oficial sin error; frontend `fbe6c751` | [PAZO](https://pazo-app.vercel.app/), `dpl_4Jrf1ngDemBdCKoDTXmXwnb9ekCx` |
| QA alojada | PASS técnico | 51 Chromium real, 7 HTTPS/PWA, 11 readiness/denegaciones sin payload financiero válido; advisors0 ERROR | [Chromium](evidence/issue85/canonical-chromium.json), [PWA](evidence/issue85/public-http.json), [HTTP](evidence/issue85/hosted-http.json) |
| Contrato original / HELD | BLOCKED | Plan/evento originales corroborados; suscripción404; recheck devuelve review/processed0 sin mutar evidencia | [Recheck redactado](evidence/issue85/provider-recheck-redacted.json), request3404 |
| Certificado hosted gate | BLOCKED | Implementado/probado; no se certifica alojado con legado1/HELD1; gatefalse/certificados0 | [SQL final](evidence/issue85/hosted-postflight.json) |
| Inicio L1 GoTrue/TOTP/CAS | BLOCKED | No se invocó start ni se simuló sesión/MFA; inactive/canary/cap1/revisión0 | [SQL final](evidence/issue85/hosted-postflight.json) |

## Cambios implementados

1. Auditoría privada del contrato canary prebeta bound: binding/plan/generación y Vault originales, OAuth técnico y GET plan/suscripción/transacciones completas/evento. Corrobora el evento independientemente aunque la suscripción falle. Respuesta sin IDs/pagador/secretos ni cuerpo arbitrario del proveedor; enum de error y referencia PayPal acotada para soporte privado. Dispatch de **un uso, 120s**, bajo admisión original; sin token reusable ni CORS de navegador. No CREATE/CANCEL/grants.
2. Clasificación QA privada durable, cutoff **2026-10-23 22:59 UTC**, FORCE RLS sin acceso directo cliente/servicio. Excluye también allowlist Sandbox de elegibilidad, checkout nuevo, avisos al encolar/reclamar/entregar, compradores, conversiones, ingresos y promociones. No borra ledger/receipts/Auth/Storage. La clasificación real de una admisión es inmutable: eliminar Auth no libera capacidad histórica ni convierte QA en real.
3. Corrige presupuesto inicial de cinco invitaciones: el pump anterior reponía solo expired_count, dejando sin invitación a futuros usuarios si arrancaba vacío. Mantiene cinco invitaciones pendientes/interesadas, orden por creación/FIFO, 72h, sin recontactar rechazos ni duplicar avisos.
4. Administración muestra QA excluidos y reales elegibles ES/EN en las superficies actuales. Métricas financieras filtran QA sin reescribir contabilidad. UI prueba que legado pendiente bloquea inicio aun con confirmación/MFA sintéticos. Diff de mapa/assets contra base F17 `67fbf675` vacío; sin dependencias ni términos comerciales nuevos.
5. Recheck explícito: exige auditoría completa auténtica, cero transacciones/pagos, status/timestamp genuinos y firma corroborada. ACTIVE,404, pagos o datos incompletos mantienen STOP. RPC service-only exige batch privado/processing ON y guarda estado/código/attempts anteriores, digest y nonce; tope3, sin resetear intentos ni marcar processed. Reencola HELD para el lease/lifecycle originales; no reclama un evento ya procesado. Solo cierra CANCELLED/EXPIRED tras segundo GET terminal y closer original sin eventos/holds/obligaciones pendientes. No cancela en PayPal.
6. Certificado técnico privado de postgres: commits, hashes de bundles/evidencia, origen canónico, fecha y revisiones. Valida legado0/inbox procesado/holds0/incidentes0, worker/webhook/switch/artifact y política QA; nonce/CAS/idempotencia. FORCE RLS, sin EXECUTE anon/authenticated/service_role. No concede MFA ni inicia campaña; start sigue pasando por Edge admin, GoTrue/TOTP reciente, confirmación, nonce y CAS.
7. PR87 corrige diagnóstico: el rechazo404 aparecía como batch idle aunque conservaba el bloqueo financiero. Ahora es review en respuesta/completion. Verificado en v10; no mantenimiento desde auditoría/reconciliación.

## Versiones instaladas

Supabase CLI generó las migraciones y la API las aplicó desde commits probados; asignó timestamps posteriores al archivo fuente. Se conservó contenido exacto y se documenta la correspondencia, sin reparar historial ni reaplicar mediante db push.

| Archivo fuente | Versión API | SHA-256 |
| --- | --- | --- |
| `20261023234845_pazo_f16_qa_original_read_audit.sql` | `20261023235424` | `c3af403f0b5b7f264869ebe572c15653227a9bd6fedc633f073ebd4234780740` |
| `20261023235247_pazo_f16_real_cohort_initial_invitation_budget.sql` | `20261024001615` | `2d36b14512ab1646828d83be3b8788cb181776cb7303b693400f16aaf152b026` |
| `20261024000800_pazo_f16_original_qa_recheck_and_hosted_gate_certificate.sql` | `20261024003716` | `37c98176d659b0de94a47b94b6bb1c5178edb3985d840c6fbd2b3c2e8e52cde8` |

Worker10 hash `97850c30407dcf2c3de5b874f29b558ea06a7b6944fffdd5de729b6655514aa1`, checkout6 `75a4935b2e04f31c84666873d364ca6811a41df7b989844ceba2ff3a4711fa33`, admin2 `f40b6ba350b183fddd506c0761c82078bf3b88b6773a6ad9126b4bc1e7e8eb5a`. Recuperación y comparación exacta de archivos contra F17 `2b63907b`. JWT checkout/admin true; worker mantiene su capacidad privada original/JWT false sin degradar protección. No se cambiaron webhook2, account7, merchant/generación/plan, secrets ni scheduler.

Frontend production `fbe6c7515ee8930f7841dc8a25b3aaa912e836da`, READY24-oct00:39:17 UTC, alias oficial sin error. PR87 posterior solo modifica worker/test: diff frontend vacío, no requiere otro frontend. Chromium final CI40046309216/job120728721671 corrió00:43:36 UTC contra el dominio publicado. Documentación posterior no modifica estos artefactos.

Postflight00:44:24 UTC: intent fingerprint **`a3e08eed1526f073fb8a5e29a8e17199`**, receipt **`b03b36d90332b579e8ce3829cfd417d6`**, ambos idénticos al preflight. Un intent abierto, CREATED HELD claim1/worker_review_required, rechecks0, ledger local0, intereses/invitaciones/outbox/admisiones0, certificados0, new_create_admitted=false y recuperación original permitida. Las11 tablas gradual tienen RLS+FORCE y clientes sin SELECT/INSERT directos. No invitaciones, CREATE/CANCEL ni concesión de beneficios.

## Verificación y límites

PG17 descartable prueba migraciones exactas, rollback transaccional, concurrencia, roles, idempotencia/pérdida de respuesta, agotamiento de retry, clasificación tras borrar Auth y certificado positivo/negativo. Los fixtures que cierran contratos o simulan PayPal están exclusivamente en f14_synthetic local/CI; nunca se copiaron a hosted. Las65/1194 pruebas son offline, sin repetir Sandbox aprobado. Build PASS con aviso de bundles grandes preexistente.

CI PR86 `40045703400` y merge `40045860409/40045860387/40045860399/40045860497` PASS; PR87 `40046118819` y merge final de la tabla PASS. Advisors sin ERROR: persisten avisos de SECURITY DEFINER/RLS sin policies deliberadas en tablas privadas, protección de contraseñas filtradas e índices; no se compró plan ni revocaron contratos legítimos. No se afirma lectura de logs Vercel limitada en #84.

No hay navegador local conectado. MFA positivo se prueba sintéticamente; ACL y denegaciones se prueban alojados. No se tomó una sesión admin ni se simularon tokens. Chromium alojado usa TLS normal; no se cambió protección Vercel. Permiso de ejecución/red del entorno resolvió EPERM de subprocess/Docker, sin deshabilitar TLS. No se atribuye al PO aprobación visual nueva ni se solicita repetir la anterior.

## Intervención necesaria y continuación segura

**Única acción humana ahora:** consultar en PayPal Business Live el ID original y su historial, sin aprobar una compra. Referencia exacta de suscripción/plan, fecha y correlación404 en el archivo privado `/workspace/pazo-issue85-private-backup/REFERENCIA_PAYPAL_85.txt`, fuera de Git. Si no aparece, pedir a soporte PayPal aclaración del ID/404. Comunicar solo estado y existencia de pagos; nunca claves, código MFA o datos del pagador. La respuesta humana orienta investigación, no reemplaza lectura auténtica para cerrar el intent. ACTIVE, pagos o incertidumbre mantienen STOP. No borrar ni recrear la solicitud.

Cuando vuelva una lectura verificable: corroborar generación/binding/plan/transacciones/evento, resolver lifecycle por recheck original. Si APPROVAL_PENDING, cualquier retiro/cancelación requiere flujo original y consentimiento del titular, y verificar remoto terminal. Certificar únicamente después de legado0/held0/holds0/salud OK y hashes/alias/CI reales. No poner gate=true ni llamar SQL start para saltarse controles.

**MFA después de resolver finanzas:** PAZO → Administración → Configuración · PayPal → PayPal Live → Control de cobros → **Verificación reforzada de administrador**. Introducir seis dígitos en **Código del autenticador** → **Verificar**. Luego Apertura gradual Live → **Consultar estado autoritativo** → **Autorizar inicio limitado**, marcar confirmación → **Confirmar operación**. Código solo dentro de PAZO, nunca chat. El GO L1 ya existe. Confirmar mode=limited/L1/cap1 y cero invitaciones QA antes de declarar L1_ACTIVATED.

Relectura reproducible: [SQL agregado sin mutaciones](../supabase/queries/f16_issue85_l1_postflight_READ_ONLY.sql), `node --use-env-proxy scripts/f16-public-pwa-http-gate.mjs` y `scripts/f16-issue84-hosted-readonly-postflight.mjs` con clave pública existente (rechaza service/secret). El PO no necesita instalar herramientas para consultar PayPal.

## Rollback y conservación

Rollback disponible, no ejecutado: mantener campaña inactiva (o pausa MFA si ya iniciada) y restaurar frontend #84 `dpl_HCcdWk8Uo79LxrfCUXgqDzMdHa5J`, source `d9fd7506bed051bbeee4f6f16fb4d0c7df647f57`, si falla el actual. Edge desde source conocido/manifiesto #84, conservando capacidad/JWT originales y atención a obligaciones. No cambiar secrets ni modo public, eliminar migraciones/recibos o revertir etiquetas QA para que vuelvan a contar. Backup privado de definiciones SQL precursoras sin datos/Vault disponible; no equivale a PITR completo.
