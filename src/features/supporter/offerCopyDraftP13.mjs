// PAZO F16-P13 — bilingual subscription disclosure REVIEW DRAFT.
// NOT a P06 published offer, NOT terms the buyer can accept. No runtime write.
// Draft copy must be replaced with legally approved immutable text before
// using any P06 offer RPC or presenting the PayPal checkout.
const common=Object.freeze({
 version:'pazo-supporter-p13.draft-v1',
 product:'PAZO_OPTIONAL_SUPPORTER',
 planId:'P-14V25407JP6850922NLHMDKI',
 priceMinor:299,
 currency:'USD',
 cadence:'MONTH_1',
 trial:false,
 annualPlan:false,
 status:'REVIEW_ONLY_NOT_PUBLISHED',
 publishedAt:null,
 mayPublish:false,
 mayShowAsPurchaseOffer:false,
 mayStartPayPalCheckout:false,
 mayGrantBenefits:false,
})
const es=Object.freeze({
 locale:'es',
 heading:'Amigo de PAZO — aporte voluntario de US$2.99/mes',
 consentLabel:'Acepto expresamente la renovación automática mensual de Amigo de PAZO por US$2.99 y las condiciones que se me han mostrado.',
 exactCopy:[
  'Amigo de PAZO es una suscripción de apoyo totalmente voluntaria. Cuesta US$2.99 por mes y se renovará automáticamente cada mes; PayPal gestionará los cobros recurrentes hasta que canceles. No hay prueba gratuita ni plan anual en esta oferta.',
  'PAZO continúa siendo gratuita para todas las personas: publicar, interactuar, acceder a comunidades, lugares y herramientas de ayuda o rescate no requiere esta suscripción.',
  'Las recompensas aprobadas como concepto de producto son una insignia Amigo de PAZO en el perfil social de la mascota y en el avatar del autor de publicaciones; estilos cosméticos de perfil; participación voluntaria y separadamente autorizada por cada mascota en el muro Gracias, Amigos de PAZO; y reconocimientos por 3, 6 y 12 períodos mensuales pagados y verificados. Estas recompensas todavía no están completamente implementadas ni disponibles para contratar. No se garantiza prioridad en rescates, mayor alcance ni ausencia de publicidad.',
  'Antes de habilitar una compra, PAZO mostrará la fecha prevista de cobro y los detalles del período de renovación, el precio total aplicable y el acceso directo a la cancelación. Esos mecanismos aún no están habilitados: [ENLACE_DE_CANCELACION_PENDIENTE] y [CONFIRMACION_CONSERVABLE_PENDIENTE]. Esta versión es exclusivamente un borrador y no constituye una oferta contratable.',
  'La cancelación detiene renovaciones futuras. Los períodos ya pagados y comprobados se tratan conforme a la fecha contractual verificada; una cancelación no significa automáticamente reembolso ni pérdida inmediata de un período acreditado. Un pago pendiente o fallido no activa beneficios. Los reembolsos parciales y las disputas requieren una revisión específica.',
  'Antes de cualquier cobro deberás marcar por ti mismo una casilla de aceptación que empieza desmarcada, y recibir una confirmación que puedas conservar con las condiciones y las instrucciones de cancelación. Contacto para ayuda: appdigital.corp@gmail.com.',
 ].join('\n\n'),
})
const en=Object.freeze({
 locale:'en',
 heading:'Friend of PAZO — voluntary support for US$2.99/month',
 consentLabel:'I expressly agree to the automatically renewing monthly Friend of PAZO subscription at US$2.99 and the terms presented to me.',
 exactCopy:[
  'Friend of PAZO is an entirely optional support subscription. It costs US$2.99 per month and automatically renews monthly; PayPal will handle recurring charges until you cancel. There is no free trial or annual plan in this offer.',
  'PAZO remains free for everyone: posting, interacting, accessing communities and places, and using safety or rescue tools do not require a subscription.',
  'The four product-approved rewards are a Friend of PAZO badge on the pet social profile and post-author avatar; cosmetic profile themes; optional participation by each separately authorized pet in the Thank You, PAZO Friends wall; and commemorative recognition after 3, 6 and 12 verified, paid monthly periods. These rewards are not yet fully implemented and cannot currently be purchased. This does not promise rescue priority, additional reach or an ad-free experience.',
  'Before enabling any purchase, PAZO will show the expected charge date and renewal period details, the applicable total price and a direct cancellation method. Those mechanisms are not yet enabled: [CANCELLATION_LINK_PENDING] and [RETAINABLE_ACKNOWLEDGEMENT_PENDING]. This version is a review draft only, not an offer available for purchase.',
  'Cancellation stops future renewals. Previously paid and verified periods follow their confirmed contractual service end; cancellation does not automatically mean a refund or immediate loss of a credited period. Pending or failed payments do not activate rewards. Partial refunds and disputes require separate review.',
  'Before any charge, you must personally select an initially unchecked acceptance box, and receive a confirmation you can keep containing these terms and cancellation instructions. For help, contact appdigital.corp@gmail.com.',
 ].join('\n\n'),
})
export const F16_P13_DRAFT_SCOPE=common
export const F16_P13_DRAFT_LOCALES=Object.freeze({es,en})
export const F16_P13_COPY_RELEASE_BLOCKERS=Object.freeze([
 'operator_legal_identity_review',
 'legal_review_and_product_owner_approval',
 'actual_benefits_available_and_financial_entitlement_verified',
 'direct_online_cancellation_operational',
 'retainable_acknowledgement_operational',
 'price_total_and_tax_treatment_checked',
 'consent_evidence_retention_and_financial_record_schedule_approved',
 'annual_reminders_and_fee_change_notices_operational',
 'prospective_service_period_terms_approved',
])
// Deliberately NO function that can return a 'publish' command, INSERT,
// Supabase RPC payload or PayPal checkout authorization from this draft.
