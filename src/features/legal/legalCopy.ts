export type LegalKind = 'privacy' | 'terms'
export type LegalLanguage = 'es' | 'en'
export interface LegalText {
  heading: string
  introduction: string
  alert: string
  sections: ReadonlyArray<{heading: string; text: string}>
}
export const LEGAL_RELEASE_READY = false as const
/** Legal operator designated by the PO. Registration jurisdiction/address not yet audited. */
export const PAZO_LEGAL_OPERATOR_NAME = 'Alvarado Solutions LLC' as const
// NOT a published policy or acceptance record. Public privacy/support contact
// was approved by the PO; operator name provided by PO. Retention, jurisdiction,
// legal notice completeness and the real deletion workflow still need QA.
export const legalPreview: Record<LegalKind, Record<LegalLanguage, LegalText>> = {
  privacy: {
    es: {
      heading: 'Privacidad en PAZO',
      introduction: 'Resumen informativo del tratamiento de datos en esta versión de pruebas.',
      alert: 'Borrador de preparación: aún no es la política pública definitiva. El operador fue identificado; faltan datos legales de contacto, conservación y verificación real de bajas antes del lanzamiento.',
      sections: [
        { heading: 'Responsable de PAZO', text: `PAZO es operado por ${PAZO_LEGAL_OPERATOR_NAME}. La información legal complementaria se completará antes de su lanzamiento público.` },
        { heading: 'Cuenta y contenido', text: 'PAZO usa correo electrónico para autenticar la cuenta. Los perfiles de mascotas, publicaciones, fotos y comentarios que compartes pueden ser visibles para otras personas según la función utilizada.' },
        { heading: 'Información privada', text: 'Cuidados, documentos de mascotas y ciertos reportes de rescate requieren controles de acceso. No publiques contraseñas ni información privada dentro de comentarios o publicaciones públicas.' },
        { heading: 'Servicios utilizados', text: 'Supabase proporciona autenticación, base de datos y almacenamiento. El mapa utiliza Mapbox. La observabilidad y las herramientas de pruebas se revisan por separado antes de activarse al público.' },
        { heading: 'Moderación y archivos', text: 'Puedes denunciar contenido; las publicaciones retiradas se ocultan de las vistas sociales. El proceso de retirada de archivos y cachés, así como las solicitudes de eliminación de cuenta, todavía se están validando.' },
        { heading: 'Retención y derechos', text: 'Puedes contactar a PAZO sobre privacidad y soporte mediante el correo indicado a continuación. Ya puedes enviar una solicitud de eliminación desde tu cuenta; la solicitud no borra datos automáticamente. El procedimiento real y los criterios de conservación siguen pendientes de validación para el lanzamiento.' },
      ],
    },
    en: {
      heading: 'Privacy at PAZO',
      introduction: 'An informational summary of data processing in this testing version.',
      alert: 'Pre-release draft: this is not the final public privacy policy. The legal operator has been identified. Legal contact details, retention and actual account-deletion handling still need verification before launch.',
      sections: [
        { heading: 'PAZO operator', text: `PAZO is operated by ${PAZO_LEGAL_OPERATOR_NAME}. Additional legal contact details will be finalized before public launch.` },
        { heading: 'Account and content', text: 'PAZO uses an email address for account authentication. Pet profiles, posts, photos and comments you share may be visible to others depending on the feature.' },
        { heading: 'Private information', text: 'Care schedules, pet documents and some rescue reports require access controls. Do not place passwords or private information in public posts or comments.' },
        { heading: 'Service providers', text: 'Supabase supports authentication, database and storage. The map uses Mapbox. Monitoring and testing tools are reviewed separately before public activation.' },
        { heading: 'Moderation and files', text: 'You can report content; removed posts are hidden from social views. Storage/cache removal and account-deletion requests are still undergoing verification.' },
        { heading: 'Retention and requests', text: 'You can contact PAZO for privacy and support using the email below. You can already submit an account-deletion request from your account; submitting it does not automatically erase data. The actual process and retention criteria still require verification before launch.' },
      ],
    },
  },
  terms: {
    es: {
      heading: 'Reglas de uso de PAZO',
      introduction: 'Reglas resumidas de convivencia para quienes prueban la comunidad.',
      alert: 'Borrador previo al lanzamiento: no son términos contractuales definitivos. Los datos legales complementarios, la fecha efectiva y el procedimiento de reclamaciones requieren revisión antes de Beta.',
      sections: [
        { heading: 'Operador del servicio', text: `PAZO es operado por ${PAZO_LEGAL_OPERATOR_NAME}. Estos términos siguen en revisión antes del lanzamiento público.` },
        { heading: 'Edad mínima', text: 'PAZO está diseñado para personas mayores de 18 años. La declaración de edad en el registro no representa una verificación de identidad.' },
        { heading: 'Comunidad segura', text: 'No publiques acoso, amenazas, spam, contenido ilegal ni datos privados de terceros sin permiso. Eres responsable de los materiales que compartes.' },
        { heading: 'Moderación', text: 'Otras personas pueden denunciar contenido y un moderador puede restringir su visibilidad. La retirada completa de medios y los procedimientos de apelación siguen en preparación.' },
        { heading: 'Servicios en desarrollo', text: 'Algunas funciones muestran claramente que están en desarrollo. No deben interpretarse como servicios disponibles, garantías de resultados o compras habilitadas.' },
        { heading: 'Versiones de prueba', text: 'Durante el desarrollo puede haber interrupciones, cambios y datos de prueba que se retirarán antes de la apertura oficial mediante un proceso controlado.' },
      ],
    },
    en: {
      heading: 'PAZO Community Rules',
      introduction: 'A plain-language summary of the rules for testing the community.',
      alert: 'Pre-release draft: these are not final contractual terms. Additional legal details, the effective date and appeals process require review before Beta.',
      sections: [
        { heading: 'Service operator', text: `PAZO is operated by ${PAZO_LEGAL_OPERATOR_NAME}. These terms remain under review before public launch.` },
        { heading: 'Minimum age', text: 'PAZO is intended for adults 18 and older. The age declaration at registration is not identity verification.' },
        { heading: 'Safe community', text: 'Do not post harassment, threats, spam, unlawful material or private information about others without permission. You are responsible for what you share.' },
        { heading: 'Moderation', text: 'Other users can report content and moderators can restrict visibility. Complete media removal and appeal procedures are still being prepared.' },
        { heading: 'Features in development', text: 'Some features are explicitly marked as in development. They do not represent available services, promised outcomes or enabled purchases.' },
        { heading: 'Testing versions', text: 'During development, features may change or become unavailable, and test data will be handled through a controlled pre-launch cleanup process.' },
      ],
    },
  },
}
