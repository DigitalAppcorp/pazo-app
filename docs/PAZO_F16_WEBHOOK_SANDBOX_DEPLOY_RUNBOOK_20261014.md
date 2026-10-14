# PAZO F16 — Runbook de despliegue SEGURO del nuevo receptor PayPal Sandbox

## Worker-local admission guard — Gate técnico solo GitHub (2026-10-14)

**Alcance implementado SIN despliegue:** `workerAdmissionGate.mjs` es un módulo con singleton compartido en cada isolate de Supabase. `core.mjs` reclama un cupo DESPUÉS de validar tamaño/JSON/tipo y ANTES de llamar a OAuth PayPal, al verificador de firmas o al RPC privado. Limita a **4 verificaciones simultáneas** y **60 intentos en una ventana móvil de 60 segundos, por isolate**; la memoria retenida es una lista acotada de marcas de tiempo, **sin IP, headers, identificadores ni payloads**.

- Si el cupo se agota: HTTP **503** `f16_worker_busy` y `Retry-After: 5`, nunca HTTP 2xx ni registro durable. El emisor debería reintentar; `Retry-After` es orientativo y **no demuestra que PayPal respete la cabecera**. PayPal informa de reintentos de webhook ante fallos de entrega: https://developer.paypal.com/api/rest/webhooks/rest/
- `try/finally` libera el cupo en firma inválida, indisponibilidad PayPal, fallo de base, duplicado o evento no reconocido. Los duplicados firmados siguen sujetos a una restricción persistida única en la inbox, independiente de la memoria del isolate.
- Los cuerpos inválidos o excesivos se rechazan antes de usar cupos de verificación PayPal. Los límites de bytes ya existentes de 65,536 permanecen. No hay caché de token, logs de PII ni nuevas dependencias.
- Tests adversariales aislados: concurrencia entre dos handlers con un gate compartido; limitación temporal aun tras liberar; reinicio de ventana; denegación sin llamadas externas; liberación en errores y duplicados; JSON inválido sin consumir presupuesto; imposibilidad de omitir un gate mal configurado. La suite F16 de CI contiene estos tests. El test de despliegue ahora exige el gate.
- **Limitación de seguridad fundamental:** este control NO es distribuido. Una nueva instancia/isolate puede consumir su propio cupo, por lo que NO limita invocaciones globales, tráfico HTTP entrante ni gastos agregados. Tampoco garantiza que eventos legítimos no sufran retrasos durante un ataque. No confiar en IP spoofable del cliente para autenticación. Supabase describe isolates independientes y límites de ejecución: https://supabase.com/docs/guides/troubleshooting/edge-function-cpu-limits y https://supabase.com/docs/guides/functions/limits
- **Gate todavía NO-GO para activar:** antes de habilitar, revisar protección efectiva de ingress/global y límites de gasto con solución compatible con plan gratuito y presupuesto PO, sin provisionar Upstash/WAF/plan pago sin GO, probar entrega real con PayPal Sandbox y confirmar que 503 + reintentos no producen pérdida de eventos. Reconciliar métrica de 503 y falsos rechazos mediante logs sanitizados, nunca datos personales.
- **Dependencia de despliegue futura:** al activar una versión autorizada debe incluirse `workerAdmissionGate.mjs` junto a los seis archivos previos (**siete archivos mínimos**) para que `core.mjs` resuelva su importación. Un bundle incompleto no es aceptable. Mantener pruebas/CI de cada bundle antes de su despliegue y no alterar el hosted v10 por este cambio.
- El código fuente nuevo **no está desplegado**. Hosting sigue `f16-paypal-webhook` v10 con release latch `false` y `supabase/config.toml enabled=false`. No modificar `paypal-webhook` legacy, PayPal webhook, checkout, subscripciones ni entitlements en este gate.

## Lectura de recursos PayPal ya realizada por PO — 2026-10-14 (prevalece sobre checkpoints anteriores)

- **GATE DE ACCESO LOCAL A RECURSOS = PASS.** El preflight `-Check Resources` ejecutado por el PO devolvió plan `P-14V25407JP6850922NLHMDKI` `ACTIVE` (`USD 2.99` / `MONTH/1`, sin issues/warnings), webhook `6N7889790V1467139` con ID coincidente y acceso a ambos mediante el mismo par de credenciales **introducidas localmente**. La autenticación OAuth desde Supabase se había probado por separado; **equivalencia exacta entre credenciales locales y las de Supabase no demostrada**.
- **Webhooks = CONFIGURACIÓN BLOQUEADA**: `destinationCategory=different_host` (no reconstruir URL real), no apunta a `f16-paypal-webhook`, y faltan exactamente `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`. Conservar seis eventos `BILLING.SUBSCRIPTION.*` ya configurados. `safeToActivate=false` es correcto.
- **Receptor Supabase todavía NO recibe**: `f16-paypal-webhook` alojada v10 inerte (`F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`), GET/POST normal 503 previamente validado. Cuatro tablas financieras F16 vacías y guard de entitlement `false`, comprobados nuevamente en modo solo lectura. No editar el webhook mientras destino seguro no esté habilitado y verificado.
- **Secuencia pendiente:** (1) cerrar revisión antiabuso/rate limits, verificación de firma/errores, costo y logging mínimo del receptor; (2) autorización PO nueva para activar y desplegar solamente el receptor Sandbox; (3) nueva autorización PO para modificar **el webhook existente**, cambiando destino por ruta F16 y añadiendo los tres eventos sin borrar los seis anteriores; (4) prueba auténtica end-to-end con comprador Sandbox y conciliación, sin membresías hasta un gate ulterior.
- Un `PASS` de configuración **no** valida firma, entrega de eventos ni pagos. El simulador de PayPal genera mock events no verificables por postback con webhook real: https://developer.paypal.com/api/rest/webhooks/simulator/ .

**Estado:** DESPLIEGUE INERTE AUTORIZADO, EJECUTADO Y VERIFICADO; ACTUALIZACIÓN/ACTIVACIÓN DE PAYPAL NO-GO. Se requiere GO independiente para secretos, activar receptor, cambiar webhook y permitir pagos.

## V7 namespaced inerte: ejecutado con aprobación PO (2026-10-14 UTC)

- Autorización PO **limitada** a desplegar el código F16 que lee `PAZO_F16_PAYPAL_*`, conservando `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false` y comprobar HTTP 503. **Ejecutado**, Edge F16 instalada como **versión 7** en `mrybvqdebbgcayuvgkkr` con seis archivos, incluyendo `sandboxConfigPreflight.mjs`.
- `get_edge_function` confirmó en la versión alojada que el latch sigue desactivado y que `receiver.mjs` importa el preflight que exige claves F16 aisladas. Las cinco variables se ingresaron según confirmación del PO, **pero no se leyó ningún secreto ni se verificó su validez con OAuth**.
- Prueba HTTP de extremo externo **PASS**: [GitHub Actions #38518547361](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38518547361), GET y POST vacío: `503` + `f16_receiver_not_released`. Sin payload, firmas ni comprador; ninguna operación de PayPal. Se eliminó el workflow de un solo uso tras PASS.
- Postflight: otras Edge alojadas en `paypal-webhook` v35, `f14-moderation-purge` v47 y `f14-moderation-reconcile` v34, sin alterar; F16 inbox/intents/pagos/reversos siguen 0 filas, sin beneficios (`wall_has_verified_entitlement(NULL)=false`). El receptor **no procesa webhooks**.
- **Gate pendiente:** mecanismo de verificación OAuth Sandbox no invasivo y separado, bajo nueva autorización, sin recibir eventos reales ni conceder beneficios. No se tocaron ni autorizaron webhook PayPal, secretos, Live, cobros o membresías.

## Gate PO: despliegue INERTE ejecutado, resto sigue NO-GO (2026-10-14 UTC)

**Aprobación PO específica consumida:** desplegar SOLAMENTE `f16-paypal-webhook` desactivada para comprobar respuesta HTTP 503. Ejecutado en Supabase Free sin nuevo proyecto/plan/adicionales. La nueva Edge aparece `ACTIVE v1` (ID `b0da866f-aae3-4785-99a3-6a6314e3c3c8`), pero su `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false` cancela cualquier solicitud antes de leer secretos o webhooks. `supabase/config.toml enabled=false` sigue para evitar despliegues automáticos; `verify_jwt=false` solo porque el proveedor no lleva JWT y la futura lógica tendrá que verificar firma.

**HTTP real verificado:** workflow de un único uso `38512959544` SUCCESS: GET sin autorización, datos ni secretos a la nueva función → **503** y `f16_receiver_not_released`; el workflow de prueba fue borrado tras pasar para no realizar invocaciones repetidas. **Postflight:** cuatro tablas F16 con 0 filas, muro `false`, otras tres Edge con las mismas versiones (v30/v42/v29). No se hizo ningún cambio en PayPal, su webhook ID/URL/eventos, Edge secrets ni `profiles.is_founder`.

**Los pasos 2, 4, 5, 6 y 7 inferiores siguen PENDIENTES y requieren aprobaciones independientes; el paso 3 de despliegue inerte ya pasó.** La cuota actual del plan Free contiene 500 000 invocaciones/mes, y la documentación actual establece máximo 100 funciones/proyecto Free; un 503 cuenta como invocación. No se conoce un cobro específico por crear esta cuarta función.

## Bloqueo de colisión de secretos legacy — verificado en función alojada v30

La auditoría read-only de la Edge Function alojada `paypal-webhook` **v30** encontró que utiliza **las cinco variables genéricas** `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` y `PAYPAL_PLAN_ID`. Los secretos de Supabase son compartidos por las Edge Functions del mismo proyecto. **NO modificar esas cinco claves genéricas**, pues puede cambiar involuntariamente el comportamiento de v30 (por ejemplo Sandbox/Live). La nueva F16 exige únicamente nombres aislados:

- `PAZO_F16_PAYPAL_ENV=sandbox`
- `PAZO_F16_PAYPAL_WEBHOOK_ID=6N7889790V1467139`
- `PAZO_F16_PAYPAL_PLAN_ID=P-14V25407JP6850922NLHMDKI`
- `PAZO_F16_PAYPAL_CLIENT_ID` y `PAZO_F16_PAYPAL_CLIENT_SECRET` (valores confidenciales que deben permanecer solo en Supabase Secrets, nunca en repositorio/chat).

El código y las pruebas de F16 quedaron migrados al prefijo `PAZO_F16_`; el receptor alojado versión **v1 sigue inerte**, sin actualización de código ni secretos. **Se necesita un nuevo despliegue expresamente autorizado** antes de activar cualquier recepción, para que el runtime use el código nuevo. No se consultaron valores de ninguna variable.

## Actualización del gate de secretos — verificada contra Supabase (2026-10-13 LA)

- Supabase reserva el prefijo `SUPABASE_` y suministra automáticamente `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (legacy server key) a Edge Functions. **No añadirlas como nuevas variables**. Referencia oficial: https://supabase.com/docs/guides/functions/secrets
- El conjunto propio de F16 Sandbox se reduce a **cinco variables PayPal**: ambiente, webhook ID, plan ID, client ID y client secret. No introducir credenciales Live ni secretos en el repositorio; la plantilla `.env.example` contiene solo nombres, valores públicos y campos vacíos.
- `sandboxConfigPreflight.mjs` comprueba formato/alcance y devuelve únicamente nombres de variables ausentes o incorrectas. **No prueba que el OAuth de PayPal funcione ni confirma que exista una credencial real**: eso exige consulta autenticada desde servidor tras un GO específico y mecanismo protegido.
- **No se ha consultado ni cambiado ningún secreto alojado.** El conector Supabase actualmente conectado no proporciona una acción de listar/guardar secretos. No inventar estado de configuración.
- Advertencia de prueba: PayPal Simulator genera eventos ficticios y no acredita una firma verificada con el webhook ID real; un test de extremo a extremo requiere una operación real *Sandbox*, no Live. Fuente PayPal: https://developer.paypal.com/api/rest/webhooks/simulator/

## Estado comprobado

- Supabase project: `mrybvqdebbgcayuvgkkr`. Inbox, intenciones, pagos y reversos privados ya están instalados y vacíos, y su acceso está restringido al servidor. No hay períodos acreditados ni beneficios pagados.
- Edge existente: `paypal-webhook` v30, **no utilizar** como destino; puede escribir `profiles.is_founder` desde `ACTIVE`. Nuevo slug `f16-paypal-webhook` **DESPLEGADO v1 PERO INERTE**, HTTP 503 validado.
- PayPal Sandbox: plan `P-14V25407JP6850922NLHMDKI`; webhook existente `6N7889790V1467139` apunta a un destino de dashboard, no a la nueva Edge Function. Falta sumar eventos de venta/reembolso/reversión. **No actualizar todavía**.
- Código F16: `supabase/functions/f16-paypal-webhook/index.ts` con `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`; `supabase/config.toml` con `enabled=false`, `verify_jwt=false`. El endpoint no acepta eventos hasta una modificación de código específicamente aprobada.

## Orden de gate propuesto; requiere autorizaciones específicas

1. **Preflight de costo y seguridad:** comprobar en Supabase plan/cuotas y límites de Edge Functions; el número de llamadas del webhook puede generar uso facturable, especialmente en reintentos/abuso. No habilitar ningún servicio nuevo, plan ni aumento de gasto sin aprobación. Verificar CI y PostgreSQL F16 SUCCESS para el HEAD concreto y una política de protección ante tráfico malicioso.
2. **Configuración de servidor (GO independiente):** crear o comprobar únicamente cinco variables de PayPal en Supabase Edge Functions Secrets: `PAZO_F16_PAYPAL_ENV=sandbox`, `PAZO_F16_PAYPAL_CLIENT_ID`, `PAZO_F16_PAYPAL_CLIENT_SECRET`, `PAZO_F16_PAYPAL_WEBHOOK_ID=6N7889790V1467139` y `PAZO_F16_PAYPAL_PLAN_ID=P-14V25407JP6850922NLHMDKI`. **NO intentar crear `SUPABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY`: Supabase las inyecta automáticamente; `SUPABASE_` es un prefijo reservado.** Verificar su disponibilidad desde el servidor sin imprimir valores y confirmar que la clave automática de servicio sea accesible solo en Edge. Nunca introducir credenciales Live ni registrar ningún valor en GitHub/chats. Preflight sin secretos: `sandboxConfigPreflight.mjs`, plantilla `supabase/functions/f16-paypal-webhook/.env.example`. Las claves y variables de PayPal se comparten a nivel de proyecto Edge: el GO debe considerar que otras funciones existentes podrían leerlas, aunque el receptor F16 permanezca inerte.
3. **Despliegue aislado de receptor inerte (GO independiente):** desplegar **solo** nuevo slug `f16-paypal-webhook` con sus importaciones locales; `verify_jwt=false` porque PayPal no manda JWT. Probar que responde 503 con latch OFF; comprobar que las funciones existentes (especialmente `paypal-webhook` v30 y F14) no cambian. No modificar destino PayPal.
4. **Activación controlada de receptor (GO independiente):** revisión final de verificación criptográfica/paypal postback y límite de tráfico; cambiar en PR el latch/config tras aprobación, desplegar solo el nuevo slug; comprobar firma inválida 401, ausencia de datos en inbox, 503 ante proveedor/DB caídos y registro idempotente tras firma real. Nunca usar payload inventado para certificar una firma real.
5. **Corrección del webhook Sandbox (GO independiente):** actualizar **el registro existente** `6N7889790V1467139`, no crear un webhook duplicado: URL exacta `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/f16-paypal-webhook`; eventos `BILLING.SUBSCRIPTION.*` ya existentes y añadir `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`. Verificar configuración con lectura autenticada, sin exponer la URL si contiene tokens.
6. **Prueba real de PayPal Sandbox:** usar comprador Sandbox descartable consentido; firma SUCCESS validada por API oficial, inserción de solo ID y tipo, duplicados no acreditados, reembolso real y webhook fuera de orden, fallas del proveedor/DB y recuperación con idempotencia. Comparar cuenta Auth + intención + plan $2.99, pero **no activar entitlement** hasta verificar período pagado + reversos.
7. **Scope closure y habilitación de beneficios (otro GO):** retención legal y limpieza de ledger/intent, account deletion F14, cobertura mensual y expiración, reversiones/chargebacks, consentimiento del muro, UI cancelación y política ES/EN. No modificar `profiles.is_founder`.

## Reversión segura

- Si la Edge rechaza o no confirma entrega, **no** apuntar de nuevo a `paypal-webhook` v30 insegura.
- Desactivar recepción de eventos Sandbox y volver el nuevo receptor a un estado 503 con latch OFF, sin borrar la inbox ni pagos/reversos duraderos, sin tocar Live.
- Conservar IDs para reconsulta y reintentos, revisar estados sin divulgar payload ni credenciales; no borrar evidencia financiera ni forzar membresías.
- Revertir solo el despliegue/configuración específicamente afectado, previa comprobación del SQL y los registros existentes. Una operación de rollback de la base no está aprobada por este runbook.

## Criterios medibles del gate receptor

- 0 escrituras a `profiles.is_founder`, 0 entitlements y 0 cobros Live.
- Sandbox-only; secret/env ausente → 503; firma inválida → 401; body excesivo → 413; DB no durable → 503, repetición firmada válida → 200 sin duplicado.
- Firma valida contra webhook ID correcto y cuerpo original, usando únicamente dominios Sandbox PayPal. Ninguna ruta controlada por el usuario recibe la service-role key.
- Flujo de registros privados: 1 ID por evento, RLS forzada, prohibición de acceso cliente y sin PII ni cuerpo del webhook.
- Mostrar evidencia de consola y CI sin tokens, JWTs ni datos de comprador.

**Referencia:** `docs/PAZO_F16_SANDBOX_RELEASE_GATE_20261014.md` y `docs/PAZO_ACTIVE_HANDOFF.md`. La autorización actual para SQL **no** habilita este runbook.
