// Sixty distinct follow-up scenes. A scene is NOT automatically a distinct
// route or a complete user journey; all data are synthetic or blocked.
export const EXTENDED_VISUAL_CASES=Object.freeze([
  {
    "id": "feed-three",
    "group": "social",
    "level": "synthetic",
    "template": "feed",
    "state": "three",
    "title": "Feed con tres posts"
  },
  {
    "id": "feed-long",
    "group": "social",
    "level": "synthetic",
    "template": "feed",
    "state": "long",
    "title": "Publicación con texto largo"
  },
  {
    "id": "feed-liked",
    "group": "social",
    "level": "synthetic",
    "template": "feed",
    "state": "liked",
    "title": "Publicación con like"
  },
  {
    "id": "feed-saved",
    "group": "social",
    "level": "synthetic",
    "template": "feed",
    "state": "saved",
    "title": "Publicación guardada"
  },
  {
    "id": "feed-comments",
    "group": "social",
    "level": "synthetic",
    "template": "feed",
    "state": "comments",
    "title": "Publicación con comentarios"
  },
  {
    "id": "feed-recommended",
    "group": "social",
    "level": "synthetic",
    "template": "feed",
    "state": "recommended",
    "title": "Publicación recomendada"
  },
  {
    "id": "feed-deleted-author",
    "group": "social",
    "level": "synthetic",
    "template": "feed",
    "state": "deleted",
    "title": "Autor de post eliminado"
  },
  {
    "id": "feed-nearby",
    "group": "social",
    "level": "synthetic",
    "template": "feed",
    "state": "nearby",
    "title": "Feed filtro Cerca"
  },
  {
    "id": "communities-populated",
    "group": "social",
    "level": "synthetic",
    "template": "communities",
    "state": "populated",
    "title": "Comunidades con miembros ficticios"
  },
  {
    "id": "community-feature",
    "group": "social",
    "level": "synthetic",
    "template": "community-feature",
    "state": "ideas",
    "title": "Experimento de comunidad"
  },
  {
    "id": "search-active",
    "group": "social",
    "level": "synthetic",
    "template": "search",
    "state": "active",
    "title": "Búsqueda habilitada vacía"
  },
  {
    "id": "search-filter-people",
    "group": "social",
    "level": "synthetic",
    "template": "search",
    "state": "people",
    "title": "Búsqueda de mascotas"
  },
  {
    "id": "nav-communities",
    "group": "navegacion",
    "level": "synthetic",
    "template": "nav",
    "state": "comunidades",
    "title": "Navegación Comunidades"
  },
  {
    "id": "nav-map",
    "group": "navegacion",
    "level": "synthetic",
    "template": "nav",
    "state": "mapa",
    "title": "Navegación Mapa"
  },
  {
    "id": "nav-pet",
    "group": "navegacion",
    "level": "synthetic",
    "template": "nav",
    "state": "mascota",
    "title": "Navegación Mi mascota"
  },
  {
    "id": "pet-two",
    "group": "mascota",
    "level": "synthetic",
    "template": "pet",
    "state": "two",
    "title": "Selector con dos mascotas"
  },
  {
    "id": "pet-lost",
    "group": "mascota",
    "level": "synthetic",
    "template": "pet",
    "state": "lost",
    "title": "Mi mascota marcada perdida"
  },
  {
    "id": "pet-posts",
    "group": "mascota",
    "level": "synthetic",
    "template": "pet",
    "state": "posts",
    "title": "Mi mascota con publicaciones"
  },
  {
    "id": "pet-settings",
    "group": "mascota",
    "level": "synthetic",
    "template": "pet",
    "state": "settings",
    "title": "Menú Ajustes de mascota"
  },
  {
    "id": "pet-edit",
    "group": "mascota",
    "level": "synthetic",
    "template": "pet",
    "state": "edit",
    "title": "Edición de datos de mascota"
  },
  {
    "id": "pet-picker",
    "group": "mascota",
    "level": "synthetic",
    "template": "pet",
    "state": "picker",
    "title": "Elegir mascota activa"
  },
  {
    "id": "care-loading",
    "group": "servicios",
    "level": "synthetic",
    "template": "care",
    "state": "loading",
    "title": "Agenda cargando"
  },
  {
    "id": "care-error",
    "group": "servicios",
    "level": "synthetic",
    "template": "care",
    "state": "error",
    "title": "Agenda con error"
  },
  {
    "id": "care-active",
    "group": "servicios",
    "level": "synthetic",
    "template": "care",
    "state": "active",
    "title": "Cuidados programados"
  },
  {
    "id": "care-history",
    "group": "servicios",
    "level": "synthetic",
    "template": "care",
    "state": "history",
    "title": "Historial de cuidados"
  },
  {
    "id": "care-create",
    "group": "servicios",
    "level": "synthetic",
    "template": "care",
    "state": "create",
    "title": "Nuevo recordatorio"
  },
  {
    "id": "documents-loading",
    "group": "servicios",
    "level": "synthetic",
    "template": "documents",
    "state": "loading",
    "title": "Documentos cargando"
  },
  {
    "id": "documents-error",
    "group": "servicios",
    "level": "synthetic",
    "template": "documents",
    "state": "error",
    "title": "Documentos con error"
  },
  {
    "id": "documents-single",
    "group": "servicios",
    "level": "synthetic",
    "template": "documents",
    "state": "single",
    "title": "Documento guardado"
  },
  {
    "id": "documents-many",
    "group": "servicios",
    "level": "synthetic",
    "template": "documents",
    "state": "many",
    "title": "Lista de documentos"
  },
  {
    "id": "documents-uploading",
    "group": "servicios",
    "level": "synthetic",
    "template": "documents",
    "state": "uploading",
    "title": "Documento procesándose"
  },
  {
    "id": "lost-review-long",
    "group": "rescate",
    "level": "synthetic",
    "template": "lost-review",
    "state": "long",
    "title": "Revisión de alerta con texto largo"
  },
  {
    "id": "lost-active-error",
    "group": "rescate",
    "level": "synthetic",
    "template": "lost-active",
    "state": "error",
    "title": "Alerta activa con error al compartir"
  },
  {
    "id": "public-rescue-unavailable",
    "group": "rescate",
    "level": "blocked",
    "template": "public-rescue",
    "state": "missing",
    "title": "Pasaporte público sin QR válido"
  },
  {
    "id": "passport-unavailable",
    "group": "rescate",
    "level": "blocked",
    "template": "passport",
    "state": "unavailable",
    "title": "Pasaporte QR no disponible"
  },
  {
    "id": "sighting-unavailable",
    "group": "rescate",
    "level": "blocked",
    "template": "sighting",
    "state": "unavailable",
    "title": "Detalle de avistamiento sin conexión"
  },
  {
    "id": "report-comment",
    "group": "moderacion",
    "level": "synthetic",
    "template": "report",
    "state": "comment",
    "title": "Denuncia de comentario"
  },
  {
    "id": "map-auth-blocked",
    "group": "lugares",
    "level": "blocked",
    "template": "map",
    "state": "authenticated",
    "title": "Lugares sin acceso a datos"
  },
  {
    "id": "map-suggest",
    "group": "lugares",
    "level": "synthetic",
    "template": "map-suggest",
    "state": "blank",
    "title": "Sugerir establecimiento"
  },
  {
    "id": "place-feature-choice",
    "group": "lugares",
    "level": "synthetic",
    "template": "feature-intent",
    "state": "places",
    "title": "Preferencia de funciones de lugares"
  },
  {
    "id": "place-feature-door",
    "group": "lugares",
    "level": "synthetic",
    "template": "community-feature",
    "state": "places",
    "title": "Puerta de interés Lugares"
  },
  {
    "id": "notifications-empty",
    "group": "notificaciones",
    "level": "synthetic",
    "template": "notifications",
    "state": "empty",
    "title": "Bandeja sin notificaciones"
  },
  {
    "id": "notifications-unread",
    "group": "notificaciones",
    "level": "synthetic",
    "template": "notifications",
    "state": "unread",
    "title": "Aviso sin leer"
  },
  {
    "id": "notifications-mixed",
    "group": "notificaciones",
    "level": "synthetic",
    "template": "notifications",
    "state": "mixed",
    "title": "Notificaciones de tipos mixtos"
  },
  {
    "id": "notifications-community",
    "group": "notificaciones",
    "level": "synthetic",
    "template": "notifications",
    "state": "community",
    "title": "Filtro de comunidad"
  },
  {
    "id": "messages-empty",
    "group": "mensajes",
    "level": "synthetic",
    "template": "messages",
    "state": "empty",
    "title": "Mensajes sin conversaciones"
  },
  {
    "id": "messages-inbox",
    "group": "mensajes",
    "level": "synthetic",
    "template": "messages",
    "state": "inbox",
    "title": "Bandeja de mensajes sintética"
  },
  {
    "id": "messages-request",
    "group": "mensajes",
    "level": "synthetic",
    "template": "messages",
    "state": "request",
    "title": "Solicitud de mensaje"
  },
  {
    "id": "offer-layout",
    "group": "membresia",
    "level": "synthetic",
    "template": "offer",
    "state": "layout",
    "title": "Diseño de oferta sin PayPal activo"
  },
  {
    "id": "benefits-no-pet",
    "group": "membresia",
    "level": "synthetic",
    "template": "benefits",
    "state": "no-pet",
    "title": "Beneficios sin mascota"
  },
  {
    "id": "benefits-pet",
    "group": "membresia",
    "level": "synthetic",
    "template": "benefits",
    "state": "pet",
    "title": "Beneficios con mascota ficticia"
  },
  {
    "id": "wall-error",
    "group": "membresia",
    "level": "synthetic",
    "template": "wall",
    "state": "error",
    "title": "Muro sin conexión"
  },
  {
    "id": "admin-summary",
    "group": "administracion",
    "level": "synthetic",
    "template": "admin",
    "state": "summary",
    "title": "Resumen admin con datos sintéticos"
  },
  {
    "id": "admin-users",
    "group": "administracion",
    "level": "synthetic",
    "template": "admin",
    "state": "users",
    "title": "Lista usuarios QA"
  },
  {
    "id": "admin-pets",
    "group": "administracion",
    "level": "synthetic",
    "template": "admin",
    "state": "pets",
    "title": "Resumen mascotas QA"
  },
  {
    "id": "admin-finance",
    "group": "administracion",
    "level": "synthetic",
    "template": "admin",
    "state": "finance",
    "title": "Membresías Sandbox QA"
  },
  {
    "id": "admin-ideas",
    "group": "administracion",
    "level": "synthetic",
    "template": "admin",
    "state": "ideas",
    "title": "Interés en fake doors QA"
  },
  {
    "id": "admin-infra",
    "group": "administracion",
    "level": "synthetic",
    "template": "admin",
    "state": "infra",
    "title": "Métricas Supabase QA"
  },
  {
    "id": "admin-maintenance",
    "group": "administracion",
    "level": "blocked",
    "template": "admin",
    "state": "maintenance",
    "title": "Mantenimiento admin sin autorización"
  },
  {
    "id": "admin-paypal",
    "group": "administracion",
    "level": "blocked",
    "template": "admin",
    "state": "paypal",
    "title": "Ajustes PayPal sin autoridad"
  }
]);
