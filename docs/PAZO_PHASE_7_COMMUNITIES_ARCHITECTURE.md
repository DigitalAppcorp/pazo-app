# PAZO — Fase 7 Comunidades — Arquitectura técnica MVP

**Estado:** GATE 7 — ARQUITECTURA TÉCNICA
**Fecha:** 2026-10-06
**Producto aprobado:** `docs/PAZO_PHASE_7_COMMUNITIES_MVP_SPEC.md`

## 1. Decisión principal

No extender `public.posts` para Comunidades.

El Feed global actual está acoplado a:
- recomendaciones;
- aprendizaje por tags;
- `interactions`;
- comentarios y contadores;
- lectura anónima;
- funciones RPC de recomendación;
- perfil de mascota.

Meter `community_id` ahí obligaría a cambiar contratos maduros y elevaría el riesgo de regresión.

Comunidades tendrá tablas sociales separadas y reutilizará componentes visuales cuando convenga.

### Límite MVP
Los posts creados dentro de una Comunidad:
- aparecen en esa Comunidad;
- NO aparecen automáticamente en Feed global;
- NO aparecen automáticamente en el perfil general de la mascota.

Compartir/cross-postear fuera de la Comunidad queda para validación futura.

---

## 2. Identidad

### Membership
Pertenece a la **cuenta**.

Una cuenta cuenta una sola vez como miembro aunque tenga varias mascotas.

### Identidad visible del miembro
`community_memberships.display_pet_id` guarda una mascota propiedad de esa cuenta para representar visualmente al miembro en la lista de miembros.

Al unirse:
- se usa la mascota activa;
- la cuenta sigue siendo la unidad de membership.

### Contenido
Posts, comentarios y likes se realizan con la **mascota activa**, siguiendo el contrato social existente de PAZO.

---

## 3. Tablas

### public.communities
- `id uuid PK`
- `owner_user_id uuid NOT NULL -> auth.users`
- `name text NOT NULL`
- `description text NOT NULL`
- `category text NOT NULL`
- `species text NULL` — NULL = todas
- `zone text NULL`
- `image_url text NULL`
- `rules text NULL`
- `status text NOT NULL DEFAULT 'active'` — active / archived
- `members_count integer NOT NULL DEFAULT 0`
- `created_at timestamptz`
- `updated_at timestamptz`

No DELETE del cliente en MVP. Archivar conserva historial.

### public.community_memberships
- `community_id uuid -> communities ON DELETE CASCADE`
- `user_id uuid -> auth.users ON DELETE CASCADE`
- `display_pet_id uuid -> pets`
- `role text NOT NULL` — owner / member
- `joined_at timestamptz`
- PK `(community_id,user_id)`
- unique parcial: un solo owner por comunidad.

El Owner no puede hacer Leave. Debe archivar la Comunidad.

### public.community_posts
- `id uuid PK`
- `community_id uuid -> communities ON DELETE CASCADE`
- `author_user_id uuid -> auth.users`
- `author_pet_id uuid -> pets`
- `body text NOT NULL DEFAULT ''`
- `photo_url text NULL`
- `photo_storage_path text NULL`
- `likes_count integer NOT NULL DEFAULT 0`
- `comments_count integer NOT NULL DEFAULT 0`
- `created_at timestamptz`

Debe existir texto o foto.

### public.community_post_comments
- `id uuid PK`
- `post_id uuid -> community_posts ON DELETE CASCADE`
- `author_pet_id uuid -> pets`
- `body text NOT NULL`
- `created_at timestamptz`

### public.community_post_likes
- `post_id uuid -> community_posts ON DELETE CASCADE`
- `actor_pet_id uuid -> pets ON DELETE CASCADE`
- `created_at timestamptz`
- PK `(post_id,actor_pet_id)`

Likes siguen el contrato de identidad por mascota activa.

---

## 4. Comportamientos de lifecycle

### Crear Comunidad
RPC `create_community(...)`:
- SECURITY INVOKER;
- valida que `display_pet_id` pertenezca a `auth.uid()`;
- crea Comunidad;
- crea membership owner en la misma transacción;
- devuelve community_id.

No usar SECURITY DEFINER público.

### Join
Insert en `community_memberships`:
- user_id = auth.uid();
- role = member;
- display_pet_id debe pertenecer a esa cuenta;
- Comunidad debe estar active.

### Leave
Delete de propia membership si role=member.

El contenido histórico del usuario permanece.

### Remove member
Owner elimina membership de un member.

En MVP el usuario retirado puede volver a unirse; un ban persistente pertenece al hardening/moderación futura.

### Archive
Owner cambia status a archived:
- desaparece de discovery;
- no acepta Join;
- no acepta contenido/interacciones nuevas;
- owner conserva acceso administrativo;
- no se borra historial.

---

## 5. RLS / permisos

### communities
Authenticated:
- SELECT: active; owner también puede ver archived propias.
- INSERT: solo owner_user_id = auth.uid().
- UPDATE: solo owner.
- DELETE: no grant.

Anon:
- sin acceso de tabla.

Cliente no puede actualizar:
- owner_user_id;
- members_count;
- created_at.

### community_memberships
Authenticated:
- SELECT: memberships de comunidades active; owner puede leer archived propia.
- INSERT: propia cuenta + mascota propia + comunidad active.
- DELETE:
  - propia membership member;
  - owner de comunidad puede retirar un member.
- UPDATE: solo `display_pet_id` propio, si la mascota pertenece a la cuenta.
- role no editable desde cliente.

### community_posts
Authenticated:
- SELECT: posts de comunidades active; owner puede ver propia archived.
- INSERT: membership requerida + mascota propia + comunidad active.
- DELETE:
  - autor del post;
  - owner de la comunidad.
- UPDATE: fuera del MVP.

### community_post_comments
Authenticated:
- SELECT si parent post es visible.
- INSERT: membership activa + mascota propia.
- DELETE:
  - autor;
  - owner de la comunidad.

### community_post_likes
Authenticated:
- SELECT únicamente likes creados por mascotas propias; el total proviene de `likes_count`.
- INSERT/DELETE: membership activa + mascota propia.

Service role/postgres:
- administración completa.

---

## 6. Normalización y contadores

Funciones trigger privadas:

- normalizar `communities.updated_at`;
- normalizar/validar community post antes de INSERT;
- normalizar comentario;
- incrementar/decrementar `members_count`;
- incrementar/decrementar `likes_count`;
- incrementar/decrementar `comments_count`.

Los contadores son server-owned.

Funciones trigger privadas pueden ser SECURITY DEFINER cuando necesiten actualizar contadores, con:
- schema privado;
- `search_path=''`;
- REVOKE EXECUTE de PUBLIC/anon/authenticated.

No añadir SECURITY DEFINER público.

---

## 7. Storage

### community-avatars
- public bucket;
- máximo 5 MB;
- JPEG/PNG/WEBP;
- path: `<community_id>/<user_id>/<uuid>.<ext>`;
- INSERT/DELETE solo owner de la comunidad.

### community-post-photos
- public bucket;
- máximo 5 MB;
- JPEG/PNG/WEBP;
- path: `<community_id>/<user_id>/<uuid>.<ext>`;
- INSERT solo member activo y user folder = auth.uid();
- DELETE:
  - dueño del archivo;
  - owner de la comunidad.

Se usan buckets públicos porque el contenido del MVP no se considera privado y el producto actual ya usa media social pública.

**Restricción:** comunidades privadas futuras requieren rediseñar media/access; no se agregan reutilizando ciegamente estos buckets.

---

## 8. Índices mínimos

### communities
- `(status, created_at DESC)`
- `(owner_user_id)`
- `(category, status)`
- `(species, status)`

### community_memberships
- PK cubre `community_id,user_id`
- `(user_id, joined_at DESC)`

### community_posts
- `(community_id, created_at DESC)`
- `(author_pet_id, created_at DESC)`

### comments
- `(post_id, created_at)`
- `(author_pet_id)`

### likes
- PK `(post_id,actor_pet_id)`
- `(actor_pet_id)`

No añadir índices especulativos fuera de queries reales.

---

## 9. Paginación

- discovery communities: 20;
- community posts: 20;
- members: 30;
- comments: 20.

Orden estable:
- `created_at DESC, id DESC` donde aplique.

No cargar una comunidad completa en memoria.

---

## 10. Frontend

Nuevos contratos:

- `CommunitySummary`
- `CommunityDetail`
- `CommunityMembership`
- `CommunityPost`
- `CommunityPostComment`

Servicio:
- `src/services/communityService.ts`

Pantallas/componentes:
- Explorar conserva diseño canónico del Product Owner;
- Community tab consume datos reales;
- Community Detail;
- Create Community modal;
- Community Post composer;
- Members / Info;
- acciones de administración básica.

Reutilizar estilo/componentes del Feed, pero no compartir estado global de `posts`.

---

## 11. Moderación MVP

Real:
- owner puede retirar posts;
- owner puede retirar comments;
- owner puede retirar members;
- reglas visibles;
- autor puede eliminar su contenido;
- owner badge funcional.

No real todavía:
- ban persistente;
- report system;
- block;
- automoderación;
- moderator role.

Antes de Beta pública, Fase 14 debe completar confianza/moderación global.

---

## 12. Experimentos dentro del módulo

La infraestructura genérica ya aplicada se conserva.

Extensiones candidatas se registran como module keys separadas cuando se activen, por ejemplo:
- `communities_events`
- `communities_badges`
- `communities_challenges`
- `communities_admin_tools`

No crear todas ahora.

Solo registrar un experimento cuando su resultado cambie una decisión.

---

## 13. Métricas

Derivables del modelo real:
- communities creadas;
- joins;
- member counts;
- posts;
- comments;
- likes;
- comunidades con actividad.

Visitas/revisitas pueden usar la infraestructura genérica de views.

Antes de medición real:
- limpiar señales de prueba existentes de Communities con autorización explícita.

Baseline actual detectado:
- 2 community views;
- 1 community interest;
- 0 intents.

Se consideran datos de prueba/contaminados.

---

## 14. Seguridad baseline

Antes de migración Communities:

Security Advisor:
- 3 anon SECURITY DEFINER warnings existentes;
- 6 authenticated SECURITY DEFINER warnings existentes;
- Leaked Password Protection pendiente.

Performance:
- 11 unused indexes info, incluyendo 2 del sistema de validación recién creado.

Gate 8 no debe añadir nuevos warnings de seguridad atribuibles a Comunidades.

---

## 15. Migración

Preparar una migración nueva, sin reescribir historial:

`supabase/migrations/<timestamp>_communities_mvp_core.sql`

La migración debe:
1. crear tablas;
2. constraints;
3. índices;
4. RLS;
5. grants mínimos;
6. funciones/triggers privadas;
7. función SECURITY INVOKER de create community;
8. buckets;
9. Storage policies.

No aplicar hasta:
- build local PASS;
- diff revisado;
- SQL revisado;
- autorización explícita Product Owner.

---

## 16. Pruebas post-apply

Con rollback cuando aplique:

- anon no lee/escribe tablas;
- authenticated ve comunidades active;
- non-owner no edita comunidad;
- create community crea owner membership atómicamente;
- display_pet_id ajeno rechazado;
- join deduplicado;
- owner no puede Leave;
- member sí puede Leave;
- owner puede retirar member;
- non-owner no puede retirar otros;
- solo member publica/comenta/like;
- mascota ajena rechazada;
- post/comment propio borrable;
- owner puede moderar contenido de otros;
- counters exactos bajo insert/delete repetido;
- archived bloquea nueva actividad;
- Storage bloquea paths ajenos;
- owner puede limpiar media moderada;
- Advisors sin findings nuevos;
- pruebas de F1–F6/9A/9B no sufren regresiones.

---

# Gate 7 — decisión

Arquitectura recomendada:
**tablas sociales aisladas + membership por cuenta + identidad visible por mascota + contenido solo dentro de Comunidad.**

Tras cerrar este Gate se entra a Gate 8 y se prepara código/migración, sin tocar Supabase hasta autorización.
