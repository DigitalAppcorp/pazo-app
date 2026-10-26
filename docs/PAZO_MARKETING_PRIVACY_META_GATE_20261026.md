# Privacidad, retención y transición Meta — propuesta sin activar

26-oct-2026. PENDING PO. No consentimiento o aprobación legal inferidos.
La política pública ES/EN de `src/features/legal/legalCopy.ts` no incorpora todavía
este tratamiento. No se modificó ni publicó una promesa de recopilación activa.

## Plazo propuesto y operaciones

Propuesta: **14 días** para atribuciones desde recorded_at y agregados por fecha
de Los Ángeles, purga cada6h. Cubre la campaña de tres días, confirmación hasta72h,
activación primera mascota≤7d y observación D7 con margen de revisión. No configura
14 ni30: el valor sigue0 hasta decisión explícita. Un reporte de30/90 días mostrará
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
cuentas. No enviamos conversiones individuales a Meta. La propuesta es conservar
estos datos vivos durante14 días y retirarlos en una revisión cada6 horas; el plazo
y el ciclo de respaldos se fijarán antes de activar. Para proteger las señales de
llegada podemos utilizar Cloudflare Turnstile, que procesa información técnica.
Puedes pedir acceso, corrección o eliminación al contacto de privacidad de PAZO.”

EN: “If you arrive from a PAZO ad, we may associate limited campaign codes with
your account to measure email-confirmed registration, your first pet and a day-seven
navigation signal. Your device temporarily stores these codes and an account
identifier to prevent attribution across accounts. We do not send individual
conversions to Meta. The proposal is to retain this live data for14 days, with
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
