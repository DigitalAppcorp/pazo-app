export type LegalKind = 'privacy' | 'terms'
export type LegalLanguage = 'es' | 'en'
export interface LegalText {
  heading: string
  introduction: string
  alert: string
  sections: ReadonlyArray<{heading: string; text: string}>
}
/** Bilingual legal text is ready for the beta. This does NOT authorize public deployment: the Codex account-deletion E2E gate remains independent. */
export const LEGAL_RELEASE_READY = true as const
// Set only when the beta is actually published; previews and RC builds are not effective dates.
export const PAZO_LEGAL_EFFECTIVE_DATE = null
/** Legal operator and state of registration as provided by the Product Owner.
 * No independent registry verification or street address is claimed.
 */
export const PAZO_LEGAL_OPERATOR_NAME = 'Alvarado Solutions LLC' as const
export const PAZO_LEGAL_OPERATOR_REGISTRATION_STATE = 'California' as const
// Policy text adopted for the beta on 2026-10-10, not an acceptance record.
// The public release remains blocked until the separate manual-deletion QA gate passes.
export const legalPreview: Record<LegalKind, Record<LegalLanguage, LegalText>> = {
  privacy: {
    es: {
      heading: 'Privacidad en PAZO',
      introduction: 'Política de privacidad preparada para la versión beta. La fecha de vigencia se fijará al publicarla.',
      alert: 'La fecha de vigencia se fijará al publicar la beta. Operador: Alvarado Solutions LLC (California). Privacidad: appdigital.corp@gmail.com. Las solicitudes de baja se revisan manualmente; solicitarla no elimina automáticamente tu cuenta.',
      sections: [
        { heading: 'Responsable de PAZO', text: `PAZO es operado por ${PAZO_LEGAL_OPERATOR_NAME}, empresa registrada en ${PAZO_LEGAL_OPERATOR_REGISTRATION_STATE}, Estados Unidos. Para consultas sobre datos personales, escribe al correo de privacidad que se muestra al final de esta política.` },
        { heading: 'Cuenta y contenido', text: 'PAZO usa correo electrónico para autenticar la cuenta. Los perfiles de mascotas, publicaciones, fotos y comentarios que compartes pueden ser visibles para otras personas según la función utilizada.' },
        { heading: 'Información privada', text: 'Cuidados, documentos de mascotas y ciertos reportes de rescate requieren controles de acceso. No publiques contraseñas ni información privada dentro de comentarios o publicaciones públicas.' },
        { heading: 'Ubicación y lugares', text: 'El GPS del dispositivo se solicita únicamente al elegir Usar mi ubicación; se utiliza durante la sesión para centrar el mapa y calcular distancias, y no se almacena como coordenada exacta en el historial de lugares. Los check-ins sí guardan lugar, mascota, fecha y visibilidad elegida. Mapbox puede recibir información técnica sobre las zonas mostradas al cargar el mapa.' },
        { heading: 'Rescate y avistamientos', text: 'Las alertas de mascotas perdidas pueden incluir una zona y fecha de último avistamiento. Quien reporta un avistamiento puede proporcionar nombre, teléfono, mensaje y ubicación escrita. Un enlace público de rescate puede mostrar información limitada de la mascota y su alerta; evita escribir datos privados en campos públicos.' },
        { heading: 'Servicios utilizados', text: 'Supabase proporciona autenticación, base de datos y almacenamiento. Mapbox muestra los mapas. PostHog está excluido de esta versión de lanzamiento y no debe recibir eventos durante la beta. La pantalla de bienvenida carga una imagen alojada por Unsplash, cuyo servidor puede recibir información técnica de la solicitud. No se envían coordenadas GPS exactas ni el contenido de documentos a los eventos de producto.' },
        { heading: 'Cambios y señales del navegador', text: 'Al publicar la beta, PAZO indicará aquí la fecha efectiva. Si hay cambios materiales, publicaremos el texto actualizado y su nueva fecha en PAZO; actualmente no hay un sistema de avisos individuales. La aplicación no cambia su funcionamiento según la señal Do Not Track del navegador. PAZO no activa PostHog ni seguimiento entre sitios propio en esta beta; Mapbox y Unsplash pueden recibir información técnica y aplicar sus propias prácticas al servir mapas o imágenes.' },
        { heading: 'Moderación y archivos', text: 'Puedes denunciar contenido; las publicaciones retiradas se ocultan de las vistas sociales. La retirada de archivos almacenados y copias cacheadas requiere revisión individual; ocultar una publicación no garantiza eliminar inmediatamente todos sus archivos. Puedes pedir revisión a través del contacto de soporte.' },
        { heading: 'Conservación y solicitudes', text: 'Los datos de cuenta, mascotas y publicaciones siguen almacenados mientras la cuenta está activa o hasta que se modifiquen o retiren mediante un proceso confirmado. No existe una purga automática general por antigüedad. Las denuncias y comunicaciones de soporte requieren revisión particular; las copias de respaldo y cachés pueden permanecer según cada proveedor. Si la opción está habilitada en tu versión, puedes solicitar la eliminación de cuenta desde tu cuenta o escribir al contacto indicado; solicitarla no elimina automáticamente tus datos. Puedes escribir a nuestro correo de privacidad para consultar o solicitar corrección de tus datos; antes de realizar cambios sensibles verificaremos que eres titular de la cuenta. Puedes pedir información o corrección por el correo indicado. No garantizamos una eliminación inmediata de respaldos, archivos cacheados, registros sujetos a obligaciones aplicables ni contenido ajeno.' },
      ],
    },
    en: {
      heading: 'Privacy at PAZO',
      introduction: 'Privacy policy prepared for the PAZO beta. The effective date will be set when it is published.',
      alert: 'The effective date will be set when the beta is published. Operator: Alvarado Solutions LLC (California). Privacy contact: appdigital.corp@gmail.com. Account deletion requests are handled through manual review; submitting one does not automatically erase your account.',
      sections: [
        { heading: 'PAZO operator', text: `PAZO is operated by ${PAZO_LEGAL_OPERATOR_NAME}, a company registered in ${PAZO_LEGAL_OPERATOR_REGISTRATION_STATE}, United States. For questions about your personal information, contact the privacy email shown below.` },
        { heading: 'Account and content', text: 'PAZO uses an email address for account authentication. Pet profiles, posts, photos and comments you share may be visible to others depending on the feature.' },
        { heading: 'Private information', text: 'Care schedules, pet documents and some rescue reports require access controls. Do not place passwords or private information in public posts or comments.' },
        { heading: 'Location and places', text: 'Device GPS is requested only when you choose Use my location. It is used during the session to center the map and calculate distances, and is not stored as precise coordinates in place history. Check-ins do store the place, pet, date and selected visibility. Mapbox may receive technical information about areas displayed when loading the map.' },
        { heading: 'Rescue and sightings', text: 'Lost-pet alerts may include a last-seen area and time. People reporting sightings may provide a name, phone number, message and written location. A public rescue link may show limited information about the pet and its alert; avoid placing private details in public fields.' },
        { heading: 'Service providers', text: 'Supabase provides authentication, database and storage. Mapbox displays the maps. PostHog is excluded from this release and must not receive events during the beta. The welcome screen loads an image hosted by Unsplash, whose server may receive technical request information. Exact GPS coordinates and document contents are not sent as product events.' },
        { heading: 'Updates and browser signals', text: 'PAZO will show the effective date when the beta is published. If we make material changes, we will show the updated text and its new effective date in PAZO; there is currently no individual change-notification system. The app does not change its behavior in response to browser Do Not Track signals. PAZO does not enable PostHog or its own cross-site tracking for this beta; Mapbox and Unsplash may receive technical request data and follow their own practices when serving maps and images.' },
        { heading: 'Moderation and files', text: 'You can report content; removed posts are hidden from social views. Removing stored files and cached copies requires individual review; hiding a post does not guarantee immediate removal of every file. You may request a review through the support contact.' },
        { heading: 'Retention and requests', text: 'Account, pet and post data currently remain stored while the account is active or until modified or removed through a verified process. There is no general automatic age-based purge. Moderation reports and support correspondence require individual review; provider backups and caches may persist. If the option is enabled in your version, you can request account deletion from your account or write to the contact below; submitting a request does not automatically erase your data. You can contact our privacy email to ask about or request corrections to your data; we will verify account ownership before sensitive changes. You may request information or corrections using the listed email. We cannot guarantee immediate erasure of backups, cached files, records subject to applicable obligations, or content belonging to others.' },
      ],
    },
  },
  terms: {
    es: {
      heading: 'Reglas de uso de PAZO',
      introduction: 'Términos y reglas de uso preparados para la versión beta. La fecha de vigencia se fijará al publicarlos.',
      alert: 'La fecha de vigencia se fijará al publicar la beta. PAZO es una comunidad para personas de 18 años o más. Para reclamaciones, reportes o dudas sobre el servicio, utiliza el contacto de soporte indicado.',
      sections: [
        { heading: 'Operador del servicio', text: `PAZO es operado por ${PAZO_LEGAL_OPERATOR_NAME}, empresa registrada en ${PAZO_LEGAL_OPERATOR_REGISTRATION_STATE}, Estados Unidos. Puedes comunicar dudas o reclamaciones al correo de soporte que aparece al final.` },
        { heading: 'Edad mínima', text: 'PAZO está diseñado para personas mayores de 18 años. La declaración de edad en el registro no representa una verificación de identidad.' },
        { heading: 'Comunidad segura', text: 'No publiques acoso, amenazas, spam, contenido ilegal ni datos privados de terceros sin permiso. Eres responsable de los materiales que compartes.' },
        { heading: 'Moderación', text: 'Otras personas pueden denunciar contenido y un moderador puede restringir su visibilidad. La retirada de archivos requiere revisión individual y puede no ser inmediata. Puedes solicitar la revisión de una decisión escribiendo al soporte; no existe un sistema automático de apelaciones.' },
        { heading: 'Servicios en desarrollo', text: 'Algunas funciones muestran claramente que están en desarrollo. No deben interpretarse como servicios disponibles, garantías de resultados o compras habilitadas.' },
        { heading: 'Versiones de prueba', text: 'Durante la beta pueden existir interrupciones y cambios en el servicio. Los datos de pruebas internas se gestionan mediante un proceso controlado separado del contenido de usuarios externos.' },
      ],
    },
    en: {
      heading: 'PAZO Community Rules',
      introduction: 'Terms and community rules prepared for the beta. The effective date will be set when they are published.',
      alert: 'The effective date will be set when the beta is published. PAZO is a community for adults 18 and older. For complaints, reports or service questions, use the support contact below.',
      sections: [
        { heading: 'Service operator', text: `PAZO is operated by ${PAZO_LEGAL_OPERATOR_NAME}, a company registered in ${PAZO_LEGAL_OPERATOR_REGISTRATION_STATE}, United States. Contact the support email below for questions or complaints.` },
        { heading: 'Minimum age', text: 'PAZO is intended for adults 18 and older. The age declaration at registration is not identity verification.' },
        { heading: 'Safe community', text: 'Do not post harassment, threats, spam, unlawful material or private information about others without permission. You are responsible for what you share.' },
        { heading: 'Moderation', text: 'Other users can report content and moderators can restrict visibility. Removing stored files requires individual review and may not be immediate. You may request review of a decision by contacting support; there is no automated appeals system.' },
        { heading: 'Features in development', text: 'Some features are explicitly marked as in development. They do not represent available services, promised outcomes or enabled purchases.' },
        { heading: 'Testing versions', text: 'During the beta, features may change or become unavailable. Internal test data is handled through a separate controlled process, independently from external user content.' },
      ],
    },
  },
}
