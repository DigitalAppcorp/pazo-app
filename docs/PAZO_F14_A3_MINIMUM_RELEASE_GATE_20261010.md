# PAZO — F14 A3 mínimo viable | Gate único para preparar implementación
**Fecha:** 2026-10-10  
**Estado:** PROPUESTA REVISABLE / A3 NO ACTIVADA. La conversación actual autoriza continuar la auditoría y el plan; **no** aplicar SQL, desplegar funciones, ejecutar bajas, borrar Storage ni Auth, hacer merge o intervenir Vercel. Antes de codificar un ejecutor de cuenta en la rama debe constar el gate explícito de implementación A3, distinto del permiso de ejecutar una baja real.

## 1. Objetivo de producto
Que una persona adulta pueda pedir desde PAZO el cierre de su cuenta y recibir un resultado verificable. Deben retirarse sus datos y objetos activos, con reglas de terceros y retención justificada; no declarar "eliminada" una cuenta por haber recibido la solicitud. La vía más rápida para el MVP es **ejecutor supervisado y reintentable**, no un complejo planificador autónomo. La supervisión NO reemplaza los requisitos de privacidad ni justifica una promesa de eliminación instantánea.

### Alcance que ya existe y se conserva
- UI: `src/features/account/DeletionRequestDialog.tsx` registra/cancela/consulta solicitudes. Explica que no borra todavía. Backend alojado: `public.pazo_deletion_request/status/cancel`, sin aceptar UUID objetivo del cliente, con comprobación `auth.uid()`, `SECURITY DEFINER SET search_path=''`; tabla `account_requests_private.deletion_requests` privada. El ejecutor es **inexistente**.
- PR #37 incluye modelos de preflight fail-closed y UI legal en borrador; tests, Auth, Feed y MapView aceptados anteriormente no se reconstruyen.
- PR #38 es divergente, con un modelo de preflight/lease/media manifest y múltiples SQL `NOT_APPLIED`; no se fusionará entero, no se habilitarán sus drafts o simulaciones como si fueran producción.
- `supabase/functions/f14-moderation-purge/index.ts` permanece bloqueado; **no** reutilizarlo como borrador de cuenta ni prometer revocación CDN.
- Política de producto F14 D2 aprobada: comunidad sin dueño se archiva y no destruye contribuciones ajenas; publicaciones del autor borrado se anonimizan como "Autor eliminado" solo cuando tienen comentarios de otras personas y se cumplen criterios de archivo/acceso.

## 2. Evidencia en Supabase alojado, solo lectura
Proyecto `mrybvqdebbgcayuvgkkr`, verificado 2026-10-10 tras la sesión real del PO:
- Auth **6**, perfiles **1**, mascotas **1**, posts **0**, comunidades **0**, comentarios Feed **0**, posts Comunidad **0**, documentos **0**, objetos Storage **1** (bucket `pet-avatars`); solicitudes de baja **0**.
- FK actual `communities.owner_user_id -> auth.users`: **ON DELETE SET NULL** (preflight antiguo de 2026-10-09 decía CASCADE; está desactualizado tras migración de continuidad). **No** inferir que la comunidad será archivada automáticamente al dejar propietario NULL: comprobar las guards/rutas públicas.
- Riesgos FK que siguen: `community_posts.author_user_id` y `community_posts.author_pet_id` usan CASCADE; `pet_documents.pet_id` RESTRICT; `care_items` / `care_completions` a mascotas NO ACTION; `pets.owner_id` a Auth NO ACTION. `posts` pueden tener comentarios cruzados. El orden de baja no puede ser `auth.admin.deleteUser` primero.
- No hay evidencia de job privado A3 de ejecución, cierre de medios o retirada de CDN; las tres RPC actuales son **intake** exclusivamente. No crear nueva cuenta ni borrar ninguna de las seis en el inventario de aprobación de alcance.

## 3. Implementación mínima propuesta (UN SOLO LOTE tras gate PO)
1. **Continuidad del intake existente:** mantener la solicitud idempotente; no inventar otro sistema de tickets ni exponer datos de terceros. Tras petición confirmada, exigir verificación reciente al entrar al flujo irreversible. En UI mostrar estado real, enlace de soporte/contacto **solo cuando el PO defina el destino real**, y permitir cancelar únicamente estados cancelables.
2. **Control servidor y preflight:** implementar una sola transición privada de solicitud a proceso con job durable e idempotente, identidad derivada de Auth y aprobación de operador autorizado; negar escrituras nuevas del solicitante desde RLS/RPC mientras está en proceso. Cliente nunca ve `service_role`, nunca envía `user_id` a un ejecutor privilegiado, nunca recibe la lista privada de otros usuarios.
3. **Protección de terceros:** comprobar contribuciones cruzadas con agregados y guardar únicamente lo indispensable para sus autores reales, oculto del público durante transición. Archivar comunidades sin dueño y no destruir posts o comentarios ajenos por cascada; tombstones `Autor eliminado` solo donde existan comentarios de terceros. Integrar el contrato de `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql` tras revisión: no aplicar ese draft automáticamente.
4. **Medios y dependencias:** inventario servidor exacto de referencias propias, rutas/buckets, dueño y compartición; borrar con **Storage API** usando credenciales solo en servidor, comprobar que el objeto desaparece en origen y registrar por etapa. Tratar caché/CDN y otras copias de manera diferenciada y honesta; si una validación falla mantener `retryable/blocked`, sin declarar éxito. Respetar documentos privados, cuidados, rescate QR y relaciones; no improvisar CASCADE ni borrar bucket.
5. **Auth al final:** solo con todas las etapas anteriores verificadas, invalidación/reconciliación de sesiones y auditoría/reintentos; invocar `auth.admin.deleteUser` desde servidor autorizado, verificar resultado y marcar `completed` solamente tras evidencias reales. No usar directamente DELETE SQL en `auth.users` para simular una baja.
6. **Sin cron ni nuevas dependencias:** ejecutor supervisado en fases reentrantes con un único punto de administración mínimo; no introducir schedulers, servicios pagados ni los 13 SQL del PR #38. Si el diseño no permite garantizar idempotencia, falla cerrado antes de activar.

**Entrega de código bajo Gate A3:** un PR/commit cohesionados en rama DRAFT con tests de rutas positivas/negativas, arquitectura y migración unificada **sin aplicar** (generada con CLI o procedimiento versionado conforme a AGENTS). Seguridad de RLS/roles/FKs y diff auditado. No fragmentar en decenas de sub-gates.

## 4. Prueba focalizada tras aprobación SEPARADA para DB/Edge/datos
- Usar cuentas **nuevas y expresamente autorizadas para prueba destructiva**, no eliminar las seis cuentas conservadas ni la mascota/único avatar actuales.
- Al menos 2 identidades: una solicita baja; la otra aporta comentario en post y contribuye a comunidad del solicitante; incluir avatar + foto Feed/Comunidad + documento privado + cuidado. Prueba una variante de error Storage, reintento, URL de medios después de borrar, doble petición/carrera, JWT caducado, ausencia de `service_role` cliente.
- Verificar vía SQL SELECT + HTTP real + Storage API: datos del solicitante ausentes en origen, ninguna publicación o miembro ajeno perdido, estado `completed` solo tras Auth final, acceso negado tras baja; no afirmar CDN global hasta observarlo. Si cualquier gate falla, no activar para público.
- No repetir suites funcionales históricas (splash, login, Feed, Lugares, Comunidades) excepto rutas afectadas y regresiones detectadas.

## 5. A4 legal y lanzamiento
- `LEGAL_RELEASE_READY=false` sigue así. Las metas D3-B de 30 días y otros plazos son decisiones de diseño todavía **no implementadas**; no presentarlas como garantías vigentes. Antes de Beta pública, PO debe confirmar operador/responsable legal, correo de privacidad verificable, fecha/versión, derechos, retenciones por categoría (datos activos, aportes ajenos, moderación, backups y logs), y manejo de CDN/proveedores.
- La limpieza total de fixtures pre-lanzamiento es **otro procedimiento**, no el ejecutor de autoservicio, y precisa inventario actualizado más autorización específica; se preservan estructura/roles/config.
- Ningún pase a main, Vercel, habilitación de media-purge, migración SQL o borrado se desprende del gate **de preparación de código**.

## 6. Decisión concreta solicitada al PO
> **Gate A3 mínimo — implementación en borrador:** Autorizar preparar en la rama del PR #37 el ejecutor supervisado seguro y su migración **sin aplicar**, reutilizando los componentes y tests útiles del PR #38. Está prohibido efectuar borrados o escrituras remotas, desplegar Edge, activar banderas, modificar Vercel o fusionar PRs hasta autorizaciones posteriores separadas.

**Criterio de éxito inmediato:** CI PASS de la implementación propuesta + revisión de diff/contratos y lista de cambios SQL que requerirán una aprobación única específica posterior. Mientras se espera ese gate, solo la solicitud y cancelación existentes están operativas.
