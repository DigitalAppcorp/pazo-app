/** #153 v1. Closed semantic vocabulary; no payload, content, IDs or inferred success. */
export const INTELLIGENCE_COLLECTION_ENABLED = true
export const intelligenceTasks = {
 pet_create:['Crear mascota','Create pet'],pet_edit:['Editar perfil','Edit profile'],
 feed_like:['Reaccionar al feed','React to feed'],feed_save:['Guardar publicación','Save post'],feed_comment:['Comentar en Inicio','Comment on Home'],feed_publish:['Publicar en Inicio','Publish on Home'],
 profile_follow:['Seguir perfil','Follow profile'],profile_open:['Abrir perfil público','Open public profile'],
 community_discover:['Descubrir comunidades','Discover communities'],community_open:['Abrir comunidad','Open community'],community_join:['Unirse a comunidad','Join community'],community_leave:['Salir de comunidad','Leave community'],community_create:['Crear comunidad','Create community'],community_publish:['Publicar en comunidad','Publish in community'],community_comment:['Comentar en comunidad','Comment in community'],community_like:['Reaccionar en comunidad','React in community'],
 map_open:['Abrir mapa','Open map'],map_route:['Solicitar ruta','Request directions'],map_suggest:['Sugerir lugar','Suggest place'],
 
 qr_download:['Iniciar descarga QR','Start QR download'],qr_share:['Intentar compartir QR','Try QR sharing'],
 care_create:['Guardar cuidado','Save care'],care_edit:['Editar cuidado','Edit care'],care_archive:['Archivar cuidado','Archive care'],care_complete:['Completar cuidado','Complete care'],care_undo:['Deshacer cuidado','Undo care'],
 document_upload:['Guardar documento','Save document'],document_edit:['Editar documento','Edit document'],document_download:['Solicitar documento','Request document'],document_delete:['Eliminar documento','Delete document'],
 feed_hide:['Ocultar contenido','Hide content'],report_submit:['Enviar reporte','Submit report'],
 pwa_prompt:['Mostrar instalación','Show install prompt'],pwa_request:['Solicitar instalación','Request installation'],pwa_accepted:['Instalación aceptada','Install accepted'],pwa_dismissed:['Instalación descartada','Install dismissed'],language_change:['Cambiar idioma','Change language'],
} as const
export type IntelligenceTask=keyof typeof intelligenceTasks
export const intelligenceKinds=['exposure','intent','attempt','failure','retry','cancel'] as const
export type IntelligenceKind=typeof intelligenceKinds[number]
export type IntelligenceItem={seq:number;task:IntelligenceTask;kind:IntelligenceKind}
export const anonymousSignals=['welcome','login_open','login_attempt','login_error','reset_attempt','reset_error','demo_enter','demo_home','demo_pet','demo_communities','demo_places','demo_explore','demo_action','demo_signup','demo_exit','signup_cta','signup_start','signup_requested','signup_error'] as const
export type AnonymousSignal=typeof anonymousSignals[number]
export const futureModules={communities_events:['Encuentros de comunidad','Community meetups'],communities_challenges:['Retos de comunidad','Community challenges'],communities_qa:['Preguntas y respuestas','Questions and answers'],communities_badges:['Reconocimientos de comunidad','Community recognition'],communities_admin_tools:['Herramientas de comunidad','Community tools'],places_user_photos:['Fotos de lugares','Place photos'],places_reviews:['Opiniones de lugares','Place reviews'],places_events:['Actividades en lugares','Place activities'],places_routes:['Rutas y paseos','Routes and walks'],places_business_offers:['Promociones de negocios','Business offers'],places_favorites:['Lugares favoritos','Favorite places']} as const
