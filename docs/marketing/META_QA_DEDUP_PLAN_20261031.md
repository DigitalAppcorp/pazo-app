# PAZO — QA de deduplicación Pixel + CAPI
**31-oct-2026 | CANDIDATO OFF | No desplegado**

## Objetivo y evidencia existente

El dataset experimental **PAZO QA - Pruebas**, ID `1090116830295088`, está separado de **PAZO Web** (`1438916858347709`). El titular realizó dos envíos manuales desde PowerShell, sin compartir credenciales:
- El primero devolvió `events_received: 1` y el mensaje de Meta `test_event_code ... does not match an active Test Events session`. **Esto NO probó una sesión activa.**
- El segundo devolvió `events_received: 1`, `messages` vacío y `fbtrace_id = Au1Q320VyhgIOZOo9Go2VRM`. **Confirma aceptación por API sin advertencias, no presencia comprobada en Events Manager ni deduplicación.**
- La pantalla actual `Probar eventos` (canal Sitio web) sólo mostró instrucciones; no se observó listado de eventos recibidos. La pestaña `Resumen` no es una prueba concluyente para tráfico con `test_event_code`.

No generar un `event_id` en el navegador para registros reales. El UUID único se emite una sola vez en el outbox de registro confirmado en el servidor y se entrega al navegador sólo mediante su comprobante firmado por Auth.

## Prueba automatizada CI (SIN red y sin credenciales)

`scripts/meta-qa-dedup-contract.test.mjs` importa y ejecuta el **código candidato real**:
- `buildMetaRegistration` produce el contrato común `CompleteRegistration`, mismo dataset QA y un UUIDv4 sintético compartido.
- `loadMetaPixelForVerifiedSignup` se ejecuta en navegador/DOM simulado; el `script.onload` se simula y **NO** descarga Meta SDK. Debe encolar exactamente `fbq('trackSingle', '1090116830295088', 'CompleteRegistration', {}, {eventID: uuid})`, sin `PageView`.
- `sendMetaCapi` usa `fetchImpl` simulado; comprueba un único POST a `/v26.0/1090116830295088/events`, `data[0].event_name`, `data[0].event_id`, credencial sólo en Authorization, `test_event_code` sintético en el cuerpo, y campos de coincidencia mínimos.
- Verifica rechazo sin opt-in, GPC, retirada, QA/admin, sesiones sin registro confirmado y URL/dataset/identificadores incorrectos.
- Verifica que una segunda llamada al cargador en un documento que ya posee Pixel **NO** vuelve a enviar.
- Verifica el caso reportado por Meta: `events_received:1` con `messages` NO es aceptación limpia. El cliente devuelve `accepted_with_warnings`, sin exponer el mensaje original; la entrega CAPI se marca terminal `sent` para **no retransmitir una conversión ya recibida**. Sólo `messages:[]`/ausencia de advertencias produce `accepted`.

**Resultado de esta suite:** contractualmente alineado; no demuestra que Meta deduplique en su plataforma. No reutilizar el código `TEST67597` después de que cambie o termine la sesión, ni inferir su vigencia de una captura histórica.

## Procedimiento de deduplicación real QA — BLOQUEADO hasta revisión de privacidad/SDK

El paso posterior deberá realizarse **únicamente en un origen/laboratorio separado**, nunca `https://pazo-app.vercel.app/` ni con usuarios reales:
1. Confirmar base jurídica y límites del SDK: al cargar Pixel Meta puede recibir IP, URL, referer, cookies y otros datos que **no** caben necesariamente dentro de los campos del evento explícito. Inspeccionar solicitudes y evitar que el servidor/sitio publique PII, UTM, mascotas o sesiones.
2. Obtener consentimiento *explícito* del navegador usado en esa prueba de QA; respetar GPC desde antes de descargar el SDK. No emplear identidades ni correos reales para la simulación.
3. Levantar un origen **QA** autorizado, con **sólo** el dataset `1090116830295088`; la credencial de QA queda **exclusivamente en la máquina/servidor**, nunca en código frontend, GitHub, capturas o querystrings.
4. Tras consentimiento QA, generar **un UUIDv4 de prueba** en el coordinador del laboratorio; reutilizarlo tanto en el evento browser `eventID` como en el cuerpo CAPI `event_id`. Usar el mismo nombre `CompleteRegistration`; el servidor usa el `test_event_code` **vigente y con sesión abierta** en Meta.
5. Verificar con DevTools que el evento de navegador usa el dataset QA y lleva el ID `eid`/eventID esperado; verificar en el cuerpo CAPI `event_id` igual y `events_received:1`, `messages` vacío. No mostrar token/PII. Si Eventos de prueba sigue sin listar filas, consultar diagnóstico independiente de Meta; **no** declarar dedup PASS por un `1` sin mensajes.
6. Confirmar en el proveedor que **ambos orígenes** se correlacionan y que la misma acción **no cuenta dos veces**, con evidencia de deduplicación, no sólo dos solicitudes aceptadas. Registrar el intervalo y ausencia de múltiples llamadas. Meta suele asociar por `event_name` + `event_id`/eventID dentro de la ventana de deduplicación.
7. Repetir escenarios negativos: sin consentimiento, GPC, retirada entre eventos, bloqueo de SDK, proveedor inalcanzable, retry idempotente de CAPI y usuario excluido. **Todos los negativos** deben producir cero nuevas transferencias a Meta y no afectar registro real.

**Criterios de salida a producción:** NO-GO mientras falten revisión legal de finalidad y retención, aviso público ES/EN, derechos/opciones de exclusión, auditoría SDK de cookies/URL, trazabilidad de consentimiento, migración SQL y funciones Edge verificados en entorno no productivo, deduplicación certificada en QA por proveedor, credencial independiente de PAZO Web, y autorización posterior del PO.

## Separación y costos

- Infraestructura candidata: Node/CI, Supabase existente y API directa Meta. Sin CAPI Gateway, plataformas de pago, Pixel en producción ni nueva base de datos alojada.
- La prueba CI es sintética y **no puede alterar** campañas ni métricas reales.
- `PR #171`: DRAFT sobre #170; mantener todas las barreras OFF y no mergear/deplegar antes del GO.
