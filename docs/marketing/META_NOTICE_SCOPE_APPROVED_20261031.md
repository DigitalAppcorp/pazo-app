# PAZO — Aviso Meta Pixel/CAPI ES/EN, alcance aprobado por producto
**31 de octubre de 2026 · BORRADOR PARA REVISIÓN · NO PUBLICADO · PIXEL/CAPI OFF**

## Estado de autorizaciones
- **PO_SCOPE_APPROVED (2026-10-31):** El Product Owner autoriza preparar la finalidad y los textos para informar a Meta de un **registro nuevo confirmado**, junto con UUIDv4 de deduplicación, hash SHA-256 del email y User-Agent original del navegador. Entiende que Meta Pixel puede recibir IP y datos de conexión. No autoriza por este acto desplegar, enviar datos reales, aceptar términos de un proveedor en su nombre ni activar campañas.
- **CONSENT_TEXT_DRAFT_ONLY:** Este documento y `MetaConsentChoice.tsx` son propuestas. Nadie ha aceptado todavía esta versión en la app. `pazo-meta-conversions-v1` es el identificador técnico del borrador; aún no se ha publicado ninguna versión.
- **LEGAL/PROVIDER/DESIGN/SECURITY GO: PENDING.** No equiparar la aprobación de alcance del PO con una revisión jurídica ni con un consentimiento individual.
- **PRODUCTION=OFF.** `src/features/legal/legalCopy.ts` mantiene la afirmación pública vigente de que no se envían conversiones individuales a Meta. Debe sustituirse/precisarse al publicar este aviso, nunca antes de una implantación preparada.

## Aviso contextual de consentimiento (componente candidato)
### ES
**Título:** Tú decides qué compartir

**Descripción:** Si aceptas, PAZO informará a Meta que confirmaste tu registro para medir anuncios. Podrá enviar un identificador aleatorio del evento, una versión SHA-256 de tu correo (sigue siendo dato personal) y datos técnicos de tu navegador (User-Agent). Al cargar Meta Pixel, Meta también podría recibir tu dirección IP y otros datos técnicos de conexión.

**Casilla desmarcada:** Sí, permito medir mi registro con Meta.

**Botones:** Continuar sin permitirlo / Permitir medición

**Información:** Es opcional. PAZO funciona igual sin este permiso. Puedes retirarlo para detener envíos futuros.

**Acceso:** Cómo se usarían mis datos

### EN
**Title:** You decide what to share

**Description:** If you agree, PAZO will tell Meta you confirmed your registration to measure ads. It may send a random event identifier, a SHA-256 hash of your email (still personal data), and technical information about your browser (User-Agent). When Meta Pixel loads, Meta may also receive your IP address and other technical connection data.

**Unchecked checkbox:** Yes, I allow Meta to measure my registration.

**Actions:** Continue without allowing / Allow measurement

**Note:** Optional. PAZO works the same without permission. You can withdraw it to stop future transfers.

**Access:** How my data may be used

## Adenda propuesta a la política de privacidad — NO PUBLICAR AÚN

### Español · Medición opcional de registros con Meta
PAZO, operado por Alvarado Solutions LLC, propone usar Meta Pixel y Conversions API únicamente para medir registros nuevos confirmados originados en campañas publicitarias compatibles. La medición externa de Meta es independiente de la analítica propia de PAZO.

Si aceptas expresamente esta finalidad en una casilla inicialmente desmarcada y no existe una señal de exclusión aplicable, podremos compartir con Meta un evento `CompleteRegistration`, un identificador aleatorio para evitar duplicados, una representación SHA-256 de tu correo electrónico y el User-Agent real de tu navegador. **El hash del correo no es anónimo.** La carga de Meta Pixel establece comunicación directa entre tu navegador y Meta; Meta puede recibir tu IP, datos técnicos de conexión y potencialmente información propia de su tecnología (por ejemplo, cookies, URL o referencia), cuyo comportamiento efectivo se verificará antes del lanzamiento.

No adjuntaremos voluntariamente al evento Meta el nombre de la persona, identificadores de cuenta o de mascota, publicaciones, contenidos de cuidados, documentos privados, ubicación GPS precisa, detalles de pago ni códigos UTM. No se recopilarán estos datos con esta finalidad. El alcance de los datos técnicos que Meta obtenga automáticamente deberá comprobarse antes de habilitar Pixel.

Esta elección es opcional y rechazarla no impide el registro ni el uso del pasaporte QR, Agenda u otras herramientas. Puedes retirar tu permiso para **futuros envíos**; la retirada no puede deshacer automáticamente transmisiones previas a Meta. Si tu navegador transmite una señal Global Privacy Control (GPC) u otra exclusión aplicable, no se activará esta finalidad y se intentará persistir la retirada en la cuenta cuando exista una sesión autenticada. Debe existir también un método de exclusión accesible sin cuenta cuando lo exija la normativa aplicable.

Meta puede procesar estos datos conforme a sus propias condiciones y políticas, y ese tratamiento puede ir más allá de los informes internos de PAZO; el papel de Meta, la posible optimización/segmentación de anuncios y las obligaciones de los participantes requieren confirmación contractual. Los plazos de conservación específicos de preferencia Meta, evento pendiente, registros de envío y derechos de los usuarios aún requieren definición, publicación y controles comprobados. Solicitudes de privacidad: **appdigital.corp@gmail.com**.

### English · Optional Meta registration measurement
PAZO, operated by Alvarado Solutions LLC, proposes to use Meta Pixel and Conversions API only to measure newly confirmed registrations attributed to eligible advertising campaigns. This third-party Meta measurement is separate from PAZO's first-party analytics.

If you expressly opt in using a checkbox that is initially unchecked, and there is no applicable opt-out signal, PAZO may share with Meta a `CompleteRegistration` event, a random deduplication identifier, a SHA-256 hash of your email address and the authentic User-Agent of your browser. **A hashed email is not anonymous.** Loading Meta Pixel connects your browser directly to Meta; Meta may receive your IP address, technical connection data and potentially information generated by its technology (for example, cookies, page URL or referrer). Actual SDK behavior must be audited before launch.

We will not intentionally add your name, PAZO account or pet identifiers, posts, care records, private documents, precise GPS location, payment information or UTM campaign codes to the Meta event. Those data categories are outside the approved purpose. What Meta's browser SDK captures automatically must be independently verified before enabling it.

Opt-in is optional. Declining does not restrict registration, QR passport, Care or other PAZO tools. You may withdraw permission to prevent **future transfers**; withdrawal cannot automatically undo past disclosures to Meta. If the browser sends Global Privacy Control (GPC) or another applicable opt-out signal, PAZO will not enable this purpose and will attempt to persist account withdrawal once there is an authenticated session. A no-account opt-out must also be available when required by applicable law.

Meta may process the disclosed information under its own terms and policies, potentially beyond PAZO's internal reports; its contractual role and possible ad optimization/audience uses still require review. The Meta-specific retention periods for consent preference, queued events and delivery records, plus rights-handling, must be set, disclosed and tested before release. Privacy contact: **appdigital.corp@gmail.com**.

## Lista obligatoria antes de liberar
1. **Conformidad jurídica y alcance:** verificar aplicabilidad del CCPA/CPRA y otros territorios, condiciones del Meta Business Tools, relación contractual, uso secundario de datos, derechos y aviso al recopilar. El consentimiento de producto no sustituye requisitos legales.
2. **SDK en laboratorio externo autorizado:** comprobar solicitudes, cookies, URL, referrer, fbc/fbp y cualquier campo transmitido automáticamente; si rebasa el alcance, corregir o no activar Pixel.
3. **Origen auténtico y limitado de los campos:** validar normalización + SHA-256 del correo del usuario confirmado solo bajo finalidad vigente; User-Agent del navegador que originó la acción, no el del worker; revisar si se conservarían y por cuánto. En el PR actual no hay lector autorizado: `readApprovedMatchField:null` es intencional.
4. **Revocación y exclusión permanente:** interfaz de privacidad permanente, alternativa sin iniciar sesión si corresponde, reconocimiento de GPC en el primer contacto y persistencia si se conoce la cuenta; no reactivar en otro dispositivo después de una retirada.
5. **Retención exacta:** fijar ventanas de preferencia, veto/retirada, outbox y registros/auditoría. No borrar la única evidencia de exclusión tras purgar eventos de 14 días ni inventar un plazo.
6. **Publicación coordinada:** actualizar `legalCopy.ts` ES/EN y fecha real de publicación, vincular el detalle desde consentimiento, prueba de lectura y navegación, revisión visual y accesibilidad. No registrar consentimiento basado en un aviso todavía no vigente.
7. **Control técnico:** migraciones con permisos/RLS revisados, endpoints Auth seguros, envíos apagados ante fallos, QA/admin excluidos, pruebas reales con Meta en un entorno segregado y deduplicación Pixel + CAPI confirmada por proveedor antes de GO.
8. **Aprobación de activación independiente:** obtener GO del Product Owner para publicar y activar. Ni este documento ni la aceptación del alcance permiten cambiar flags ni desplegar Meta.

## Referencias normativas públicas verificadas
- California DOJ: https://oag.ca.gov/privacy/ccpa/gpc
- California CPPA FAQ: https://cppa.ca.gov/faq
- California CPPA sobre patrones oscuros: https://cppa.ca.gov/announcements/2024/20240904.html
- Regulación CCPA actualizada (enero de 2026): https://cppa.ca.gov/regulations/ccpa_updates
