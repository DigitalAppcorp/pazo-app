// F16 — Sandbox ONLY: NEW four-benefit offer for a new disposable QA buyer.
// This draft is NOT the historical P06 offer. Never retroactively attach perks
// to an acceptance with terms that explicitly excluded all benefits.
// Not published or selectable by the payment backend until approved as a new
// immutable offer/version, inside an isolated Sandbox/QA store.
export const F16_SANDBOX_BENEFITS_OFFER_V2=Object.freeze({
  version:'pazo-supporter-sandbox.benefits-v2',
  environment:'sandbox',
  priceMinor:299,
  currency:'USD',
  cadence:'MONTH_1',
  planId:'P-14V25407JP6850922NLHMDKI',
  benefits:Object.freeze(['badge','five-themes','opt-in-wall','elapsed-paid-cycle-medals']),
  state:'UNPUBLISHED_PO_REVIEW_REQUIRED',
  mayPublish:false,mayCreateCheckout:false,mayGrantBenefits:false,
})
const es=[
  'PRUEBA CONTROLADA — PAYPAL SANDBOX. NO SE UTILIZA DINERO REAL. Esta oferta es únicamente para una cuenta y mascota descartables de PAZO. No es la oferta pública definitiva.',
  'Amigo de PAZO es una suscripción de apoyo voluntario de US$2.99 al mes, USD, con renovación automática mensual administrada por PayPal Sandbox hasta que se cancele. Sin prueba gratuita, cuota inicial ni plan anual. PAZO y todas sus funciones gratuitas siguen disponibles sin suscribirse.',
  'Esta prueba incluye exactamente cuatro beneficios de Amigo de PAZO, habilitados SOLO si PAZO verifica un cobro mensual regular completado y la identidad del propietario: (1) insignia Amigo de PAZO en el perfil de la mascota y junto al autor en publicaciones del Feed; (2) elección y guardado de cinco fondos cosméticos para la mascota: Clásico PAZO, Naturaleza, Corazones, Cielo estrellado y Aventura; (3) participación opcional de cada mascota en el muro público Gracias, Amigos de PAZO, solamente si su propietario concede consentimiento separado, que puede retirar en cualquier momento; (4) insignias de evolución al completar 3, 6 y 12 períodos mensuales pagados, verificados y no revertidos. No hay prioridad en rescates ni otras funciones exclusivas.',
  'Aprobar en PayPal Sandbox o volver a PAZO NO significa que haya un período pagado. La activación exige prueba independiente del vendedor y del cargo, términos aceptados y un intervalo de servicio contractual verificable. Si falta prueba, hay pago pendiente, fallido, reembolso o disputa, los beneficios no se activan. Los hitos de 3/6/12 se ensayan aparte con períodos sintéticos: no se inventan pagos PayPal.',
  'Puedes cancelar las próximas renovaciones desde Gestionar Amigo de PAZO; la cancelación solo se confirma después de la respuesta verificable del proveedor. Un período previamente pagado y no revertido conserva sus beneficios hasta su vencimiento verificado. El permiso para aparecer en el muro se puede revocar por separado incluso tras cancelar o expirar.',
  'Antes de enviar la solicitud de prueba debes marcar voluntariamente una casilla de aceptación inicialmente desmarcada. PAZO conservará una constancia descargable de la versión y texto exacto aceptado. La prueba puede permanecer bloqueada si todavía se necesitan permisos o evidencias de pago. Para asistencia: appdigital.corp@gmail.com.',
].join('\n\n')
const en=[
  'CONTROLLED TEST — PAYPAL SANDBOX. NO REAL MONEY. This offer is only for an expressly authorized, disposable PAZO user and pet. It is not a public real-money offer.',
  'Friend of PAZO is an optional US$2.99 per month recurring support subscription (USD), automatically renewed monthly through PayPal Sandbox until cancelled. No free trial, setup fee or annual plan. PAZO and all its ordinary free features remain available without subscribing.',
  'This test includes exactly four Friend of PAZO benefits, enabled ONLY after PAZO independently confirms a completed regular monthly payment and the authenticated owner: (1) Friend of PAZO badge on a pet profile and Feed post author; (2) selection and saving of five pet profile themes, Classic PAZO, Nature, Hearts, Starry Sky and Adventure; (3) optional inclusion of each pet in the public Thank You, PAZO Friends wall only after separate, individually revocable owner consent; (4) evolution medals after 3, 6 and 12 entirely elapsed, verified paid and non-reversed monthly periods. No rescue priority or other exclusive features.',
  'PayPal Sandbox approval or redirect does NOT prove a paid service period. Benefits require independent merchant verification of the completed charge, verified original terms and a real contractual service interval. Pending or failed payments, refunds, disputes or missing evidence cannot activate benefits. Three-, six- and twelve-month milestones are tested separately using synthetic elapsed cycles, never forged PayPal charges.',
  'Manage Friend of PAZO lets you request cancellation of future renewals; it is confirmed only when the provider confirms. An already paid and non-reversed service period retains its benefits until verified expiry. Public wall consent can be withdrawn separately, even after cancellation or expiry.',
  'Before requesting the test subscription you must voluntarily tick a checkbox that starts unchecked. PAZO keeps a downloadable copy of the exact accepted terms and version. The test may remain blocked when needed proof or authorization is missing. For assistance: appdigital.corp@gmail.com.',
].join('\n\n')
export const F16_SANDBOX_BENEFITS_V2_COPY=Object.freeze({
  es:Object.freeze({locale:'es',exactCopy:es,
    title:'Amigo de PAZO — prueba Sandbox con cuatro beneficios',
    consentLabel:'Acepto la prueba PayPal Sandbox por US$2.99 mensuales con renovación automática y los cuatro beneficios descritos, sin dinero real.'}),
  en:Object.freeze({locale:'en',exactCopy:en,
    title:'Friend of PAZO — four-benefit Sandbox test',
    consentLabel:'I accept the US$2.99/month automatically renewing PayPal Sandbox test with the four stated benefits and no real money.'}),
})
export function isF16SandboxBenefitsV2PublishedOffer(offer,locale) {
  return Boolean(offer && typeof offer==='object' && !Array.isArray(offer)
    && offer.version===F16_SANDBOX_BENEFITS_OFFER_V2.version
    && offer.locale===locale
    && offer.priceMinor===299 && offer.currency==='USD'
    && offer.cadence==='MONTH_1'
    && typeof offer.termsDigest==='string' && /^[a-f0-9]{64}$/.test(offer.termsDigest)
    && offer.exactCopy===F16_SANDBOX_BENEFITS_V2_COPY[locale]?.exactCopy)
}
