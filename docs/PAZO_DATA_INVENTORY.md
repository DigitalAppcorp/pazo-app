# PAZO — Data & Third-Party Inventory

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

## 17. Eliminación de cuenta y conservación privada de aportaciones ajenas — F14 A3 DRAFT

**Estado de tratamiento:** **PROPUESTA NO ACTIVADA**. Las tablas/RPC y el coordinador del PR #38 son únicamente código en GitHub y SQL `supabase/drafts/` con aborto explícito. Ninguna solicitud ni archivo privado de eliminación está operando en Supabase hospedado.

**Categorías previstas en el backend si el PO autoriza activar A3:**
- `account_private.deletion_jobs`: id interno del job, referencia al usuario que lo solicitó, estado, fecha de recepción, fecha de actualización; clasificación **privada de cuenta y operativa sensible**;
- `account_private.deletion_events`: bitácora mínima por job/acción/fecha y razones sanitizadas, sin email/textos originales;
- `account_private.deletion_post_tombstones`: identificador de relación + fecha de post desidentificado, sin texto/fotografía/nombre del titular;
- `account_private.deletion_preserved_posts` y `deletion_preserved_comments`: **contenido UGC de otras cuentas**, autores internos, fechas y relaciones con posts/comunidades; se trata como **contenido privado de archivo sensible** después del cierre del propietario. No exponer como Feed público, resultados de búsqueda, analytics, ni a expropietarios;
- `account_private.deletion_worker_leases`: identificador job, token/version/expiración de exclusión; **secreto operacional** exclusivo de servicio, nunca en cliente/telemetría;
- inventario de archivos por bucket/ruta/versión requerirá categoría privada de metadata, sin almacenar bytes en logs.

**Finalidad:** atender solicitudes verificadas sin borrar aportaciones ajenas y permitir recuperación idempotente; no analítica, monetización ni reutilización de UGC. **Proveedor propuesto:** Supabase DB/Auth/Storage ya conectado; no se añade tercero.

**Acceso/seguridad pretendido:** `account_private` no expuesto en Data API; RLS habilitada y grants revocados a `anon`/`authenticated`, RPC de solicitante limitado a estado/cantidades propias, operación de archivo y lease solamente `service_role`. Auditoría de claims/ACL y prueba real con JWT todavía pendientes. Nunca service-role en navegador.

**Retención:** las metas D3-B del PO para aportaciones archivadas (revisión a 90 días y resolución humana antes de 180 días) NO están implementadas ni contrastadas con proveedores. Políticas públicas NO deben prometer esos plazos. El cierre masivo de los datos actuales de prueba pre-lanzamiento es una operación distinta y requerirá inventario/autorización propia.

**Bloqueos:** congelación real de escrituras, verificación de D3-A Storage/CDN, archive de comentarios/likes legacy y referencias, sesión antigua, Auth al final, control de backups y pruebas de borrado. Ningún worker destructivo se ha desplegado.

## 18. Protección de escrituras y FK en eliminación — A3 DRAFT, NO ACTIVA

Se propusieron guardias DB de escritura por propietario/contraparte en 11 tablas y una ruta de archivo `archived` para comunidades, bajo SQL **no aplicado** del PR #38. No existe nueva recolección ni tercer proveedor. Los guards harán consulta privada de trabajos de borrado y utilizarán locks transaccionales asociados a UUID de cuenta; nunca deben exponer estado de terceros a un cliente. Las migraciones todavía NO gobiernan el Supabase alojado. No afirmar al público que se congelan escrituras ni que comunidades sin dueño se archivan automáticamente. Los bloqueos legales/operacionales D3-A, sesión y retención continúan.
