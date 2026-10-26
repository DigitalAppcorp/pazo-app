# Privacidad, retención y transición Meta — período aprobado; recopilación OFF

## Decisión del Product Owner — 26-oct-2026 (posterior a instalación OFF)

**APROBADO: 14 días de retención en las tablas activas de atribución y señales agregadas, únicamente cuando la recopilación sea autorizada posteriormente.** El PO aprobó además **preparar** Cloudflare Turnstile y el mecanismo de borrado programado. Esto NO aprueba recopilar, enviar datos a Meta, registrar cuentas de prueba alojadas, crear claves/proveedores a su nombre, instalar un nuevo Cron en producción, fusionar cambios ni publicar anuncios. La protección de privacidad y sus comunicaciones deben ser verificables antes del GO de activación.

**Estado verificado tras este GO:** `collection_gate.enabled=false`, `retention_days=0`, `policy_version=NULL`. La aprobación de plazo por sí sola NO establece que la política pública esté vigente. No interpretar el cero actual como aprobación revocada ni activar el gate para "arreglar" el dashboard.

**Preparación operacional aprobada, aún sin ejecutar en producción:**
1. Auditar primero las ventanas reales de backup/PITR, logs y restauración de Supabase y Vercel, los posibles registros técnicos de Turnstile y el canal de solicitudes de privacidad. La purga de tablas activas no equivale a la eliminación instantánea de copias.
2. Preparar la publicación del aviso específico de marketing en ES/EN con el período **14 días en almacenamiento activo** y hasta **6 horas entre ciclos de purga**, los datos mínimos de UTM y el almacenamiento local temporal de hasta72 h. Mantener la redacción condicional hasta que tratamiento/proveedor/fecha efectiva estén revisados y publicados. Validar política efectiva con revisión legal según corresponda; una decisión operativa no certifica cumplimiento jurídico.
3. Preparar Turnstile **Invisible** para `pazo-app.vercel.app` y `pazo_marketing_landing`, sin pre-clearance. Validar Siteverify real (hostname, acción, límite 300 s, un solo uso, fallo cerrado); no añadir Site Key/Secret a GitHub ni al chat. Secret exclusivamente en Edge y Site Key pública únicamente tras habilitación aprobada. Revisar cuota/abuso, CSP, proveedor y privacidad. Si no hay claves de proveedor, indicar el paso mínimo que requiere acción manual del PO.
4. Preparar el SQL de operador existente `supabase/operations/marketing-retention-cron-activation.sql`: **solo** configurar el plazo=14 y `policy_version=pazo-marketing-attribution-notice-v1` una vez aprobado/publicado el aviso y con `enabled=false`; instalación Cron es un gate independiente. Cron previsto: `17 */6 * * *` UTC; `SELECT public.pazo_marketing_prune_all_v1();`. Observar 2 ejecuciones automáticas reales exitosas separadas, estado de job y heartbeat vigente ≤7 horas **antes** de abrir ingestión. Comprobar solicitud de borrado y restore sin datos personales públicos.
5. Probar recorrido real de registro confirmado y primera mascota en entorno aislado o cuenta QA expresamente autorizada, preservando su exclusión de estadísticas. Distinguir pruebas negativas QA de atribuciones positivas de usuarios reales; no inventar conversiones.
6. Solicitar separadamente el GO de publicar aviso/activar proveedor y Cron, el GO de recopilación y el GO de gastar publicidad. Mantener Meta Pixel/CAPI fuera de este piloto de Tráfico.

**Límite exacto del plazo:** la atribución `marketing_private.acquisition` caduca por `recorded_at`; los contadores `landing_daily` se depuran por fecha de Los Ángeles, no por un timestamp individual. El plazo elegido es 14 días **más demora operativa de hasta un ciclo (6h) en condiciones normales** y no cubre automáticamente cachés, auditoría técnica ni PITR. Prometer únicamente lo que el mecanismo y los proveedores pueden cumplir.

---


26-oct-2026. Período de 14 días aprobado por el PO; aviso y proveedores pendientes. No consentimiento ni aprobación legal inferidos.
La política pública ES/EN de `src/features/legal/legalCopy.ts` no incorpora todavía
este tratamiento. No se modificó ni publicó una promesa de recopilación activa.

## Plazo propuesto y operaciones

Plazo aprobado para futura activación: **14 días** para atribuciones desde recorded_at y agregados por fecha
de Los Ángeles, purga cada6h. Cubre la campaña de tres días, confirmación hasta72h,
activación primera mascota≤7d y observación D7 con margen de revisión. El valor alojado sigue 0 y la recopilación OFF hasta que se apruebe y publique el aviso correspondiente. Un reporte de30/90 días mostrará
solo el historial retenido; no reconstruirá lo borrado ni presentará cobertura completa.
Staging local≤72h, incluye UUID de cuenta solo para impedir atribución cruzada;
sin nombre, email, contenido, ubicación, fbclid o token persistido. Logout limpia staging.

Plazo máximo operativo vivo = plazo aprobado + intervalo de ejecución (6h), sujeto
a incidentes declarados. No prometer 14d exactos de eliminación instantánea. Un
fallo o última ejecución>7h bloquea ingestión; conservar la eliminación cuando se
apague recopilación. Comprobar dos runs periódicos reales antes de declarar salud.

Acceso: reporte solo admin con agregados; operador privado autorizado atiende
solicitud verificada por el contacto actual de privacidad, sin exponer UUID en Git.
Acceso/corrección/eliminación se documentan en ticket privado mínimo. Eliminar
atribución a petición sin borrar cuenta/pagos; borrado Auth confirmado elimina el
vínculo por CASCADE. Evitar restauración o reingesta de una atribución retirada.
Los agregados anónimos no contienen vínculo que permita extraer una “visita de
una persona”; explicar esa limitación al atender la solicitud.

Backups/PITR/logs: antes del GO obtener evidencia del plan real Supabase/Vercel,
ventana efectiva, acceso, eliminación y posibles copias de operadores. No asumir
que su retención coincide con la tabla viva ni que un backup fue eliminado. Los
respaldos financieros existentes no se recrean ni modifican con este trabajo.
Restaurar siempre con colección OFF; aplicar purga y solicitudes de supresión
pendientes antes de reabrir, verificar ACL/Cron y volver a certificar. El registro
privado de solicitudes necesario para esa restitución requiere alcance/plazo
aprobados; no almacenar por defecto un nuevo ledger perpetuo de identificadores.
No reabrir mientras esa garantía o el ciclo de backups no estén resueltos.

## Aviso propuesto ES / EN, no publicado

ES: “Si llegas desde un anuncio de PAZO, podemos asociar a tu cuenta códigos
limitados de campaña para medir el registro con correo confirmado, la primera
mascota y una señal de navegación en el séptimo día. El dispositivo conserva
temporalmente esos códigos y un identificador de cuenta para evitar confundir
cuentas. No enviamos conversiones individuales a Meta. La duración aprobada para la futura recopilación es conservar
estos datos vivos durante14 días y retirarlos en una revisión cada6 horas; el plazo
y el ciclo de respaldos se fijarán antes de activar. Para proteger las señales de
llegada podemos utilizar Cloudflare Turnstile, que procesa información técnica.
Puedes pedir acceso, corrección o eliminación al contacto de privacidad de PAZO.”

EN: “If you arrive from a PAZO ad, we may associate limited campaign codes with
your account to measure email-confirmed registration, your first pet and a day-seven
navigation signal. Your device temporarily stores these codes and an account
identifier to prevent attribution across accounts. We do not send individual
conversions to Meta. The approved future retention window is14 days, with
cleanup every6 hours; the retention period and backup handling will be finalized
before collection starts. Cloudflare Turnstile may process technical information
to protect arrival signals. You may request access, correction or deletion through
PAZO's privacy contact.”

Antes de publicar quitar lenguaje de propuesta solo tras aprobar y verificar los
valores, contacto y mecanismos descritos. La decisión anterior de atribución
interna automática sin casilla no equivale a aprobar proveedores o usos publicitarios.

## California y proveedores

CalOPPA exige transparencia de prácticas para servicios comerciales que recogen
información identificable de residentes; revisar categorías, terceros, cambios,
contacto y respuesta a señales de navegador. CCPA/CPRA requiere evaluar aplicabilidad
económica y actividades del operador; la ubicación en California por sí sola no
prueba que se alcancen sus umbrales. Si aplica: aviso al recopilar, acceso,
corrección, eliminación y exclusión de venta/compartición/GPC según el uso. No
declarar cumplimiento completo ni que aceptar Terms autoriza compartir con Meta.
Fuentes consultadas: [California AG, CCPA](https://oag.ca.gov/privacy/ccpa) y
[guía CalOPPA](https://oag.ca.gov/sites/all/files/agweb/pdfs/cybersecurity/making_your_privacy_practices_public.pdf).

Turnstile requiere validación de servidor, tokens de un uso y vencimiento5min;
la implementación también exige hostname/acción/frescura, timeout y falla cerrada.
No enviar remoteip a Siteverify no impide que Cloudflare procese metadatos de red.
Revisar contrato, finalidad/retención del proveedor, cuotas y acceso antes de
configurarlo. Fuentes: [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
y [política Turnstile](https://www.cloudflare.com/turnstile-privacy-policy/).
No se configuraron claves ni se contactó Siteverify con un token real.

## Transición futura a clientes potenciales

Pixel/CAPI no se incorporaron como dependencia del piloto de Tráfico.
PageView correspondería a carga consentida; CompleteRegistration solo después de
confirmación Auth del servidor, no submit ni pantalla de éxito. Primera mascota
sería evento separado, una vez por cuenta, sin nombre/ID de mascota ni contenido.
CAPI solo si mejora cobertura y hay fundamento aprobado para transmitir datos a
Meta; hash de email/UUID sigue siendo dato vinculable, no anonimización.

Con doble transporte: mismo event_name y eventID Pixel/event_id CAPI estable por
evento, reintentos con el mismo ID, ventanas/versiones vigentes verificadas antes
de implementar. Owner debe aportar acceso a Business/Ads/Events Manager, dataset
o Pixel ID, dominio y permisos correspondientes, y token de sistema de mínimo
alcance solo servidor si CAPI se aprueba; nunca claves por chat/Git/cliente.
Test Events y datos sintéticos en entorno aislado primero. Registrar exclusión,
consentimiento específico, GPC cuando corresponda, revocación y límites de
retención antes de todo transporte real. No enviar datos financieros ni adjuntar
fbclid/fbp/fbc por comodidad.

Las páginas oficiales de Meta consultadas el26/oct devolvieron login/bloqueo o429:
[Tráfico](https://www.facebook.com/business/ads/ad-objectives/traffic),
[deduplicación](https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events).
Por eso esta es una evaluación de arquitectura, no una certificación de API o de
las opciones disponibles en la cuenta del PO. Revisar la disponibilidad de
“Landing page views” al preparar el borrador en Ads Manager. No cambiar el objetivo
ni instalar Pixel por inferencia, y no usar fuentes secundarias como contrato API.

Presupuesto45USD/3d, Los Ángeles, inglés, imagen/carrusel/video son propuesta del
PO. No se creó campaña, borrador, conexión Meta o gasto. Publicar sigue requiriendo
GO de presupuesto y medición alojada verificable.
