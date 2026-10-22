// Immutable prospective Live offer. Content validation is NOT release approval.
// No credentials, network, payment mutation or entitlement logic in this file.
export const PAZO_LIVE_OFFER_VERSION='pazo-supporter-live.beta20261021-v1'
const copy={
 es:{title:'Amigo de PAZO — US$2.99 al mes',
  consentLabel:'Acepto la suscripción de US$2.99 USD al mes, con renovación automática hasta que la cancele, y las condiciones mostradas.',
  paragraphs:[
   'Amigo de PAZO es una suscripción de apoyo voluntario de US$2.99 USD por mensualidad, con renovación automática mensual administrada por PayPal hasta que la canceles. El primer cobro se solicita al aprobar la suscripción en PayPal. No hay prueba gratuita, cuota inicial ni plan anual. PAZO y sus funciones gratuitas siguen disponibles sin suscribirte. PAZO es operado por Alvarado Solutions LLC, California, Estados Unidos. Contacto: appdigital.corp@gmail.com.',
   'Incluye cuatro beneficios: insignia Amigo de PAZO en el perfil de la mascota y junto al autor de sus publicaciones; cinco fondos cosméticos (Clásico PAZO, Naturaleza, Corazones, Cielo estrellado y Aventura); participación opcional de cada mascota en el muro Gracias, Amigos de PAZO, con permiso separado y revocable; y medallas después de completar 3, 6 y 12 períodos mensuales pagados, verificados y no revertidos. La insignia inicial requiere el primer pago verificado. No se ofrece prioridad en rescates ni mayor alcance de publicaciones.',
   'Aprobar en PayPal o regresar a PAZO no activa beneficios. PAZO debe verificar que el cobro regular haya terminado y corresponda a tu cuenta, contrato y período de servicio. El primer período contractual comienza en la activación PayPal verificada y termina justo antes de la próxima fecha de facturación observada por PAZO al activarse la suscripción. Esa fecha es el límite contractual acordado, no una prueba de pago por sí sola. No se añade automáticamente un mes desde el momento del cobro. Si la confirmación llega tarde o falta evidencia suficiente, el ciclo queda en revisión.',
   'Cada renovación requiere un nuevo cobro regular completado y un intervalo observado verificable. Los pagos pendientes o fallidos no extienden beneficios. Un reembolso completo o reverso afecta únicamente al período correspondiente; un reembolso parcial o una situación ambigua requiere revisión. Las disputas se concilian con la venta original. No se crean meses adicionales por recuperar deudas ni por regresar del checkout.',
   'Puedes detener los próximos cobros en PAZO, Mi cuenta → Amigo de PAZO → Administrar mi suscripción → Cancelar renovación. La cancelación se confirma cuando PayPal la verifica. También puedes administrar el pago automático desde tu cuenta PayPal. Un período ya pagado, verificado y no revertido conserva sus beneficios hasta su vencimiento. Cancelar no implica un reembolso automático. El permiso del muro se puede retirar por separado en cualquier momento.',
   'La casilla de aceptación comienza desmarcada. PAZO conserva la versión, el texto, el idioma y la fecha de tu aceptación, y permite descargar la constancia desde Administrar mi suscripción. Solo se guarda la evidencia mínima necesaria para el contrato, la conciliación, las reclamaciones y las obligaciones aplicables; los registros financieros no se borran automáticamente al solicitar la baja de la cuenta. Consulta Privacidad en PAZO y escribe a appdigital.corp@gmail.com para asistencia, cancelación o solicitudes sobre tus datos.',
  ]},
 en:{title:'Friend of PAZO — US$2.99 per month',
  consentLabel:'I accept the US$2.99 USD per month subscription, automatically renewing until I cancel, and the terms shown.',
  paragraphs:[
   'Friend of PAZO is an optional support subscription costing US$2.99 USD per monthly payment, automatically renewed monthly through PayPal until you cancel. The first payment is requested when you approve the subscription in PayPal. There is no free trial, setup fee or annual plan. PAZO and its free features remain available without subscribing. PAZO is operated by Alvarado Solutions LLC, California, United States. Contact: appdigital.corp@gmail.com.',
   'It includes four benefits: the Friend of PAZO badge on the pet profile and beside its post author; five cosmetic backgrounds (Classic PAZO, Nature, Hearts, Starry Sky and Adventure); optional inclusion of each pet in the Thank You, PAZO Friends wall with separate, revocable permission; and medals after 3, 6 and 12 fully elapsed, verified paid monthly periods that have not been reversed. The initial badge requires the first verified payment. Rescue priority and increased post reach are not offered.',
   'PayPal approval or returning to PAZO does not activate benefits. PAZO must verify that the regular payment is complete and belongs to your account, contract and service period. The first contractual period starts at the verified PayPal activation time and ends immediately before the next billing date observed by PAZO at activation. That date is the agreed contractual boundary, not proof of payment on its own. PAZO does not automatically add a month from the payment time. A late confirmation or insufficient evidence leaves that cycle under review.',
   'Each renewal requires a new completed regular payment and a verifiable observed interval. Pending or failed payments do not extend benefits. A full refund or reversal affects only its corresponding period; a partial refund or ambiguous situation requires review. Disputes are reconciled against the original sale. Recovering an outstanding balance or returning from checkout does not create additional months.',
   'You can stop future charges in PAZO, My account → Friend of PAZO → Manage my subscription → Cancel renewal. Cancellation is confirmed when PayPal verifies it. You can also manage the automatic payment in your PayPal account. An already paid, verified period that has not been reversed keeps its benefits until expiry. Cancellation does not automatically issue a refund. Wall permission can be withdrawn separately at any time.',
   'The acceptance checkbox starts unchecked. PAZO retains the version, text, language and time of your acceptance, and lets you download the acknowledgement from Manage my subscription. Only the minimum evidence needed for the contract, reconciliation, claims and applicable obligations is retained; financial records are not automatically erased when account deletion is requested. See Privacy in PAZO and contact appdigital.corp@gmail.com for assistance, cancellation or requests about your data.',
  ]},
}
const digests={es:'b3b6614d95ea6bb600fe9479ac4be115d39769f1e38a4fc30b7cb4273573dbb1',en:'eb7f13dc7bb212a83223af0f260d77c5ac66ee993d5e090a3d7e6e7e886484b9'}
const offers=Object.freeze(Object.fromEntries(Object.entries(copy).map(([locale,c])=>[locale,Object.freeze({
 version:PAZO_LIVE_OFFER_VERSION,locale,title:c.title,consentLabel:c.consentLabel,
 exactCopy:c.paragraphs.join('\n\n'),termsDigest:digests[locale],priceMinor:299,currency:'USD',cadence:'MONTH_1',
})])))
export function getPazoLiveOffer(locale){return Object.hasOwn(offers,locale)?offers[locale]:null}
export function verifyPazoLiveOfferConsent(consent){
 const offer=getPazoLiveOffer(consent?.locale)
 return offer!==null&&consent?.affirmativeConsent===true&&consent.termsVersion===offer.version&&consent.termsDigest===offer.termsDigest
}
export function readPazoLiveAcceptedOffer({termsVersion,termsDigest,locale}={}){
 const offer=getPazoLiveOffer(locale)
 return offer!==null&&offer.version===termsVersion&&offer.termsDigest===termsDigest?offer:null
}
