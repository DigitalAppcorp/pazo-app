export type LegalKind = 'privacy' | 'terms'
export type LegalLanguage = 'es' | 'en'
export interface LegalText {
  heading: string
  introduction: string
  alert: string
  sections: ReadonlyArray<{heading: string; text: string}>
}
export const LEGAL_RELEASE_READY = false as const
/** Legal operator and state of registration as provided by the Product Owner.
 * No independent registry verification or street address is claimed.
 */
export const PAZO_LEGAL_OPERATOR_NAME = 'Alvarado Solutions LLC' as const
export const PAZO_LEGAL_OPERATOR_REGISTRATION_STATE = 'California' as const
// NOT a published policy or acceptance record. Public privacy/support contact
// was approved by the PO; operator name and state supplied by the PO.
// Legal contact details, retention and the real deletion workflow still need QA.
export const legalPreview: Record<LegalKind, Record<LegalLanguage, LegalText>> = {
  privacy: {
    es: {
      heading: 'Privacidad en PAZO',
      introduction: 'Resumen informativo del tratamiento de datos en esta versión de pruebas.',
      alert: 'Borrador de preparación: aún no es la política pública definitiva. El operador fue identificado; faltan datos legales de contacto, conservación y verificación real de bajas antes del lanzamiento.',
      sections: [
        { heading: 'Responsable de PAZO', text: `PAZO es operado por ${PAZO_LEGAL_OPERATOR_NAME}, empresa registrada en ${PAZO_LEGAL_OPERATOR_REGISTRATION_STATE}, según la información proporcionada por su responsable. La información legal complementaria se completará antes del lanzamiento público.` },
        { heading: 'Cuenta y contenido', text: 'PAZO usa correo electrónico para autenticar la cuenta. Los perfiles de mascotas, publicaciones, fotos y comentarios que compartes pueden ser visibles para otras personas según la función utilizada.' },
        { heading: 'Información privada', text: 'Cuidados, documentos de mascotas y ciertos reportes de rescate requieren controles de acceso. No publiques contraseñas ni información privada dentro de comentarios o publicaciones públicas.' },
        { heading: 'Ubicación y lugares', text: 'El GPS del dispositivo se solicita únicamente al elegir Usar mi ubicación; se utiliza durante la sesión para centrar el mapa y calcular distancias, y no se almacena como coordenada exacta en el historial de lugares. Los check-ins sí guardan lugar, mascota, fecha y visibilidad elegida. Mapbox puede recibir información técnica sobre las zonas mostradas al cargar el mapa.' },
        { heading: 'Rescate y avistamientos', text: 'Las alertas de mascotas perdidas pueden incluir una zona y fecha de último avistamiento. Quien reporta un avistamiento puede proporcionar nombre, teléfono, mensaje y ubicación escrita. Un enlace público de rescate puede mostrar información limitada de la mascota y su alerta; evita escribir datos privados en campos públicos.' },
        { heading: 'Servicios utilizados', text: 'Supabase proporciona autenticación, base de datos y almacenamiento. Mapbox muestra los mapas. PostHog está excluido de esta versión de lanzamiento y no debe recibir eventos durante la beta. La pantalla de bienvenida carga una imagen alojada por Unsplash, cuyo servidor puede recibir información técnica de la solicitud. No se envían coordenadas GPS exactas ni el contenido de documentos a los eventos de producto.' },
        { heading: 'Cambios y señales del navegador', text: 'Estos textos siguen en borrador y aún no tienen fecha de vigencia. Los cambios se mostrarán en PAZO cuando se publiquen; no existe un sistema de avisos individuales implementado. La aplicación no interpreta específicamente la señal Do Not Track del navegador; la configuración de proveedores y conservación deberá verificarse antes del lanzamiento.' },
        { heading: 'Moderación y archivos', text: 'Puedes denunciar contenido; las publicaciones retiradas se ocultan de las vistas sociales. El proceso de retirada de archivos y cachés, así como las solicitudes de eliminación de cuenta, todavía se están validando.' },
        { heading: 'Conservación y solicitudes', text: 'Los datos de cuenta, mascotas y publicaciones siguen almacenados mientras la cuenta está activa o hasta que se modifiquen o retiren mediante un proceso confirmado. No existe una purga automática general por antigüedad. Las denuncias y comunicaciones de soporte requieren revisión particular; las copias de respaldo y cachés pueden permanecer según cada proveedor. Si la opción está habilitada en tu versión, puedes solicitar la baja desde tu cuenta o escribir al contacto indicado; solicitarla no elimina automáticamente tus datos. Los criterios finales están sujetos a verificación antes de publicar esta política.' },
      ],
    },
    en: {
      heading: 'Privacy at PAZO',
      introduction: 'An informational summary of data processing in this testing version.',
      alert: 'Pre-release draft: this is not the final public privacy policy. The legal operator has been identified. Legal contact details, retention and actual account-deletion handling still need verification before launch.',
      sections: [
        { heading: 'PAZO operator', text: `PAZO is operated by ${PAZO_LEGAL_OPERATOR_NAME}, a company registered in ${PAZO_LEGAL_OPERATOR_REGISTRATION_STATE}, according to information provided by its operator. Additional legal contact details will be finalized before public launch.` },
        { heading: 'Account and content', text: 'PAZO uses an email address for account authentication. Pet profiles, posts, photos and comments you share may be visible to others depending on the feature.' },
        { heading: 'Private information', text: 'Care schedules, pet documents and some rescue reports require access controls. Do not place passwords or private information in public posts or comments.' },
        { heading: 'Location and places', text: 'Device GPS is requested only when you choose Use my location. It is used during the session to center the map and calculate distances, and is not stored as precise coordinates in place history. Check-ins do store the place, pet, date and selected visibility. Mapbox may receive technical information about areas displayed when loading the map.' },
        { heading: 'Rescue and sightings', text: 'Lost-pet alerts may include a last-seen area and time. People reporting sightings may provide a name, phone number, message and written location. A public rescue link may show limited information about the pet and its alert; avoid placing private details in public fields.' },
        { heading: 'Service providers', text: 'Supabase provides authentication, database and storage. Mapbox displays the maps. PostHog is excluded from this release and must not receive events during the beta. The welcome screen loads an image hosted by Unsplash, whose server may receive technical request information. Exact GPS coordinates and document contents are not sent as product events.' },
        { heading: 'Updates and browser signals', text: 'These texts remain drafts without an effective date. Changes will be shown in PAZO when published; no individual change-notification system has been implemented. The app does not specifically interpret browser Do Not Track signals; provider settings and retention must be verified before launch.' },
        { heading: 'Moderation and files', text: 'You can report content; removed posts are hidden from social views. Storage/cache removal and account-deletion requests are still undergoing verification.' },
        { heading: 'Retention and requests', text: 'Account, pet and post data currently remain stored while the account is active or until modified or removed through a verified process. There is no general automatic age-based purge. Moderation reports and support correspondence require individual review; provider backups and caches may persist. If the option is enabled in your version, you can request account deletion from your account or write to the contact below; submitting a request does not automatically erase your data. Final retention criteria require verification before publishing this policy.' },
      ],
    },
  },
  terms: {
    es: {
      heading: 'Reglas de uso de PAZO',
      introduction: 'Reglas resumidas de convivencia para quienes prueban la comunidad.',
      alert: 'Borrador previo al lanzamiento: no son términos contractuales definitivos. Los datos legales complementarios, la fecha efectiva y el procedimiento de reclamaciones requieren revisión antes de Beta.',
      sections: [
        { heading: 'Operador del servicio', text: `PAZO es operado por ${PAZO_LEGAL_OPERATOR_NAME}, empresa registrada en ${PAZO_LEGAL_OPERATOR_REGISTRATION_STATE}, según la información proporcionada por su responsable. Estos términos siguen en revisión antes del lanzamiento público.` },
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
        { heading: 'Service operator', text: `PAZO is operated by ${PAZO_LEGAL_OPERATOR_NAME}, a company registered in ${PAZO_LEGAL_OPERATOR_REGISTRATION_STATE}, according to information provided by its operator. These terms remain under review before public launch.` },
        { heading: 'Minimum age', text: 'PAZO is intended for adults 18 and older. The age declaration at registration is not identity verification.' },
        { heading: 'Safe community', text: 'Do not post harassment, threats, spam, unlawful material or private information about others without permission. You are responsible for what you share.' },
        { heading: 'Moderation', text: 'Other users can report content and moderators can restrict visibility. Complete media removal and appeal procedures are still being prepared.' },
        { heading: 'Features in development', text: 'Some features are explicitly marked as in development. They do not represent available services, promised outcomes or enabled purchases.' },
        { heading: 'Testing versions', text: 'During development, features may change or become unavailable, and test data will be handled through a controlled pre-launch cleanup process.' },
      ],
    },
  },
}
