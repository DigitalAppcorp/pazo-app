# PAZO #169 — Diagnóstico de Pixel, worker y aislamiento (1-nov-2026)

**Estado: candidato OFF.** PR #171 DRAFT. Sin merge, despliegue, SQL alojado ni evento nuevo enviado a Meta. Todas las solicitudes de evento de este documento se abortaron en el navegador.

## Por qué no aparecía `/tr` en el laboratorio

**Causa: Meta filtra los navegadores automatizados.** No era el bootstrap, el consentimiento ni el dataset.

- `fbevents.js` detecta `HeadlessChrome` y `navigator.webdriver`, y la configuración del dataset QA incluye una lista de bloqueo de bots con `HeadlessChrome/`.
- `scripts/meta-vendor-diagnostic-browser.mjs` comparó ocho órdenes de carga en dos perfiles de navegador, con el SDK real:

| Perfil | Solicitudes `CompleteRegistration` |
| --- | --- |
| Chromium headless por defecto | 0 de 8 |
| Mismo Chromium sin marcas de automatización | 8 de 8, incluido el orden del candidato |

Cada intento llevó el dataset QA y el `eid` esperado. Una corrida anterior de 7 variantes tuvo una excepción headless, `trackSingle` en cola, compatible con una carrera antes de aplicar la configuración; no se reprodujo y su causa no está demostrada.

**Consecuencias:**
- Los intentos de CI del 31-oct no podían observar un evento. No prueban un fallo del Pixel de PAZO.
- Ocultar la automatización para **entregar** eventos a Meta no es una prueba válida y no se hizo. Sirve solo para auditar con eventos abortados. La prueba de entrega requiere un navegador humano.
- `meta-vendor-egress-browser.mjs` audita ahora el cargador real y resulta `OBSERVED_VENDOR_EVENT_BLOCKED_BY_AUDIT`: un intento correcto, `_fbp` creada y eliminada al revocar.
- Solicitud observada ≠ recepción de Meta. `BROWSER_PIXEL_DELIVERY` y la deduplicación siguen sin probar.

## Datos que el Pixel transmitiría

Parámetros observados en la solicitud real, además de la IP y cabeceras que recibe Meta: `id, ev, eid, dl, rl, fbp, ts, sw, sh, tz, v, r, o, ec, it, if, iw, ler, plt, tm, coo, aems, rqm, expv2[]`. No se observó `ud[...]`.

**Hallazgo corregido:** `dl` llevó la URL completa, incluidos `utm_source` y `access_token` sintéticos. Una URL de confirmación con token o código habría salido hacia Meta. `metaPixelLoader.mjs` ahora no carga el SDK si la URL o el referrer tienen query, fragmento o credenciales.

**Pendiente de integración:** el flujo toma el comprobante del servidor antes de llamar al cargador. Si la URL no está limpia en ese momento, el Pixel de ese registro se pierde y solo queda CAPI. La integración debe limpiar la URL de Auth antes de pedir el comprobante.

## Autenticación del worker

| Hallazgo | Corrección | Evidencia |
| --- | --- | --- |
| Con `verify_jwt=true` (valor por defecto) el gateway rechaza el secreto de despacho antes del handler | `[functions.pazo-meta-worker]` con `verify_jwt=false`, como otros workers privados y como indica [Supabase](https://supabase.com/docs/guides/functions/auth), y `enabled=false` hasta su GO | Función de control detrás de JWT devuelve 401 del gateway |
| A través del gateway real un POST vacío llega como stream vacío; `request.body!==null` rechazaba **toda** llamada, también la autorizada | Se detiene en el primer byte; un stream vacío pasa; bytes o stream detenido dan 400 | Laboratorio HTTP y pruebas unitarias |

Sin `verify_jwt`, el handler sigue rechazando `Origin`, cookies, métodos distintos de POST y secreto incorrecto o ausente.

## Aislamiento de pruebas

`_shared/metaSupabaseOrigin.mjs` sustituye la URL fija de producción por una lista permitida que **une cada backend a su dataset**:

| Backend | Dataset permitido |
| --- | --- |
| Producción, sin declaración aislada | Solo PAZO Web |
| `META_ISOLATED_SUPABASE_ORIGIN`, igual a `SUPABASE_URL`, proyecto `*.supabase.co` distinto o Kong local | Solo PAZO QA |

Producción declarada como aislada, URLs arbitrarias, rutas o credenciales: worker desactivado. Dataset cruzado: `not_configured` antes de cualquier lease.

## Matriz

| Control | Estado | Alcance real |
| --- | --- | --- |
| Pruebas unitarias Meta (176) y frontera OFF | PASS | Sintéticas |
| Worker real con gateway, Edge, SQL candidato y proveedor falso | PASS | `LOCAL_REAL_WORKER_HTTP_PASS`, solo laboratorio |
| Un evento durable, sin reenvío, retirado suprimido, mismo `event_id` que SQL | PASS | Proveedor falso |
| Causa de 0 `/tr` en CI | DEMOSTRADA | SDK real, eventos abortados |
| Orden del candidato genera el intento correcto | PASS | Intento en navegador, no recepción |
| Entrega Pixel en el Chrome del titular | PASS | Solo evento sintético en dataset QA, sitio QA; ver ensayo abajo |
| Fila CAPI en Probar eventos | PASS | Evento manual del script QA, no del worker |
| Mismo nombre, ID y dataset en ambos orígenes | PASS | Observado en Probar eventos |
| Deduplicación Pixel + CAPI confirmada por Meta | NOT_PROVEN | Ambas filas siguen en «Procesado», sin indicación de deduplicación |
| Worker detrás del gateway alojado | NOT_TESTED | Sin despliegue ni staging aislado |
| Aviso legal, campos de matching, retención | BLOCKED | Decisión y revisión del titular |
| Conversiones reales | NOT_TESTED | Meta OFF |

## Ensayo real en dataset QA (1-nov-2026)

Autorizado por el titular. Una ejecución, ID `1b3874a4-14f8-49a4-8248-2691bcbecc31`, código de sesión vigente, sin usuarios reales.

| Origen | Evidencia | Datos que Meta indica |
| --- | --- | --- |
| Navegador, Chrome del titular, 9:09:25 pm | `/tr` HTTP 200, dataset y `eid` correctos; fila «Procesado» | IP y agente de usuario |
| Servidor, script manual, 9:09:40 pm | `events_received=1`, `messages` vacío, `fbtrace_id=AA0XgqbcBRczXx8le4PFN56`; fila «Procesado» | Correo sintético con hash y agente de usuario |

**Interpretación:** la conexión funciona en un navegador humano y los dos orígenes usan la clave que [Meta](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events/) documenta: `event_name` + `event_id`, con ventana de 48 horas. **No se observó ninguna indicación de Meta de que uno se descartara**, y la documentación consultada no aclara si Probar eventos la muestra. Por eso `META_PROVIDER_DEDUP=NOT_PROVEN`.

Tampoco se probó el código de PAZO en la app, el worker con Meta real, el cargador candidato en este sitio (la página QA usa su propio bootstrap) ni conversiones reales. La retirada del sitio mostró su mensaje, pero las cookies no se inspeccionaron en este ensayo. El token QA quedó solo en el aviso oculto de la terminal.

**Siguiente verificación, sin nuevos envíos:** en Resumen o Diagnóstico del dataset QA, revisar más adelante si los datos agregados de `CompleteRegistration` reflejan deduplicación. Ese tráfico lleva `test_event_code` y puede no aparecer allí; su ausencia tampoco la refuta. Una confirmación más fuerte exigiría un evento sin código de prueba, que requiere una decisión aparte.

## Protocolo de deduplicación, solo dataset QA

Lo ejecuta el titular. Meta recibe la IP y los datos técnicos de ese navegador. No usar correo ni cuenta real.

1. En Events Manager, abrir **PAZO QA - Pruebas → Probar eventos**, canal Sitio web, copiar el código vigente y dejar la sesión abierta.
2. Abrir https://pazo-meta-qa-20261031.vercel.app en un navegador normal, sin bloqueadores y con Red abierto.
3. Marcar la casilla y pulsar una vez. En Red, filtrar `facebook.com/tr` y confirmar `id=1090116830295088`, `ev=CompleteRegistration` y `eid` igual al ID de la página.
4. Antes de cinco minutos, ejecutar una sola vez, con el token QA en el aviso oculto:
   ```powershell
   powershell -NoProfile -File .\scripts\meta-qa-dedup-capi-once.ps1 -EventId <ID> -TestEventCode <CODIGO>
   ```
5. En Probar eventos, comprobar `CompleteRegistration` de Navegador y Servidor y su estado de deduplicación. Compartir una captura sin credenciales.

`events_received=1` no prueba deduplicación. Si Meta no muestra ambos orígenes, el resultado es NOT_PROVEN, sin repetir a ciegas. El script se validó solo sintácticamente.

## Limpieza

Eliminar el proyecto Vercel `pazo-meta-qa-20261031` al cerrar el ensayo, con revisión del titular.
