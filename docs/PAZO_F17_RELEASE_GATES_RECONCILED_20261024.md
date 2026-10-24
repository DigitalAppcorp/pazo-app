# PAZO — reconciliación de gates F17 / MVP (24-oct-2026)

**Alcance:** auditoría de solo lectura de GitHub y Supabase; documento propuesto en rama separada. No se fusionó ninguna rama, no se ejecutó DDL/DML ni se cambió PayPal, Vercel, Auth, Storage o la campaña. **No constituye autorización de lanzamiento.**

**Corte de evidencia:** GitHub consultado el 24-oct-2026; Supabase `mrybvqdebbgcayuvgkkr` consultado mediante SELECT a las **2026-10-24 18:10–18:11 UTC**. El runtime Vercel no pudo revalidarse en esta auditoría debido a falta de autorización del conector para el team `digitalapp` (403); se conserva la evidencia documental previa sin presentarla como verificación en vivo.

## 1. Estados correctos: no reutilizar gates históricos obsoletos

| Gate | Estado reconciliado | Fuente / límite |
| --- | --- | --- |
| F17 integrado en `main` | **PASS**. PR #81 merged, merge `5d4464f6...` | https://github.com/DigitalAppcorp/pazo-app/pull/81 |
| Integridad histórica Git, recuperaciones editoriales | **PASS de integración de código**. PR #95, #97, #98 y #99 merged. `main` observado `7ce277bf4ab2bf50185c77e5b8f090c375a6f8df` | https://github.com/DigitalAppcorp/pazo-app/pull/99 |
| Historial alojado | **122 versiones registradas** por SELECT de solo lectura el 24-oct | No es autorización para reejecutarlas |
| `supabase db push`, `migration repair`, replay desde cero | **NO GO**. Falta baseline previo al 5-oct y replay cronológico íntegro; el restore de un snapshot actual es otro gate | https://github.com/DigitalAppcorp/pazo-app/blob/main/docs/PAZO_HISTORICAL_MIGRATION_PHASE2_AUDIT_20261023.md |
| Respaldo actual y recuperación de datos | **PASS LOCAL REAL documentado**, dos restores aislados; 147 tablas + 13 secuencias, 401 funciones, 133 policies, 735 constraints, 70 triggers, 7 extensiones; Storage 9 objetos | PR #100: https://github.com/DigitalAppcorp/pazo-app/pull/100, aún **DRAFT/no merged** |
| Recuperación de servicios/Auth HTTP, Storage HTTP y Vault operativo | **NO CERTIFICADA**; el restore DB/Storage no acredita servicio completo ni disponibilidad de claves externas | `docs/PAZO_F17_BACKUP_RESTORE_EXECUTION_20261024.md` en PR #100 |
| Copia off-site y custodia independiente | **DIFERIDA** por el Product Owner | No ejecutar transferencia, ni marcar PASS |
| PWA/UX/Mapbox/soporte/admin | **PASS previamente documentado** para el alcance aprobado y recorrido público; instalación reportada por PO. No rehacer QA ya aceptada sin defecto nuevo | `docs/PAZO_F17_SCOPE_CLOSURE_RECONCILIATION_20261023.md`. No se repitió QA física ni inspección Vercel en este corte |
| Baja de cuenta acotada Codex | **PASS previo**, con cuenta QA descartable y preservación de las originales | `docs/PAZO_PRELAUNCH_TECH_AUDIT_20261010.md`. La purga física de medios moderados permanece OFF; mantener proceso supervisado y declaraciones exactas |
| Privacidad/Terms ES/EN | **Textos preparados** según gate previo; la publicación, fecha efectiva y operación real deben coincidir con el producto | `docs/PAZO_MVP_RELEASE_GATES_20261010.md`; no es dictamen legal ni QA recién ejecutada |
| Captura de primer pago Live | **NO OBSERVADA**; cero períodos pagados Live al corte | Nunca generar un cargo sintético o acreditar beneficios sin venta firmada/proveedor/ledger |
| Instrumentación promocional PR #91 | **DRAFT, OFF**, no desplegado ni requisito de activar tracking invasivo para cerrar la programación esencial | https://github.com/DigitalAppcorp/pazo-app/pull/91 |

## 2. Hallazgo operativo nuevo: campaña L1 pausada automáticamente

Consultas directas de solo lectura a `admin_private.pazo_live_release_control`, `supporter_private.gradual_campaign`, `gradual_incident`, `gradual_audit` y agregados de usuarios/pagos/eventos:

- Release financiero `mode=limited`. Campaña **`lifecycle=paused_automatic`**, `stage=L1_FIRST_REAL`, `capacity=1`, `revision=3`, `hosted_gate_verified=true`; un certificado.
- A las 18:10:58 UTC, `supporter_private.gradual_health()` dio **true** y `gradual_legacy_open()` dio **0**. Worker habilitado/procesando, último heartbeat y webhook recientes.
- Incidente `webhook_unhealthy` **abierto 2026-10-24 16:01:08 UTC y resuelto 16:02:00 UTC**. Ningún incidente sigue abierto. La asociación temporal y lógica con la pausa es consistente; no afirmar una causa subyacente de webhook no diagnosticada.
- **0** períodos Live pagados; **0** intereses, invitaciones, admisiones, eventos gradual e inbox HELD; **8** cuentas QA etiquetadas.
- Lectura de la función alojada `supporter_private.gradual_pump()`: al detectar falta de salud cuando el ciclo está activo, pasa a `paused_automatic`. Recuperar salud **no reactiva automáticamente** `lifecycle`.
- Lectura de `public.pazo_f16_gradual_admin_action`: contempla acción `resume` limitada a pausa previa y exige gate, historial sin legado y salud positiva, además de permisos de administrador y revisión/CAS. La interfaz de Administración protege las operaciones con su propio flujo MFA según documentación F17.

**Decisión:** NO reanudar la campaña en esta auditoría. Revisión operativa y autorización específica del PO para reanudar L1 limitado, comprobando salud nuevamente inmediatamente antes, mediante el flujo oficial de Administración. Prohibido saltar a `public`, disparar SQL manual, crear compra QA o usar funciones privilegiadas directamente para omitir MFA.

## 3. Gates restantes por prioridad

1. **Incidente/pausa L1 — P0 operativo.** Inspeccionar evidencia de heartbeat/webhook y el estado de la campaña, confirmar que no hay reaparición del fallo y presentar al PO decisión acotada para reanudar L1 con su MFA. El estado `health=true` no es por sí solo GO.
2. **Primera venta real voluntaria — gate financiero observable, no simulable.** Tras reanudar L1 debidamente, cuando un cliente real consienta y pague, verificar evento firmado, reconciliación de proveedor, ledger/período, beneficios y badge. No exigir fabricar pago para rellenar una casilla.
3. **Integración PR #100 — pendiente de GO.** Auditar diff doc/scripts/CI y efectos de Git integration; PR100 está DRAFT, sin merge. Evidencia de restore ya PASS: no repetirla por rutina.
4. **Recuperación operacional completa y custodia off-site — alcance distinto y pendiente.** Auth/Storage HTTP/Vault y ubicación off-site requieren plan/autoridad separada; no falsear PASS. No bloquear por inercia la beta gratuita si el PO acepta explícitamente el alcance y riesgo de continuidad, pero mantener la restricción sobre operaciones de migración.
5. **Control final de release.** Antes de cualquier nuevo merge/deploy o apertura pública, contrastar SHA de `main`, CI, alias Vercel oficial, configuración L1/health/incidentes, acceso a soporte/baja y textos legales reales. El conector Vercel no acreditó acceso al team en este corte: falta comprobación nueva para afirmar su estado hoy.

## 4. Decisiones y límites permanentes

- **La beta ya está publicada** según evidencias anteriores, pero `published` no significa `GO final` ni `public` en PayPal. `main` sí contiene la integración F17; eliminar del *estado vigente* la frase antigua «PR #81 DRAFT».
- No confundir **restore de una fotografía** con **replay de todas las migraciones**, ni el éxito de checks con aprobación del Product Owner.
- No repetir Sandbox, eliminación QA, instalación PWA ni diseño ya aprobado sin regresión concreta.
- La decisión pendiente de F13 debe plantearse **antes del GO/NO-GO final**, cuando se resuelvan los bloqueos esenciales y el lanzamiento esté realmente próximo, no por anticipado.
- Marketing se gestiona por un agente distinto; PR91/PR89 no son justificación para alterar el producto financiero.
- No se autoriza en este documento: `db push`, `migration repair`, restauración hospedada, PayPal `public`, reanudación L1, merge de PR100, cambios en `main` ni deploy.

## 5. Referencias de estado

- `main` al corte: https://github.com/DigitalAppcorp/pazo-app/commit/7ce277bf4ab2bf50185c77e5b8f090c375a6f8df
- F17 integrado: https://github.com/DigitalAppcorp/pazo-app/pull/81
- Respaldo/restauración real en revisión: https://github.com/DigitalAppcorp/pazo-app/pull/100
- Alcance F17 anterior (histórico, sección pre-main ya superada): `docs/PAZO_F17_SCOPE_CLOSURE_RECONCILIATION_20261023.md`
- Incidente e indicadores L1: lecturas solo SELECT de Supabase el 24-oct-2026 UTC, sin datos personales ni secretos publicados.

**Resultado del corte:** `F17_MAIN_INTEGRATED` / `BACKUP_RESTORE_PRIVATE_PASS_PR_DRAFT` / `HOSTED_MIGRATION_REPLAY_NO_GO` / `L1_PAUSED_AUTOMATIC_HEALTH_RECOVERED_NEEDS_PO_RESUME` / `FIRST_REAL_PAYMENT_NOT_OBSERVED` / `FINAL_RELEASE_NO_GO`.
