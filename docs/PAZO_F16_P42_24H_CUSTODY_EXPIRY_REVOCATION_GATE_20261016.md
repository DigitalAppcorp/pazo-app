# PAZO F16-P42 — Gate operativo de custodia, vigencia 24 h y revocación (SOLO PREPARACIÓN)

**Fecha:** 2026-10-16. **Entorno objetivo:** Sandbox. **Proyecto Supabase existente:** `mrybvqdebbgcayuvgkkr`.
**Rama de trabajo:** `f13/section-titles-20261012`; PR #44 DRAFT.
**Estado:** PROCEDIMIENTO PROPUESTO / PROVISIÓN NO AUTORIZADA POR ESTE DOCUMENTO. F16 NO-GO.
**Decisiones PO aprobadas:** vigencia de la futura clave P42 = **24 horas** y método de **revocación manual supervisada**, mediante custodio autorizado y verificación en ambos destinos. **No hay revocación física automática** ni se ha fijado fecha T0. Estas decisiones solo autorizan preparar el procedimiento, **NO generar/provisionar, eliminar secretos existentes, cambiar permisos, activar, desplegar ni cobrar**.

## 1. Reconciliación de identidad de los dos destinos

Fuentes fijadas:
- Contrato histórico: `docs/PAZO_F16_P43_SANDBOX_KEY_PROVISIONING_SECURE_HANDOFF_20261016.md` en `047503875d52604c55cdd8fd226d28d3b859be05`.
- Infraestructura inerte: `supabase/migrations/20261016062849_f16_p42_keys_and_writer_inert.sql`.
- Preflight vacío: `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql`.
- Postflight histórico: `docs/PAZO_F16_P42_HOSTED_INERT_INSTALL_POSTFLIGHT_20261016.md`.

| Destino | Identidad exacta | Estado requerido después de una provisión futura |
| --- | --- | --- |
| Supabase Edge Function Secrets del proyecto | `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` | Presente únicamente durante ventana aprobada, **sin conectar el receptor** |
| PostgreSQL, esquema privado | `supporter_private.p42_activation_signing_keys` fila `key_id='P42_V1'`, columna `key_bytes` | Mismos 32 bytes decodificados; `enabled=false`, `not_before` futuro, `not_after` finito |
| P42 writer | `supporter_private.p42_activation_writer_gate` | `enabled=false`, `not_before=NULL` |
| RPC P42 | `public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)` | Sin `EXECUTE` para `PUBLIC`, `anon`, `authenticated` ni `service_role` |
| P21 / P40 / ledger | Módulos privados existentes | Worker OFF, cero vínculos de activación y cero entradas de pagos |

El nombre «Sandbox» y el prefijo `p42|sandbox|` no implican por sí solos aislamiento físico: Edge Secrets pertenece al **proyecto Supabase** y sus funciones pueden consultar variables de entorno del proyecto. Auditar todos los consumidores Edge y operadores con acceso antes de exponer material, aunque el writer esté apagado. No crear un segundo proyecto ni gasto sin aprobación específica.

## 2. Política de custodia propuesta

- **Responsable de autorización y registro:** Product Owner. **Operador/custodio único durante la operación:** persona concreta designada por el PO, pendiente de identificación y validación de permisos. Un operador debe controlar *ambos* canales en la misma sesión privada; no delegar bytes de un destino a otra persona, a un chat ni a un agente con logs de subprocesos.
- **Permiso Edge:** verificar previamente Owner/Administrator o permiso equivalente que pueda crear y borrar secretos. Verificar el método realmente disponible mediante Dashboard/API/CLI y cómo protege argumentos, cuerpo HTTPS, consola, archivos y logs. No suponer que el conector de ChatGPT escribe secretos; no transmitir claves mediante CLI `NAME=VALUE` visible en argumentos, `.env` persistentes, portapapeles no controlado o historial.
- **Permiso DB:** sesión administrativa PostgreSQL con TLS `verify-full`, CA de origen comprobado, sentencias parametrizadas/bind y logging de parámetros deshabilitado; nunca usar el SQL Editor para pegar bytes. El acceso temporal P43 de **solo lectura** no concede autoridad de escritura ni debe reutilizarse por su mera existencia.
- **Generación eventual:** CSPRNG de sistema operativo, 32 bytes reales, distintos de PayPal, JWT, Supabase API y pruebas; una sola instancia efímera de proceso entrega HEX (64 caracteres) al canal Edge y bytes decodificados al canal DB, sin material en salida/logs. No se genera ahora.
- **Retención:** ninguna copia legible deliberada fuera de esos dos destinos. Examinar políticas reales de backups/restores, acceso admin, registros de consola y respuesta a incidentes antes de autorización. Borrar buffers y temporales cuando el entorno lo admita, sin prometer borrado criptográfico de memoria, snapshots ni backups.
- **Inspección:** el operador solo registra nombre/ID de clave, proyecto, fechas UTC, resultado, identidad/rol de operador y estados de seguridad. No publicar clave, fragmentos de ella, hashes derivados, SQL con parámetros ni pantallas que la revelen.

**Condición bloqueante:** si no existe un canal privado capaz de poner material en *ambos* destinos sin filtrarlo a logs, scripts, argumentos o historiales, NO generar la clave. Tampoco efectuar DB-solo ni Edge-solo como salida aceptada.

## 3. Semántica exacta de las 24 horas

**Política propuesta para aprobación operativa:** seleccionar antes de crear la clave un instante UTC futuro `T0` (inicio de la ventana), con tiempo suficiente para confirmar *ambos* destinos antes de `T0`.
- `not_before = T0`.
- `not_after = T0 + 24 horas exactas` (no `NULL`, no «fin de día» local).
- La hora de creación y la de escritura no extienden `T0`; si no se termina correctamente antes de `T0`, abortar, compensar ambos destinos y pedir una **nueva** autorización para nueva ventana. No modificar `T0` silenciosamente después.
- En esta preparación y durante toda la ventana: `enabled=false`, gate OFF, grants ausentes. El objetivo es custodiar material, **no usarlo**.
- El TTL de firma HMAC de **120 segundos es distinto** de la vigencia de 24 horas. No usarlo como retención o duración de clave.
- **Hallazgo de código:** la RPC instalada comprueba `issued_at < not_after` y tolera hasta 120 segundos respecto del reloj del servidor; no comprueba `clock_timestamp() < not_after`. Si se habilitara en otro gate, una firma emitida antes del vencimiento podría entrar durante ese margen posterior. **Corregir y probar cutoff absoluto del servidor antes de cualquier GO de ejecución**. Para este gate el escritor y todos los grants siguen OFF.
- `not_after` limita aceptación lógica cuando exista ejecución autorizada; **no elimina** automáticamente el secreto Edge ni los bytes DB. La destrucción/revocación debe ser una operación aparte, programada y verificable, no una suposición sobre Supabase.

## 4. Transacción distribuida con compensación (NO EJECUTAR AÚN)

No existe transacción ACID compartida entre Edge Secrets y PostgreSQL. El procedimiento futuro deberá:
1. Verificar proyecto, operador, permisos de set/unset, CA, logging, backups y posibilidad REAL de confirmar presencia sin revelar valores; confirmar dos canales listos **antes de generar**.
2. Revalidar read-only el preflight estructural vacío EXACTO de P42, **en un nuevo gate autorizado**. P43 PASS ya cerrado no se repite.
3. Establecer `T0`, `not_after` y custodio; comprobar controles de expiración/revocación preparados antes de crear bytes.
4. Generar una sola clave privada en memoria del ejecutor; aprovisionar Edge, después insertar DB con una transacción parametrizada y `enabled=false`.
5. Confirmar mediante metadatos independientes: presencia del nombre Edge (sin valor), existencia de una sola fila `P42_V1` (sin SELECT de `key_bytes`), duración exacta, `enabled=false`, writer/worker OFF, sin grants ni P40/ledger. Esta verificación acredita **la entrega del mismo buffer en la operación**, no demuestra por sí sola equivalencia criptográfica leída de vuelta entre almacenes; la prueba HMAC extremo a extremo queda para gate posterior y **no** debe ejecutarse con escritor apagado.
6. Si falla DB después de Edge: **unset Edge** inmediatamente y verificar ausencia. Si falla confirmación posterior a DB: detener, mantener gates OFF, deshabilitar/eliminar fila por el operador autorizado y retirar Edge; confirmar los dos destinos sin material.
7. Si hay timeout/respuesta ambigua en cualquiera de los dos gestores, **NO reintentar a ciegas ni generar una segunda clave**: inspección de metadatos y compensación controlada hasta quedar ambos ausentes; registrar estado incierto como BLOCKED.
8. Postflight de estado **aprovisionado pero inactivo** requiere chequeo propio: el preflight actual exige 0 filas y fallará intencionalmente después de provisionar.

Nada en los puntos anteriores concede autoridad para una operación actual.

## 5. Expiración, revocación y emergencia

**Responsable:** mismo custodio autorizado, con respaldo nombrado y probado ANTES del futuro GO. La autorización futura de provisión debe incluir expresamente permiso y mecanismo de **revocación/limpieza**, incluso si el PO no está disponible en el vencimiento.

**Al vencimiento de `not_after` (o antes por sospecha):**
1. Confirmar writer P42 OFF y P21 OFF; si hubiera drift, suspender inmediatamente, revocar `EXECUTE` desde rol administrativo y escalar incidente. En el gate actual estos permisos nunca deben activarse.
2. Desactivar la versión DB (o confirmar `enabled=false`), retirar el secreto Edge `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` usando `secrets unset` o mecanismo Dashboard/API verificado, y retirar la fila de bytes mediante procedimiento administrativo **expresamente autorizado** tras registrar únicamente metadatos no secretos.
3. Validar ausencia Edge + ausencia de material DB, `EXECUTE=false` para roles de aplicación, gate OFF, worker OFF y ausencia de nuevos vínculos/pagos. La permanencia de copias en backups debe documentarse como exposición residual hasta vencer su política real.
4. Registrar hora UTC, custodio, resultado y excepciones sin material secreto; escalar si no se puede verificar limpieza. **No declarar revocación total** si algún almacén o backup sigue accesible.

**Incidente antes del vencimiento:** gate y grants primero, luego deshabilitación/eliminación DB y `unset` Edge; no esperar 24 horas. Ante inconsistencia Edge/DB, no reparar habilitando escritor: revocar versión, evaluar causa y solicitar un nuevo GO para cualquier reemplazo. No repetir ni reactivar `P42_V1` tras revocación.

**Decisión PO — revocación MANUAL supervisada (sin ejecución automática):** antes de un futuro GO, asignar por escrito un custodio humano con capacidad verificada de borrar el secreto Edge y la fila DB, más un reemplazo autorizado; fijar un turno confirmado para `Texp = T0 + 24 horas UTC` y una lista de comprobaciones. Opcionalmente programar alarmas para el custodio, pero **no confundir el recordatorio con eliminación**: ningún cron, webhook ni tarea de borrado automático queda autorizada. Al llegar `Texp`, el custodio realiza ambos retiros y comprueba ausencia; dejar evidencia con hora UTC y estados sin material secreto. Si el operador o respaldo no pueden estar disponibles para `Texp`, **NO PROVISIONAR**. Si venciera la ventana sin limpieza verificada, marcar `P42_MANUAL_REVOCATION_OVERDUE_BLOCKED`, conservar writer P42/worker P21/EXECUTE OFF, activar escalamiento inmediato y retirar en cuanto exista acceso; nunca afirmar que los bytes se eliminaron solos.

**Rotación:** el secreto Edge de nombre fijo no suministra por sí solo soporte de doble versión concurrente. Rotar a `P42_V2` exige diseño explícito de identificación de clave en runtime, capacidad Edge real de coexistencia/rollback y nuevo gate; nunca sobreescribir silenciosamente la variable mientras el receptor pudiera aceptar `P42_V1`. Para el presente gate solo aplica una versión apagada de 24h, sin uso.

## 6. Gate de verificación pendiente — fail closed

Aprobar una **provisión futura** solo cuando se registren:
- [ ] Identidad y permiso demostrados del custodio; respaldo/revocador designado.
- [ ] Cobertura de funciones Edge capaces de leer secretos del proyecto, control de operadores/admin y limitaciones del proveedor.
- [ ] Canal privado real de escritura y eliminación Edge + DB, TLS verificado, cero args/logs/SQL Editor con secretos.
- [ ] Política verificada de backups, snapshots, auditoría y recuperación ante compromiso; aceptación expresa de exposición residual.
- [ ] Semántica `T0` y `not_after=T0+24h` aprobadas por PO; fecha UTC solo se concreta al ejecutar bajo nuevo GO.
- [ ] Revocación **manual supervisada** aprobada y custodio PO designado; bajo el modelo sin suplente, recuperación de acceso por el propio PO, disponibilidad confirmada para `Texp=T0+24h`, permisos Edge/DB verificados, riesgo de indisponibilidad humana expresamente aceptado en gate separado, y ensayos de retirada. Alarma opcional no borra secretos.
- [ ] Postflight específico metadata-only para fila `P42_V1` apagada y secret Edge presente; posterior cleanup verificado en ambos destinos.
- [ ] Confirmación fresca de preflight vacío y sin drift antes de cualquier nueva mutación.
- [ ] Autorización PO independiente, inequívoca, **para generar/provisionar `P42_V1` y revocarla** en los dos destinos, y ninguna otra operación.

**No son parte de este gate**: grants de ejecución, levantar writer P42 o worker P21, desplegar/conectar `receiver.mjs`, activar checkout, PayPal Sandbox buyer, Live, registrar ledger/períodos/beneficios, atribuir pagos históricos o cerrar retención legal P40/P41.

**Marcador documental de esta revisión:** `P42_24H_CUSTODY_EXPIRY_REVOCATION_DRAFT_NO_PROVISIONING`.
**Estado operativo:** NO-GO hasta verificar controles y obtener aprobación PO aparte.

## 7. Confirmación de interfaz Edge y postflight futuro (2026-10-16)

- El Product Owner confirma que ve los controles de **agregar y eliminar secretos** en Supabase Edge Functions → Secrets. **Es comprobación visual, NO prueba que su rol pueda guardar/borrar**: la documentación vigente de Supabase restringe cambios a `Owner` o `Administrator`; los miembros `Developer` pueden visualizar la pantalla. Falta confirmar rol y capacidad de revocación, **sin pulsar Save ni crear un secreto de prueba**.
- Documentación oficial: https://supabase.com/docs/guides/functions/secrets — las nuevas variables quedan legibles de inmediato para Edge Functions. En la auditoría de solo lectura conector se observaron seis Edge Functions desplegadas; ausencia del nombre literal en el contenido consultado no prueba aislamiento de secretos compartidos del proyecto.
- Se añadió `supabase/queries/f16_p42_24h_inactive_key_metadata_postflight_READ_ONLY.sql`: **para uso futuro únicamente, después de un GO de provisión aparte**. En una transacción de solo lectura comprueba única fila `P42_V1`, `enabled=false`, `not_before` aún futuro, `not_after=not_before+24h`, writer/worker OFF, P40/ledger vacío, RLS forzada y grants RPC ausentes. No selecciona `key_bytes` ni verifica material Edge. **No ejecutar ahora**: actualmente 0 filas es el estado correcto y este postflight debe fallar. Verificación del archivo: inspección estática y lectura GitHub PASS; sin prueba SQL PG17 ni ejecución alojada todavía.
- **Próximo mínimo paso humano:** confirmar rol `Owner`/`Administrator` de Supabase con lectura en la administración del equipo/organización. Después revisar canal DB administrado con TLS y operaciones paramétricas, y mecanismo realmente verificable de revocación Edge/DB a las 24h. Aún no generar ni provisionar clave.

## 8. Evidencia visual PO — rol Owner y MFA pendiente (2026-10-16)

- PO aportó captura de la página Team de Supabase: una sola cuenta de la organización con `ROLE=Owner` y `MFA=X`. Esta verificación de UI satisface **identidad del rol de administración**, no demuestra todavía una operación exitosa de `set/unset` de secrets ni DB administrativa.
- Por minimización de datos, no incluir el correo personal ni cargar la captura a Git.
- Antes de provisión, solicitar MFA TOTP de **cuenta Supabase** (no MFA de usuarios PAZO) vía `https://supabase.com/dashboard/account/security`. Supabase avisa que habilitar MFA cierra otras sesiones y no proporciona recovery codes; registrar factor TOTP de respaldo con otro dispositivo/app, y nunca compartir secreto TOTP o códigos con ChatGPT/GitHub.
- La organización PAZO está en plan Free; la aplicación obligatoria de MFA a nivel organización solo está disponible en Pro/Team/Enterprise y **no se recomienda subir de plan** para este gate. MFA individual sí puede configurarse sin ese cambio. Referencias: https://supabase.com/docs/guides/platform/multi-factor-authentication y https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement
- **Siguiente dependencia humana:** PO configura y verifica MFA en la cuenta Owner; después se revisa custodia DB TLS parametrizada y revocación real set/unset con operación privada, sin crear secreto real ni de prueba en este paso.
- Estado: `P42_OWNER_UI_CONFIRMED_MFA_PENDING_NO_PROVISIONING`; F16 NO-GO, PR #44 Draft, writer/worker/checkout/pagos OFF.

## 9. Evidencia visual posterior de MFA primario (2026-10-16)

- PO aportó nueva captura de **Supabase Account → Security**, con **Google Authenticator** registrado como factor TOTP. **EVIDENCIA VISUAL PASS — MFA PRIMARIO REGISTRADO**. La captura no documenta una autenticación de inicio de sesión con desafío MFA ni acredita un segundo factor.
- La advertencia de Supabase invita a registrar **Add another app** para evitar bloqueo permanente. **Factor de respaldo: PENDIENTE**. Recomendar un segundo dispositivo o aplicación diferente; nunca publicar el QR, token de configuración, código TOTP o capturas de ellos.
- El estado histórico de `MFA=X` en la captura previa del equipo es anterior a este alta. No inferir que la organización exige MFA: el plan Free no permite imponerlo globalmente. Tampoco tratar la presencia de botones como prueba de escritura de secretos.
- **Próximo gate:** PO verifica segundo factor TOTP y conserva acceso; equipo técnico continúa solo con revisión de mecanismos de custodia, expiración, backups y revocación, sin claves. Todos los controles financieros y P42 permanecen OFF.
- Marcador: `P42_OWNER_MFA_PRIMARY_UI_PASS_BACKUP_PENDING_NO_PROVISIONING`.

## 10. Evidencia visual — segundo factor MFA registrado (2026-10-16)

- Nueva captura aportada por el Product Owner de **Account → Security** muestra simultáneamente **Google Authenticator** y **Microsoft Authenticator** registrados como factores TOTP para la cuenta Supabase Owner. **MFA primario + segundo factor REGISTRADOS — PASS visual**.
- La captura no prueba que los factores residan en dispositivos físicamente independientes, que exista almacenamiento de recuperación fuera del dispositivo principal ni que se hayan validado mediante dos inicios de sesión recientes; no atribuir esos estados como comprobados. Si están en el mismo dispositivo, el respaldo ante pérdida física sigue siendo insuficiente.
- Queda **CERRADA la dependencia de agregar otro autenticador**. Se continúa al gate de custodia PostgreSQL, reversión coordinada Edge/DB, revisión de permisos y backups y expiración 24 horas; sin pedir más capturas MFA ni crear secretos.
- Confirmada por documentación oficial la capacidad de quitar un secreto Edge con `supabase secrets unset NAME` (https://supabase.com/docs/reference/cli/supabase-secrets-unset); la existencia de ese comando NO prueba que el ejecutor pueda revocar de forma segura ni que se haya ejecutado. Preparar método privado y verificación no sensible sin usar credenciales en argumentos, logs o chat.
- **Estado:** `P42_OWNER_TWO_TOTP_UI_PASS_CUSTODY_REVOCATION_PENDING_NO_PROVISIONING`, F16 NO-GO, PR #44 Draft, writer P42/P21/checkout/ledger/beneficios OFF; ninguna nueva consulta o mutación PostgreSQL atribuida a esta actualización.


## 11. Decisión PO de cierre — revocación manual supervisada (2026-10-16)

**APROBADO PARA PREPARACIÓN DOCUMENTAL. NO-GO PARA PROVISIÓN.** La decisión vigente es **revocar manualmente después de la ventana de 24 horas**, no implementar ni suponer eliminación automática. Esta sección prevalece sobre propuestas históricas de automatización de limpieza sin alterar el TTL HMAC de 120 s.

**Procedimiento humano propuesto para posterior revisión**:
1. Antes de un futuro GO de provisión, identificar custodio nominal autorizado con acceso real a Edge Secrets y a PostgreSQL TLS con parámetros, e identificar suplente con capacidad ya comprobada. El Product Owner debe confirmar que el responsable puede estar disponible durante la ventana de vencimiento; **no asumir disponibilidad** a partir del rol Owner de Supabase.
2. En el futuro GO separado, establecer `T0` UTC y registrar `Texp = T0 + 24 horas`; la clave estaría siempre `enabled=false`, gate false y sin grants. Confirmar agenda del operador y suplente para `Texp`; no provisionar si existe riesgo previsible de ausencia. No se crea automáticamente ningún recordatorio desde este documento.
3. A `Texp` (o antes si incidente), el custodio ejecuta retiro del secreto Edge **únicamente** `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` y de la fila `P42_V1` en PostgreSQL con procedimiento administrativo previamente verificado, sin exponer `key_bytes`. Mantener inertes P42/P21/RPC; NO usar acceso de solo lectura P43 como permiso de escritura.
4. Obtener lectura independiente reciente de **ausencia de nombre Edge** y **cero filas de clave DB**, más gate false, sin EXECUTE para roles de aplicación, P21 false, P40/ledger sin nuevos datos. La aceptación requiere ambas confirmaciones; un acuse de DELETE/unset no basta. Aplicar la revisión humana al verificador sintético de evidencias, que solo produce candidato, nunca certificado de revocación alojada.
5. Registrar operador, fecha prevista/real UTC, resultado y excepciones en bitácora sin secretos, identificadores sensibles ni hashes de clave. Los respaldos/dumps existentes mantienen riesgo residual hasta su retención/ciclo de purga; no afirmar destrucción universal.
6. Si el custodio no puede operar o falla uno de los almacenes: resultado `BLOCKED`, ejecutar compensación/retirada faltante lo antes posible por el suplente, verificar nuevamente; **no reactivar** `P42_V1`, no volver a provisionar y no habilitar pagos. Escalamiento inmediato al PO; no inventar éxito ni prolongar las 24 horas.
7. La **vigencia lógica** termina a las 24 h, pero la **eliminación física depende del humano**. El procedimiento no impone garantía de horario automática, y P42 sigue con acceso de ejecución denegado. La tolerancia de 120 s por HMAC no permite extender la clave; corregir el cutoff absoluto del servidor antes de un gate diferente que habilitase la RPC.

**Pruebas y autoridad:** el ensayo offline previo de dos destinos prueba solo reglas de metadatos; NO demuestra ejecución manual ni acceso al proveedor. El siguiente gate requiere custodia DB TLS parametrizada, verificación de backup, acceso de eliminación Edge y agenda humana, seguido de autorización inequívoca de provisión + revocación manual en turno aparte. Nada en este cambio modifica Supabase ni permite writer, worker, checkout, PayPal Live/Sandbox buyer, ledger, beneficios, deploy, merge ni infraestructura facturable.

**Marcador:** `P42_MANUAL_SUPERVISED_REVOCATION_POLICY_APPROVED_NO_PROVISIONING`.


## 12. Auditoría del canal administrativo y respaldos (2026-10-16)

**Nuevo GO PO «ok go» limitado a continuar la verificación y preparación, no a escribir en Supabase.** Informe específico `docs/PAZO_F16_P42_MANUAL_OPERATOR_PREFLIGHT_20261016.md`.

- **Canal PostgreSQL de escritura:** aún `UNVERIFIED`. La prueba efímera P43 anterior confirmó SOLO lectura; no autoriza ni demuestra capacidad de escritura. Para un siguiente gate autorizado, validar cliente administrativo en máquina privada con TLS `verify-full` + CA real y operaciones parametrizadas, sin contraseñas/secretos en shell, chat, SQL Editor, logs ni argumentos. **No repetir P43 ni resetear contraseña.**
- **Custodio principal DESIGNADO:** el Product Owner confirmó expresamente «sí» el 2026-10-16 para asumir la revocación manual supervisada en ambos destinos, en el futuro `Texp=T0+24h` o antes ante incidente. Owner y dos TOTP registrados según capturas; **no equivale a capacidad probada de SQL de escritura ni disponibilidad horaria todavía**. Suplente distinto autorizado con permisos probados y disponibilidad = `PENDING`. No inventar identidad o acceso de otra persona.
- **Revocación Edge:** mecanismo documentado de `secrets unset` / Dashboard, nunca ejecutado; verificación independiente por ausencia del nombre. DB: una eliminación exacta de `P42_V1` con comprobación de afectación y lectura posterior de 0 filas, una vez autorizada la operación real. Dos destinos deben pasar; un acuse aislado es insuficiente.
- **Hallazgo material de backups:** `scripts/backup-database.ps1` actual utiliza `pg_dump --format=custom` de DB completa; **no excluye datos de `supporter_private.p42_activation_signing_keys`**. Futuros backups dentro de ventana P42 podrían conservar `key_bytes` después del retiro. Flag potencial PostgreSQL 17 `--exclude-table-data=supporter_private.p42_activation_signing_keys` documentado oficialmente; prueba aislada de export/restore aún NO realizada. El runbook de backups recibió aviso de protección, **sin cambiar comportamiento del respaldo**. Bloqueo `BLOCKED_BACKUP_EXPORT_COULD_COPY_P42_KEY`.
- **Operación manual sigue aprobada solo como diseño** con 24 h a partir de T0 aún NO fijado. No se programaron recordatorios porque no hay fecha/hora de vencimiento. La expiración lógica no es limpieza física. `writer P42=false`, `P21=false`, `EXECUTE=false`, checkout/pagos/beneficios NO-GO sin alterar desde esta revisión.

**Estado del gate:** `P42_MANUAL_OPERATOR_CHANNEL_AND_BACKUP_PREFLIGHT_NO_GO`. Siguiente decisión humana mínima: confirmar custodio principal; después suplente y metodología de backups/canal privado, siempre antes de solicitar cualquier GO de provisión.

**Checkpoint 2026-10-16:** designación voluntaria del Product Owner como custodio principal **PASS de decisión**; suplente **pendiente**. Ningún dato bancario/credencial compartido; no se creó secreto ni se fijó fecha de provisión. El criterio `P42_MANUAL_OPERATOR_CHANNEL_AND_BACKUP_PREFLIGHT_NO_GO` sigue vigente hasta pruebas privadas de canales, backups, aceptación suplente y nuevo GO de provisión.

## 13. Decisión PO: alternativa sin suplente humano con acceso (2026-10-16)

**Se eligió preparar una alternativa con custodio único: solo el Product Owner tendrá acceso administrativo y será quien realice la revocación manual supervisada.** No invitar a otra persona ni compartir credenciales. Contrato específico: `docs/PAZO_F16_P42_SINGLE_CUSTODIAN_SAFE_ALTERNATIVE_20261016.md`.

Esta sección **sustituye los requisitos históricos de designar obligatoriamente un segundo custodio humano** para el diseño elegido, pero no resuelve la disponibilidad. La doble MFA del titular puede ayudar a recuperar acceso si usa medios independientes, pero no reemplaza a un operador ausente. Con retiro exclusivamente manual, **no existe garantía de eliminación física puntual a las 24 horas si el PO no puede actuar**. El secreto tampoco desaparece automáticamente mediante `not_after`.

**Preparación permitida:** revisión de recuperación de la cuenta Owner, pruebas privadas/sintéticas de las dos vías de retirada, respaldo sin copiar `key_bytes`, ventanas horarias prospectivas y eventual recordatorio aprobado cuando T0 exista. Mantener `P42_V1.enabled=false`, writer P42 OFF, worker P21 OFF, EXECUTE denegado y ninguna operación financiera.

**Provisión aún NO-GO:** además de las pruebas de canal y backups, requiere consentimiento PO futuro **separado** que reconozca específicamente el riesgo de revocación tardía sin suplente, fijar futura ventana de 24 horas y disponibilidad comprobada del titular. Si el PO prevé no poder atender el vencimiento, **no generar ni provisionar**. Si falla la eliminación, `P42_MANUAL_REVOCATION_OVERDUE_BLOCKED` y no declarar limpieza.

No se crearon secretos ni tareas, no se conectó PostgreSQL, no se modificaron Edge/PayPal ni se habilitaron cobros por esta decisión.

**Marcador vigente:** `P42_SINGLE_CUSTODIAN_DESIGN_ONLY_UNAVAILABLE_FALLBACK_NO_GO`.
