# PAZO — Data & Third-Party Inventory

> **Estado post-limpieza 2026-10-10:** inventario de categorías conserva validez como diseño, **no como evidencia de filas actuales**. Se observan 0 filas en las tablas de aplicación y 0 objetos en Storage; permanecen 6 cuentas Auth/identidades. Antes del reset los datos eran fixtures. Consultar `docs/PAZO_F14_TEST_DATA_RESET_20261010.md`.

**Estado:** ACTIVO / baseline pre-Beta  
**Regla:** este documento describe categorías y destinos conocidos. No sustituye una auditoría de schema ni una Privacy Policy pública.

## 1. Cuenta / autenticación

**Datos**
- email;
- identificadores internos de usuario/sesión;
- credenciales gestionadas por Supabase Auth.

**Clasificación**
Privado de cuenta.

**Proveedor**
Supabase.

**Reglas**
- contraseña nunca se registra en analytics;
- no exponer email a perfiles sociales;
- no enviar email a PostHog;
- mínimo de contraseña reforzado en UX/local baseline;
- 18+ requiere declaración activa del usuario.

## 2. Perfil social de mascota

**Datos**
- nombre;
- especie/raza/edad descriptiva;
- foto;
- bio;
- zona/intereses según feature;
- estado social/público cuando aplique.

**Clasificación**
Mixto: campos públicos por intención + datos internos.

**Proveedor**
Supabase Database/Storage.

**Regla**
La identidad social es la mascota, no el humano.

## 3. Feed / UGC social

**Datos**
- posts;
- fotos;
- comentarios;
- likes/follows/saves o equivalentes cuando estén implementados.

**Clasificación**
Público/social por intención del usuario.

**Riesgos**
- moderación;
- copyright/IP;
- abuso;
- contenido personal publicado voluntariamente.

**Beta requirement**
Reporting/blocking/removal policy en F14.

## 4. Comunidades

**Datos**
- comunidad;
- descripción/reglas;
- membresía;
- posts/comentarios;
- imágenes.

**Clasificación**
Social/público o membership-scoped según el contrato del módulo.

**Proveedor**
Supabase Database/Storage.

## 5. Lugares / mapa

**Datos**
- catálogo de lugares;
- búsquedas/filtros;
- check-ins;
- sugerencias;
- ubicación del dispositivo durante uso del mapa.

**Clasificación**
- catálogo: público;
- presencia/check-in: sensible/contextual;
- GPS exacto del dispositivo: sensible y efímero.

**Regla**
- no persistir GPS exacto por defecto;
- no enviar coordenadas exactas a analytics;
- visibilidad de presencia debe ser explícita.

**Proveedor adicional**
Mapbox recibe solicitudes necesarias para renderizar/usar el mapa según su integración.

## 6. Rescue / QR / mascota perdida

**Datos**
- token público;
- perfil público limitado;
- estado de mascota perdida;
- última ubicación textual;
- reportes de avistamiento;
- nombre/teléfono/mensaje del reportante cuando lo proporciona.

**Clasificación**
Mixto:
- perfil público limitado;
- reportes/contacto: sensible.

**Regla**
- acceso público solo mediante el contrato de Rescue;
- no enviar contenido/contacto a analytics;
- mantener rate limits;
- ownership de acciones del dueño.

## 7. Cuidados / Agenda

**Datos**
- tareas/recordatorios;
- estado/fechas;
- mascota relacionada.

**Clasificación**
Privado de cuenta/mascota salvo futura decisión contraria.

**Proveedor**
Supabase.

## 8. Documentos privados

**Datos**
- archivo;
- nombre original;
- MIME/tamaño;
- categoría/título;
- metadata de Storage.

**Clasificación**
Privado sensible.

**Proveedor**
Supabase private Storage + Database.

**Reglas**
- owner-only;
- URLs firmadas temporales;
- no contenido/filename en analytics;
- no session replay;
- lifecycle recuperable.

## 9. Search telemetry

**Datos**
- session id;
- tipo de evento;
- tipo de resultado/filtro;
- had_results;
- timestamps.

**No almacenar**
- query cruda;
- entity id;
- GPS;
- PII.

**Proveedor**
Supabase.

## 10. Product validation / Places telemetry

**Datos**
- module key/event type;
- session;
- contexto cerrado mínimo;
- timestamps.

**Reglas**
- deduplicación;
- sin contenido del usuario;
- sin PII innecesaria.

**Proveedor**
Supabase.

## 11. Error monitoring / product observability

**Estado**
Proyecto PostHog conectado y privacy settings aplicados; live ingestion pendiente (0 eventos ingeridos al checkpoint).

**Proveedor previsto**
PostHog.

**Datos permitidos**
- UUID interno;
- session id aleatorio;
- release/environment;
- eventos allowlisted;
- códigos de error;
- excepciones sanitizadas.

**Bloqueado por defecto**
- session replay;
- autocapture;
- PostHog GeoIP enrichment (`$geoip_disable=true` on PAZO events);
- email;
- teléfono;
- mensajes/posts/documentos;
- texto de búsqueda;
- GPS;
- tokens;
- datos de pago.

## 12. Pagos / Supporter

**Estado**
Checkout frontend desactivado. Webhook endurecido. Membresía no reactivada.

**Proveedor**
PayPal.

**PAZO puede almacenar**
- entitlement;
- subscription id/provider reference necesaria;
- estado derivado.

**PAZO no almacena**
- PAN/número de tarjeta;
- CVV;
- credenciales de PayPal.

**Pendiente**
- secretos reales;
- webhook Sandbox/Live;
- precio;
- beneficios;
- cancelación/UX;
- Privacy Policy/Terms.

## 13. Hosting / deployment

**Proveedor previsto/actual a verificar**
Vercel.

**Pendiente**
- proyecto exacto;
- env;
- logs;
- usage/spend controls;
- retención.

No afirmar prácticas públicas hasta verificar.

## 14. Client/local storage

Usos conocidos:
- sesión manejada por Supabase;
- session ids técnicos/telemetría;
- estado local no sensible cuando corresponda.

Antes de Beta:
- auditar localStorage/sessionStorage/cookies;
- documentar claves;
- eliminar datos legacy;
- decidir qué debe sobrevivir logout.

## 15. Retention matrix — pendiente F14

No fijar períodos inventados.

Debe cerrarse para:
- auth/account;
- UGC;
- deleted UGC;
- documents;
- rescue sightings/contact;
- care;
- telemetry;
- logs;
- backups;
- payment references.

## 16. Provider register

| Proveedor | Uso | Estado | Datos | Acción pre-Beta |
|---|---|---|---|---|
| Supabase | Auth/DB/Storage/Edge | Activo | múltiples categorías | retención/backups/Auth audit |
| Mapbox | mapas | Activo | requests/location-context según uso | usage/privacy/spend review |
| PayPal | Supporter | Parcial/desactivado en UX | subscription/payment metadata | secrets + real webhook + terms |
| PostHog | observabilidad | Conectado + privacy-hardened; 0 eventos live | eventos allowlisted/exceptions | env token + first event/error + destination/alert |
| Vercel | hosting/deploy | conector visible pero 0 teams/proyectos | deployment/log metadata | conectar cuenta/proyecto correcto antes de auditar env/spend |

Cualquier proveedor nuevo debe añadirse aquí antes de recibir datos de producción.

## 23. F14 D3-A — Limpieza de medios moderados, código preparado/no desplegado

El futuro servicio Edge `f14-moderation-purge` usará JWT de moderador validado por Auth, service_role solo en el servidor, kind/UUID del contenido retirado y ruta exacta de objeto recuperada desde DB interna; no se envían URLs, paths o datos personales a analytics ni logs de consola. Se verificará eliminación del origen con API Storage y dos probes HTTP, pero la invalidación global de CDN debe validarse y explicarse por separado. La interfaz permanece desactivada por defecto, SQL aún no aplicado y no se borraron objetos durante este lote. Sólo publicaciones Feed/Comunidad con propietario y referencia únicos; `pet_profile` y datos legacy requieren revisión manual. No añade proveedor.

## 24. Solicitud de eliminación de cuenta (código preparado, no aplicado)

Se planificó tabla privada con `subject_user_id` y estado/tiempos operativos, sin email ni descripción libre; RLS enabled y 3 RPC propias sin argumentos de user ID. Proveedor Supabase ya existente. No se ha activado ni recogido ninguna solicitud a través de esta interfaz. Conservación y procedimiento definitivo requieren acuerdo de política antes de Beta.

### 24.1 Estado real de solicitudes (2026-10-10 UTC)

Supabase tiene instalada la tabla privada `account_requests_private.deletion_requests` con `subject_user_id` y marcas temporales/estado. Tres RPCs de consulta/solicitud/cancelación validan `auth.uid()`; no exponen la tabla a clientes. Tras instalación y pruebas con `ROLLBACK` hay **0 solicitudes persistentes**. Todavía no se habilitó UI en la Beta ni existe worker autorizado para ejecutar eliminación. Retención, auditoría y borrado real permanecen decisiones pendientes.

### 24.2 Preflight de eliminación sin mutación

La consulta admin `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` cuenta dependencias por UUID interno solo para solicitudes propias registradas como `requested`. No registra emails, nombres de personas, documentos ni URLs en analytics, logs o salida pública. Cuenta relaciones externas de comunidades/Feed, documentos, moderación y objetos de Storage. No se publicó RPC de consulta a usuarios; el reporte es interno y no ejecuta eliminación. El frontend de solicitud/cancelación se habilita solo en entorno local `DEV`; producción sigue apagada. Los datos de prueba se mantienen.

### 24.3 Continuidad de comunidad en eliminación de cuenta

La migración propuesta NO APLICADA añade una tabla privada con IDs internos del grupo/propietario/admin candidato y plazos de transferencia (7 días), sin contenido ni email. Solo admin destinatario y owner pueden consultar una oferta; aceptación requiere JWT propio; nadie fuera del servidor puede archivar. Las comunidades archivadas conservan contenido de terceros en la base, pero no son públicas bajo la RLS vigente. No se habilita recolección nueva ni migración en este lote.

### 24.4 Transferencia consentida y archivo (propuesta aún inactiva)

La migración de continuidad añade a `community_private` únicamente metadatos de oferta (IDs internos del grupo/propietario/admin destinatario y fecha de vencimiento) y propuesta de relación de propietario nullable solo para archivo. El administrador designado no recibe poderes amplios de moderación ni acceso a archivos: solo puede aceptar/rechazar una transferencia destinada a su UUID bajo sesión autenticada. Comunidad archivada permanece en DB, con el contenido ajeno intacto, pero oculta bajo las RLS de lectura actuales. El ciclo de vida definitivo y la migración no han sido activados. Sin retención nueva de email, documentos ni analytics.

### 24.5 Estado real de continuidad — 2026-10-10

Instalada migración `20261010053708_f14_community_ownership_continuity` y tabla privada `community_private.ownership_transfer_offers`; 0 ofertas persistentes tras QA reversible. La tabla contiene IDs de comunidad, antiguo propietario y admin candidato, marcas de tiempo y estado; sin emails ni contenido. La interfaz de candidatura/aceptación solo se expone en QA local DEV y la aplicación productiva permanece con gate desactivado. Sin cambios ni borrado de contenido social o Storage en la instalación.

### 24.6 Integridad del borrado de cuenta — 2026-10-10

El preflight analiza interacciones Feed originadas por terceros (explícitas e impresiones), likes de comunidad, inconsistencias de autor de mascotas, media claims y URLs de medios sin equivalencia exacta en Storage. No se instrumentan nuevos eventos ni se exportan URLs/cuerpos/identidades. Los reportes agregados se reservan al operador. La revisión de seis cuentas detecta 8 referencias no verificadas y exige conciliación antes de cualquier borrado. No hay cambios permanentes al backend en este lote.

### 24.8 Hilos con autor eliminado: política aprobada, draft NO aplicado

La estructura propuesta `author_deleted_at` conserva únicamente el identificador de hilo, estado de anonimización, fecha y referencias a comentarios ajenos; reemplaza texto, imágenes, nombres, ubicación, etiquetas y metadatos de autor por valores neutrales. La baja de Auth/mascota no debe destruir esas respuestas por cascada. Los nuevos triggers impiden interacciones posteriores, incluyendo escrituras directas sin interfaz. La redacción sólo podrá usarse como parte de una solicitud de eliminación `processing` con Storage y archivos externos verificados fuera de SQL. No se ha instalado la migración ni borrado usuarios, comentarios ni medios. Seguridad de datos de terceras personas y procedimiento final de solicitudes siguen pendientes antes de beta pública.

## F14 A3 — revisión de baja supervisada (código y SQL NO APLICADO, 2026-10-10)

La preparación A3 en `src/features/account/deletionExecutionPlan.ts`,
`src/features/account/mediaManifest.ts` y
`supabase/drafts/20261010_f14_a3_supervised_review_NOT_APPLIED.sql`
modela **sin almacenar nuevos datos reales** una revisión privada del cierre de cuenta.

**Campos previstos del contrato de revisión (no instalados):**
- `subject_user_id` (UUID del solicitante, recuperado de una solicitud existente), `reviewer_user_id` (UUID interno del operador), hora de reautenticación reciente y revisión;
- fase, revisión monotónica, token/expiración de arrendamiento de operación y código sanitizado de incidencia;
- eventos mínimos `requested/blocked/reviewed/failed`, sin contraseña, correo, nombres de mascotas, nombres o rutas de archivos, URLs, ubicación, textos de posts ni contenido de documentos;
- agregados de preflight para contribuciones cruzadas, mascotas, cuidado, documentos y objetos Storage; los totales no autorizan borrados.

**Acceso previsto:** esquema `account_requests_private`, sin grants para `anon`/`authenticated` ni exposición al frontend. API de revisión solo para `service_role`, y gate humano exacto que requiere todavía verificación y aprobación. No se habilita telemetry ni sesión grabada.

**Pendiente legal:** duración y borrado de journal/lease de operador, políticas efectivas de retención de terceros, backups/logs y CDN. No publicar una garantía temporal ni conservar UUID eternamente por omisión. Ningún dato se ha borrado o recolectado por este cambio documental y de código.

### A3: prueba temporal de reautenticación (propuesta NO instalada, 2026-10-10)

El contrato SQL `20261010_f14_a3_supervised_review_NOT_APPLIED.sql` contempla conservar en tabla privada `reauth_session_id` (UUID interno de sesión de Auth) y `reauthenticated_at` por un periodo de validez de **cinco minutos como prueba activa**. El revisor solo puede consultar un booleano ligado a su lease. Reasignar la reserva borra la evidencia; al terminar/cancelar la baja se deberá definir y verificar borrado/retención del journal. No guardar contraseñas, OTP, acceso JWT, correos o nombres de archivos. La reautenticación todavía no está desplegada ni conectada al cliente.

### F14 A3 — inventario de congelación y medios (SOLO DRAFT, 2026-10-10)

Los contratos `supabase/drafts/20261010_f14_a3_write_fence_NOT_APPLIED.sql` proponen metadatos **no instalados**: `deletion_frozen_targets` (UUID de solicitante, tipo e ID técnico del objeto afectado), y `deletion_media_grants` (bucket, ruta privada exacta, versión de Storage, revisión/operador, token de lease, expiración de dos minutos y fecha de eliminación verificada). Estos datos serían operacionales sensibles, no públicos ni enviados a analítica. Al preparar la política final se necesita definir retención mínima, eliminación del journal y tratamiento de copia de seguridad; no reutilizar las rutas privadas ni tokens en logs. Ninguno de estos registros se ha creado en el Supabase hospedado.
