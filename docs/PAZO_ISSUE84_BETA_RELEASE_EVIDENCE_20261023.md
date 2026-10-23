# Issue #84 — integración y beta oficial con nuevas compras apagadas

Autorización vigente: [issue #84](https://github.com/DigitalAppcorp/pazo-app/issues/84) y petición expresa del PO del 23-oct-2026. Permite integrar #83 en F17, instalar SQL/Edge inactivos, validar y publicar beta oficial; main solo como parte del release condicionado. No permite iniciar campaña, invitaciones, CREATE PayPal, modificar plan/merchant/Vault ni alterar el intento anterior.

## Registro previo y corrección de seguridad

- PR #83 revisado, salió de Draft y se integró con merge trazable **`57e8511f42fceae70c07ce13b3c0cd36583069b9`** en F17. El HEAD revisado fue `2b920f06507a543162410cdcfcb2cca7f5a85973`, CI40031508731 PASS. Se disparó también CI del SHA F17 integrado; el release usará la revisión posterior que incorpora el cierre inactivo.
- Hallazgo #84: el guard original de #83 delegaba canary/public al control anterior cuando no era `limited`. Eso no garantizaba impedir un CREATE del operador durante `inactive`. Antes de instalar la migración aún inédita se corrigió el mismo archivo preparado: **toda admisión nueva exige campaña active y salud**, en cualquier modo. La recuperación de un intent original ya reclamado sigue disponible, sin exigir fila de la campaña nueva. Pruebas PG reales de begin/claim denegados y recovery preservada. No se aplica un cambio aislado sin CI ni se crean tablas extra.
- Checksum PR #83 anterior: `1962cedd721923cbc1846e51b4037dda2c3fca76a77def03c5391c72a0f99a38`. Checksum corregido #84 de `20261023211315_pazo_f16_gradual_live_event_rollout.sql`: **`9130baee7e02f81a8bfacc25e56e23b0c56deff2cf7c6f1db1c41c589b59bf4d`**. Esta corrección antes del primer apply está dentro del mandato de arreglar errores y publicar sin nuevos cobros; no cambia las etapas aprobadas.
- Supabase autorizado `mrybvqdebbgcayuvgkkr`, PG17.11 ACTIVE_HEALTHY. Auditoría inicial agregada: canary revisión1/generación1, un intent abierto, cero períodos pagados, worker enabled/processing y heartbeat fresco, ninguna tabla gradual. Vault/generación se consultan solo por metadatos; no exportar valores.
- **Vercel real confirmado:** `pazo-app` / `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, equipo `team_02Ax5UcD1OlLzpDBYyNMi6KO` (`digitalapp`), dominio verificado `https://pazo-app.vercel.app/`. `pazo-app-t83r` es proyecto anterior y no es destino. Alias previo apunta a **`dpl_EXSgFZSQquSgvzk6qYMViu8GmEQV`**, producción READY, código `3709ffcbad8a129aa58240ea34f0f1728006e954`; éste es rollback frontend. Git deploymentEnabled=false evita publicación por merge accidental.
- Protección de Vercel intacta. Una lectura mediante herramienta que podía crear enlace temporal fue rechazada automáticamente; no se creó bypass ni se desactivó SSO. Usar solo lecturas normales/autorizadas y registrar la revisión PO que siga pendiente.

## Backup y rollback operativo

Antes de apply: conservar commit fuente y definiciones SQL precursoras sin datos de usuarios/secrets, checksums de funciones, historial de migraciones, versiones/bundle hashes Edge y fingerprint agregado de intents/ledger/avisos. La migración no borra registros financieros y es transaccional; cualquier drift revierte la operación. El backup lógico de definición es operativo, **no una copia completa de datos ni una prueba de restauración/PITR**. No exportar auth/users, Vault ni pagadores a GitHub.

Rollback financiero seguro: conservar la infraestructura y `inactive`/gate false, bloquear nuevos CREATE; mantener worker/webhook/account originales operativos. Para frontend se puede restaurar el deployment previo confirmado; para Edge conservar los bundles anteriores identificados y redeployar exclusivamente si fuese necesario. No borrar tablas nuevas con datos, no db reset, no mover a public/canary para sortear guards. La recuperación previa no se prueba mutando al proveedor ni cerrando el intent real.

## Estados separados (actualizados durante ejecución)

| Paso | Estado | Evidencia | Commit/URL |
| --- | --- | --- | --- |
| PR83_MERGED | PASS | Merge conservando historia, destino F17 | 57e8511f / PR83 |
| F17_CI_PASS | PENDIENTE SHA corregido | PG17, UI, governance y regresión sobre integración | PR81/checks |
| DB_HOSTED_APPLIED | PENDIENTE | Requiere CI exacto y preflight final | mrybvqdebbgcayuvgkkr |
| EDGE_HOSTED_DEPLOYED | PENDIENTE | Tres funciones, JWT y firma conservados | mismo código integrado |
| HOSTED_TECHNICAL_QA | PENDIENTE | Lecturas, auth, denegaciones, RLS, PWA/Mapbox | sin CREATE ni invitaciones |
| OFFICIAL_BETA_DEPLOYED | PENDIENTE | Solo después de los gates anteriores | pazo-app.vercel.app |
| USER_VISUAL_APPROVAL | PENDIENTE PO | No confundir automatización con aprobación humana | candidato final |
| LIVE_LIMITED_START_NOT_AUTHORIZED | CONFIRMADO | Campaña inactive y hosted_gate_verified=false | GO financiero separado |

GR/EVT del código conservados en `PAZO_F16_GRADUAL_IMPLEMENTATION_EVIDENCE_20261023.md`. La tabla final separará laboratorio, hosted y Live real: los casos de venta Live siguen sin ejecutarse por falta de GO financiero, no por un supuesto problema de credenciales. No repetir QA Sandbox real aprobado.
