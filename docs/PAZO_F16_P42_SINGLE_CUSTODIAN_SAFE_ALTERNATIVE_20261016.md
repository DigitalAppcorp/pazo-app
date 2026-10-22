# PAZO F16-P42 — alternativa de custodio único (solo preparación; NO-GO)

**Fecha:** 2026-10-16. **Decisión PO:** elegir una **alternativa segura sin conceder acceso administrativo a un custodio suplente**. Product Owner sigue siendo único custodio principal y operador humano de revocación P42. No es permiso para generar, guardar, utilizar, rotar o eliminar secretos; no modifica Supabase.

## Delimitación y riesgo residual no resuelto

**Una revocación exclusivamente MANUAL a las 24 horas, ejecutable solo por una persona, no garantiza la eliminación física puntual si esa persona está ausente, enferma, sin conexión o sin acceso a ambos servicios.** Una alarma/recordatorio NO elimina material; un timestamp SQL tampoco. **No calificar el mecanismo como plenamente seguro, automático, probado ni listo para producción o provisión.**

La elección de «alternativa segura» se interpreta **solo** como decisión de explorar un diseño de *acceso administrativo exclusivo del PO*; no implica aceptación expresa del riesgo residual de una única persona, ni una excepción de GO a controles ya aprobados.

**Estado obligatorio actual: P42 NO-GO, clave 0, T0 indefinido, writer P42 OFF, worker P21 OFF, ninguna autorización de EXECUTE a roles API, checkout/pagos/ledger/beneficios OFF.** Seguir P43 read-only como prueba CERRADA, no reintentar ni resetear contraseña PostgreSQL.

## Modelo propuesto de custodia y continuidad

| Protección | Contrato propuesto | ¿Verificado? |
| --- | --- | --- |
| Responsable humano único | Product Owner (designado) | Sí, decisión PO; disponibilidad y operación no probadas |
| Segundo administrador humano | **Ninguno**; no invitar cuentas ni compartir permisos/credenciales | Decisión de diseño, no mecanismo de recuperación |
| Recuperación del mismo dueño | Dos factores TOTP registrados; antes del GO corroborar uso desde medios independientes y capacidad de recuperar cuenta sin exponer códigos | MFA PASS visual; resiliencia real pendiente |
| Retirada Edge | Por Owner, solo `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`; comprobar ausencia de nombre sin exponer valores | Mecanismo documentado; retirada real no probada |
| Retirada DB | Canal privado admin PG17 con TLS `verify-full`, CA confiable y DML parametrizado, seleccionar/retirar solo `P42_V1`; comprobación metadata-only posterior | Canal de escritura no verificado |
| Disponibilidad | No fijar T0 ni generar clave si el PO no reserva y confirma su presencia y acceso a ambos destinos **para Texp=T0+24h UTC** | Pendiente; no existe agenda |
| Recordatorios opcionales | Solo notificaciones al PO, creadas con consentimiento expreso **cuando T0 exista**; ninguna ejecuta borrados | No creados, fecha aún desconocida |
| Capacidad de contingencia | Permitir retirar anticipadamente ambos destinos por sospecha de incidencia o pérdida de disponibilidad, usando únicamente acceso del PO; comprobar ambos, sin prolongar ventana | Diseño; sin prueba operativa |
| Inactividad financiera | `enabled=false` DB, gates OFF, roles sin `EXECUTE`, ningún procesamiento de pagos o beneficios | Estado histórico informado/validado en P43; preflight fresco solo en GO ulterior |
| Residuos de backups | No exportar `key_bytes` en `pg_dump`; preservar respaldos/restauraciones de otros datos; inventario de dumps manuales/externos | **BLOCKED**: script actual exporta todas las tablas |

## Secuencia humana prevista, solo para gate futuro separado

**Antes de un futuro GO de generación/provisión** (no ejecutar aún):

1. Verificar que el PO pueda usar sus dos factores de autenticación desde dispositivos/medios apropiados y manejar el panel Edge **sin revelar secretos**; **la cuenta Owner no comprueba permisos write PostgreSQL**.
2. Ensayar contra un PostgreSQL **descartable** el procedimiento administrativo de creación y eliminación exacta, TLS y canales privados; prohibido reusar P43, invocar el SQL Editor con secretos o conservar passwords en argumentos/logs.
3. Corregir y probar en laboratorio el script de backup de PAZO para conservar esquema y datos no sensibles **sin `key_bytes`** de P42; validar exportación, restauración y no-regresión. No cambiar script remoto/hosted ni detener backups reales por este borrador.
4. Revisar usos de Edge Secrets y copia residual. Auditar permisos de administración existentes, sin añadir un segundo administrador ni gastar dinero.
5. Confirmar nueva autorización PO concreta para provisionar/revocar, incluyendo aceptación explícita del riesgo **SIN suplente humano**, solamente después de que otros controles estén verificados; **aún no existe**.
6. Seleccionar **T0 futuro** y comprobar que PO tendrá acceso a ambos destinos en `Texp=T0+24h` (zona UTC), sin agendas incompatibles. Si alguna dependencia falla, **ABORTAR ANTES DE GENERAR**. La clave futura quedará apagada y sin grants; la aprobación futura de provisión no autoriza su utilización.
7. Con T0 definido y autorización del PO, se podrán ofrecer recordatorios al dueño, nunca borrado automático. No inventar fecha/hora.

**En Texp, con autorización operativa futura**:
1. Confirmar `writer=false`, `P21=false`, EXECUTE denegado, y solo entonces retirar el nombre Edge exacto y la fila DB `P42_V1` mediante procedimientos autorizados.
2. Verificar **por separado y en fresco** ausencia del secreto Edge y 0 filas DB, sin leer claves. Confirmar que el estado financiero no cambió.
3. Registrar hora de retiro UTC y resultados sin secretos, hashes de clave ni IDs personales. Cualquier residual en backups puede impedir declarar destrucción universal.
4. Si hay caída, bloqueo, ausencia del PO o comprobación parcial: `P42_MANUAL_REVOCATION_OVERDUE_BLOCKED`; mantener ejecución prohibida, **no reclamar eliminación física**, no renovar/provisionar de nuevo y gestionar limpieza en cuanto el PO recupere acceso. No existe un tercero que pueda garantizar actuación.

## Gate y alcance

- **APROBADO:** preparar un modelo sin suplente con acceso admin, manteniendo un solo custodio.
- **SIN APROBAR:** una excepción que garantice eliminar la clave a las 24h pese a la indisponibilidad del custodio; no hay tal garantía en modo estrictamente manual.
- **NO-GO:** clave real, SQL hosted, Edge set/unset, habilitación de grants, writer/worker, checkout, PayPal Sandbox buyer/Live, pagos, ledger, beneficios, cron de borrado, recursos pagados, despliegues o merge.
- **Gates independientes pendientes:** canal PG administrativo privado, test de backups excluyendo `key_bytes`, inspección del alcance de secretos Edge, recuperación de la cuenta titular, horario real de 24h, consentimiento explícito para riesgo residual SIN suplente y GO futuro de provisión.

**Marcador:** `P42_SINGLE_CUSTODIAN_DESIGN_ONLY_UNAVAILABLE_FALLBACK_NO_GO`.

**Relación con contratos anteriores:** este diseño sustituye el supuesto de que el PO designará obligatoriamente un **segundo administrador humano**, pero **NO** sustituye la exigencia de recuperación/operación verificable, limpieza manual acreditada, inactividad financiera, protección de respaldos y autorización separada. Los apartados históricos siguen siendo evidencia, no instrucciones nuevas de alta de suplente.
