# Taxonomía v1 — #153

Contrato central: intelligenceCatalog.ts y RPC pazo_intelligence_record_v1. Clave semántica: task.kind.v1. Payload exacto: p_session UUID efímero de #150, p_items array de {seq,task,kind}; sin owner, mascota, contenido o texto. Versionado mediante RPC v1 y envelope de informe version=1. No se añade una identidad paralela.

## Estados y autoridad

exposure: superficie o control visible; intent: acción declarada/local; attempt: inicio de operación semántica; failure: error capturado de esa operación; retry: nuevo intento después de un fallo en la misma sesión; cancel: cancelación observada por API. No existe success aceptado desde UI. Apertura no es finalización; descarga iniciada no es archivo guardado; compartir resuelto no es entrega externa.

## 37 tareas autenticadas

| Clave | Etiqueta ES | Etiqueta EN |
| --- | --- | --- |
| pet_create | Crear mascota | Create pet |
| pet_edit | Editar perfil | Edit profile |
| feed_like | Reaccionar al feed | React to feed |
| feed_save | Guardar publicación | Save post |
| feed_comment | Comentar en Inicio | Comment on Home |
| feed_publish | Publicar en Inicio | Publish on Home |
| profile_follow | Seguir perfil | Follow profile |
| profile_open | Abrir perfil público | Open public profile |
| community_discover | Descubrir comunidades | Discover communities |
| community_open | Abrir comunidad | Open community |
| community_join | Unirse a comunidad | Join community |
| community_leave | Salir de comunidad | Leave community |
| community_create | Crear comunidad | Create community |
| community_publish | Publicar en comunidad | Publish in community |
| community_comment | Comentar en comunidad | Comment in community |
| community_like | Reaccionar en comunidad | React in community |
| map_open | Abrir mapa | Open map |
| map_route | Solicitar ruta | Request directions |
| map_suggest | Sugerir lugar | Suggest place |
| qr_download | Iniciar descarga QR | Start QR download |
| qr_share | Intentar compartir QR | Try QR sharing |
| care_create | Guardar cuidado | Save care |
| care_edit | Editar cuidado | Edit care |
| care_archive | Archivar cuidado | Archive care |
| care_complete | Completar cuidado | Complete care |
| care_undo | Deshacer cuidado | Undo care |
| document_upload | Guardar documento | Save document |
| document_edit | Editar documento | Edit document |
| document_download | Solicitar documento | Request document |
| document_delete | Eliminar documento | Delete document |
| feed_hide | Ocultar contenido | Hide content |
| report_submit | Enviar reporte | Submit report |
| pwa_prompt | Mostrar instalación | Show install prompt |
| pwa_request | Solicitar instalación | Request installation |
| pwa_accepted | Instalación aceptada | Install accepted |
| pwa_dismissed | Instalación descartada | Install dismissed |
| language_change | Cambiar idioma | Change language |

## Enlaces explícitos de instrumentación

| Tarea | Emisor / fuente |
| --- | --- |
| pet_create / pet_edit | petService: createPetProfile / updatePetProfile |
| feed_like / feed_save / feed_comment | App: handleLikePost / handleSavePost / handleAddComment |
| feed_publish | CreatePostModal: handleSubmit |
| profile_follow / profile_open | FollowButton: handleToggleFollow / App profile effect |
| community_discover / community_open | CommunitiesView / CommunityDetailView: load boundary |
| community_join / community_leave / community_create / community_publish / community_comment / community_like | communityService: named committed-operation entry points |
| map_open / map_route / map_suggest | MapView load + route click; placeService suggestion |
| qr_download / qr_share | PassportModal: initiated download / share result failure or cancellation |
| care_create / care_edit / care_archive / care_complete / care_undo | careService: create/update/archive/complete/undo |
| document_upload / document_edit / document_download / document_delete | documentService: upload/update/download/delete |
| feed_hide / report_submit | HomeView local hide intent / reportingService submitReport |
| pwa_prompt / pwa_request / pwa_accepted / pwa_dismissed | PazoInstallControl: actual prompt availability, native request, browser choice |
| language_change | App: explicit language control |

Una entrada no implica observar cada render o todos los clics. La operación devuelve el mismo resultado/error de negocio y nunca espera la telemetría. Una clave/estado se deduplica una vez por sesión; no se suman filas como usuarios distintos. Los servicios no recogen argumentos. Las respuestas tardías usan generación Auth y contexto de mascota; A→B→A no revive una operación.

## 19 señales anónimas

`welcome`, `login_open`, `login_attempt`, `login_error`, `reset_attempt`, `reset_error`, `demo_enter`, `demo_home`, `demo_pet`, `demo_communities`, `demo_places`, `demo_explore`, `demo_action`, `demo_signup`, `demo_exit`, `signup_cta`, `signup_start`, `signup_requested`, `signup_error`.

Un contador por fecha/señal de solicitudes protegidas; no personas, sesiones anónimas ni recorridos individuales. Una vez por señal/vida de página, sin cookie/storage/owner. Solo canónico, visible, sin GPC ni WebDriver, con challenge de un uso. Los cuatro pasos signup_* nuevos solo se emiten sin campaña válida; con campaña válida se reutiliza el prerregistro #150. No se realiza unión Demo→cuenta. Error no incluye contraseña/correo/mensaje.

## Fuentes reutilizadas

interactions: impresión con umbral existente 60% y view de 3s; no lectura; reacciones/guardados actualmente persistidos, sin historial de retiros. La función alojada deduplica impression/view durante 24h por mascota/contenido: una impresión puede impedir persistir la posterior señal de 3s. Esa señal no cubre todas las permanencias, no es tiempo de lectura y no se cambia el algoritmo para completar analítica. posts/post_comments/follows: publicaciones, comentarios y seguimiento persistidos. communities/community_memberships/community_posts/community_post_comments/community_post_likes: participación persistida. pets: creación confirmada. care_completions y behavior_events #150: completar cuidado, cuidado creado y primera compartición QR confirmada. search_usage_events: abrir/ejecutar/abrir resultado/cero resultados, sin consulta. place_usage_events: mapa/búsqueda/ficha, sin proyectar lugar o coordenadas.

Fake doors: module_validation_views/interests/intents, por 11 módulos allowlist: communities_events, communities_challenges, communities_qa, communities_badges, communities_admin_tools, places_user_photos, places_reviews, places_events, places_routes, places_business_offers, places_favorites. No se guarda segunda respuesta. View visible, interés y última intención son unidades distintas; una edición/borrado puede modificar el recuento. Las fuentes existentes son filas persistidas, no un historial inmutable ni una atribución causal a intentos. Cada resultado cuenta cuentas con registros en ventana, no eventos ni mascotas.

## Límites, exclusiones y evolución

Lote máximo8, cola16, cap64/sesión, 12 sesiones/24h por cuenta compartidas con #150, dos intentos idénticos, timeout5s, ventana14d. Informes k10 por fila y complementos de retorno protegidos. Sin duraciones exactas, backtracking individual, abandono demostrado, lectura/satisfacción, entrega externa, instalación probada por CTA, orgánico probado o retención D30/D90. No se excluye una tarea crítica solo porque no hay identificación de cada clic.

Los controles que solo configuran campos, vista o cierre quedan explícitamente excluidos en la matriz; la tarea semántica sí se cubre. Administración, finanzas, invitaciones, conversaciones y rescate sensible no se convierten en comportamiento. Una ampliación del vocabulario o cambio de significado exige otra versión y revisión de propósito/privacidad/muestra/coste, sin activar por documentación.
