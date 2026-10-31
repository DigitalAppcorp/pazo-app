# PAZO #169 — Inventario de datos Meta Pixel/CAPI y decisiones de privacidad (BORRADOR, 31-oct-2026)

**Estado: REVIEW CANDIDATE / NO-GO. No es dictamen legal, consentimiento publicado ni permiso de transmisión.**
**Origen:** inspección directa de `metaConversion.mjs`, `metaCapi.mjs`, `metaPixelLoader.mjs`, `metaConsentTransport.mjs`, `metaGpcSync.mjs`, `MetaConsentChoice.tsx`, `meta-outbox-candidate.sql` de PR #171. Fuente pública: [CPPA FAQ](https://cppa.ca.gov/faq), [CPPA regulación en vigor (índice)](https://cppa.ca.gov/regulations/), [SDK oficial Meta CAPI](https://github.com/facebook/facebook-python-business-sdk) y [especificación oficial archivada de CAPI](https://github.com/facebookarchive/Facebook-Server-Side-API-Swagger). Las exigencias precisas de Meta y la ley aplicable deben revalidarse antes de liberar.

## Regla mínima

Se necesita distinguir **medición propia** de **compartición externa con Meta**. La existencia de un registro, campaña atribuida, cookie o correo confirmado NO autoriza una transferencia a un tercero. El propósito Meta debe haber sido concedido explícitamente después del aviso vigente, con GPC/retirada prevaleciendo y con una verificación del servidor inmediatamente anterior al envío. En ausencia de cualquiera de esas condiciones el proveedor permanece OFF. Para tener datos de Meta no se necesita ni se propone instalar una rama Supabase de pago.

## Inventario estricto del contrato ACTUAL (no contenido enviado)

| Campo/dato | Candidato Pixel navegador | Candidato CAPI servidor | Decisión previa a GO |
| --- | --- | --- | --- |
| `CompleteRegistration` | Evento únicamente tras recibo del servidor | `event_name` fijo | Permitido **solo** tras consentimiento y registro realmente confirmado; se excluyen solicitudes de signup, login, demo, QA/admin |
| UUIDv4 aleatorio | `eventID` | `event_id` idéntico | Necesario para dedup; no es Auth user ID ni ID de mascota; una sola emisión/registro |
| Tiempo del evento | Puede originarse en ejecución del Pixel | `event_time` Unix segundos generado por backend | Revisar edad, desfase y ventana del proveedor; sin reescribir momento para aparentar evento nuevo |
| URL de origen | Conexión del SDK puede incorporar URL/referrer según comportamiento real | `event_source_url=https://pazo-app.vercel.app/` fija, sin parámetros | No transmitir UTM, parámetros de cuenta ni información de URL privada; medir red real antes de GO |
| Identificador del dataset | Inicialización `fbq('init', dataset)` | Ruta Graph API con ID y token de servidor en header | Dataset PAZO Web verificado por titular; tokens exclusivamente secrets servidor, nunca navegador/log/PR |
| Email del usuario | **No** hay matching avanzado explícito en el loader; comportamiento real del SDK aún NOT_TESTED | `user_data.em`: hash SHA-256 de email, obligatorio por el contrato actual | **BLOCKED.** Es dato personal derivado, NO anónimo. Código NO obtiene email real ni calcula hash autorizado. Aprobación jurídica + inventario de origen/transformación antes de implementar |
| IP y User-Agent | El navegador contactaría Meta; Meta puede observar IP/UA de la conexión aunque no se envíe PII explícita | El payload candidato ahora exige `user_data.client_user_agent` **solo desde una fuente aprobada y protegida por consentimiento**; todavía NO existe el lector autorizado y, por tanto, el worker no puede liberarse. No incluye `client_ip_address` | **BLOCKED**: validar el origen del User-Agent del dispositivo original, la documentación vigente de Meta para eventos web, la minimización, el consentimiento específico y el aviso. No inventar UA sintético ni usar el UA del proceso servidor para envíos reales. La ausencia de campos CAPI no impide que Meta reciba IP del servidor |
| Cookies/IDs Meta `_fbp`/`_fbc` | No se pasan explícitamente ni se carga el script antes del permiso; su comportamiento real tras carga es NOT_TESTED | No presentes en payload | **BLOCKED**: inspeccionar cookies y solicitudes reales antes/después del permiso en navegador de prueba, sin asumir que no aparecen |
| IDs de usuario PAZO, mascota, publicaciones, QR, cuidados, GPS, PayPal, chats, posts | Ninguno es un parámetro autorizado del evento candidato | Prohibidos por `validMetaServerEvent` y el payload canónico | **PROHIBIDO** agregar estos datos, `external_id`, parámetros dinámicos, coordenadas o `custom_data` sin una nueva revisión explícita |
| Atribución propia, anuncio, campaña, UTM, fuente `ads/organic` | El flujo puede filtrar elegibilidad de servidor | No se añaden al body Meta del contrato actual | Permanecen como datos propios, sujetos a retención y exclusión QA. Nunca inferir que toda cuenta nueva provino de Meta |
| Preferencia Meta por usuario | No se publica como dato de conversión | Registro privado servidor: grant/denial/GPC/retirada | Conservar retiradas lo suficiente para respetarlas; política exacta de retención aún **sin definir**. No borrar opt-out al purgar el outbox de 14 días |
| Access token de CAPI | No disponible en navegador | Solo cabecera `Authorization: Bearer` en servidor | Se requieren propiedad, permisos restringidos, versión Graph soportada, rotación y Test Events autorizados. Valores de secretos no leídos |

### Riesgos que bloquean la salida

1. **Cobertura engañosa de atribución:** la ventana candidata de 15 minutos desde confirmación para ofrecer consentimiento perderá registros legítimos cuyo primer login ocurra después. No presentar cero conversiones Meta como cero registros reales. Conservar funnel ads/orgánico en medición propia.
2. **SDK = tratamiento externo:** la carga de `fbevents.js` es una conexión a Meta. `fbq('consent','revoke')` por sí solo NO hace inocua una carga previa al aviso; el loader actual pospone la carga. Un rechazo o GPC exige **cero solicitudes Meta**, no simplemente cero llamadas a `track`.
3. **GPC durable no equivale a GPC visual:** las rutas grant/receipt rechazan GPC pero pueden no ser invocadas cuando el propio cliente las veta. `metaGpcSync.mjs` prepara una sincronización autenticada independiente y `MetaConsentChoice.tsx` un flujo opt-out GPC. Omitir la invitación sin un grant previo NO produce retirada irreversible; ambas rutas siguen **desconectadas de PAZO**. Faltan sincronización entre dispositivos, inicio de sesión sin mostrar panel, y persistencia ante fallos reales.
4. **CAPI actual no puede recibir GO de campos:** `em` es obligatorio en su contrato, mientras que su procedencia/consentimiento real no está aprobado; además falta confirmar los requisitos actuales de `client_user_agent` para web. No crear un lector de email ni conectarlo a producción antes de resolverlo.
5. **Bajo CCPA/CPRA:** confirmar con asesor competente umbrales/aplicabilidad y si esta comunicación califica como `sharing` para publicidad conductual entre contextos. Si aplica, la elección puntual de registro podría no sustituir controles permanentes tipo `Your Privacy Choices`, señal GPC aceptada y derechos de supresión. No presentar la política general vigente como autorización para Meta.

### Criterios de aceptación, medibles

- **Sin consentimiento / GPC / retiro:** cero solicitudes a `connect.facebook.net`, `graph.facebook.com`, `facebook.com/tr` y otros endpoints Meta, y ningún CAPI lease publicado.
- **Correo confirmado + consentimiento vigente (solo si GO):** un `CompleteRegistration` por registro; `eventID` === `event_id`, envío deduplicado observado en Events Manager y no solo en tests locales.
- **QA/admin:** cero coincidencias Meta; pruebas con toda la base de reglas, no fixture simplificado.
- **Permiso/retirada:** un rechazo no bloquea QR, cuidados ni registro; GPC y retirada se guardan cuando Auth es válida. Error de red no puede mostrarse como retirada confirmada ni permitir nuevo envío.
- **Bilingüe/UX:** copia comprensible sin jerga interna, checkbox desmarcada, salida visible, 390/430px, foco, lector de pantalla, error/reintento y acceso permanente a preferencias; `DESIGN_QA_PASS` solo con evidencia visual real y `PO_VISUAL_ACCEPTED` aparte.
- **Evidencia de proveedor:** Meta Events Manager con dataset propiedad de PAZO, Test Events, depuración y versión API vigentes. No se debe usar el perfil ni datos de propietarios reales sin GO.
- **Rol jurídico:** aprobar texto y fecha efectivos de la política antes de liberar el SDK, documento de tratamiento Meta, contacto, plazo y retirada. Ningún cumplimiento legal queda certificado por este archivo.

## Decisión actual

**NO-GO de tratamiento Meta.** Preparar sin pagar ramas: pruebas sintéticas, contrato mínimo, UI no montada y sincronizador GPC OFF. Continuar la revisión de privacidad y Design OS con evidencia. **No** actualizar `legalCopy.ts`, instalar SQL/Edge alojados, cambiar flags, leer secretos, lanzar solicitudes a Meta ni modificar anuncios. Requiere autorización aparte.

## Endurecimiento del contrato web CAPI — 31-oct-2026

El contrato candidato exige `user_data.client_user_agent` además del identificador de coincidencia `em`, con formato de texto controlado (20–512 caracteres ASCII imprimibles), siempre desde una fuente autorizada y comprobable del dispositivo que originó la acción. Un lector que devuelva solo el correo en hash o un User-Agent ausente/inválido produce `not_configured` y **ninguna solicitud externa**. Las pruebas usan exclusivamente un valor sintético. **No** se ha incorporado un lector real ni se ha autorizado recoger nuevos datos. Esto evita declarar listo un evento web CAPI incompleto; no certifica que el tratamiento sea legal ni la aceptación por Meta.
