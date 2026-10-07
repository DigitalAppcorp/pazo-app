# PAZO — Fase 12 — Global Search / Explore — Arquitectura técnica

**Estado:** GATE 7 CERRADO  
**Fecha:** 2026-10-07  
**Producto:** `docs/PAZO_PHASE_12_EXPLORE_MVP_SPEC.md`  
**Implementación:** SIGUIENTE — Gate 8  
**Supabase production mutation:** NO AUTORIZADA TODAVÍA

## 1. Principio

Global Search será una capa federada de descubrimiento, no un índice central.

Cada dominio conserva su fuente de verdad y sus reglas:
- Mascotas → `pets`;
- Comunidades → `communities`;
- Lugares → `pet_places`.

Search:
1. recibe una consulta;
2. ejecuta providers en paralelo;
3. normaliza resultados;
4. tolera fallos parciales;
5. navega al módulo propietario.

No crear:
- tabla de índice global;
- RPC de búsqueda privilegiado;
- Edge Function;
- vector search;
- motor externo.

## 2. Contrato común

Nuevo tipo conceptual:

```ts
type SearchEntityType = 'pet' | 'community' | 'place'

interface GlobalSearchResult {
  type: SearchEntityType
  id: string
  title: string
  subtitle?: string
  imageUrl?: string
  meta?: string[]
}
```

Los providers pueden trabajar con sus tipos internos, pero el orquestador devuelve este contrato a la UI.

No incluir:
- `owner_id`;
- datos privados;
- coordenadas de usuario;
- query original como metadata persistida.

## 3. Estructura de frontend

### 3.1 Feature
Crear:
- `src/features/search/types.ts`;
- `src/features/search/searchService.ts`;
- `src/features/search/searchTelemetryService.ts`.

### 3.2 Vista
Crear:
- `src/components/views/GlobalSearchView.tsx`;
- `src/components/views/CommunitiesView.tsx`.

`ExploreView.tsx` deja de ser la superficie principal. Su lógica real de Comunidades se mueve/refactoriza a `CommunitiesView.tsx`.

No reescribir CommunityDetailView ni servicios de Comunidades.

### 3.3 Navegación
`BottomNav.NavTab` cambia de:

```ts
'inicio' | 'explorar' | 'mapa' | 'mascota'
```

a:

```ts
'inicio' | 'comunidades' | 'mapa' | 'mascota'
```

Orden:
- Inicio;
- Comunidades;
- Crear;
- Mapa;
- Mi Mascota.

Header:
- conservar idioma;
- añadir Search;
- Mensajes;
- Notificaciones.

Añadir icono Search explícito. No reutilizar un icono ambiguo si existe uno específico o puede añadirse al set actual.

## 4. Orquestador de búsqueda

`searchGlobal(query)` ejecuta en paralelo:

- `searchPublicPets(query)`;
- `searchCommunities(query)`;
- `searchPlaces(query)`.

Usar `Promise.allSettled`.

Razón:
un fallo en Lugares no debe ocultar resultados válidos de Mascotas o Comunidades.

Respuesta conceptual:

```ts
interface GlobalSearchResponse {
  pets: GlobalSearchResult[]
  communities: GlobalSearchResult[]
  places: GlobalSearchResult[]
  failedTypes: SearchEntityType[]
}
```

## 5. Consulta y concurrencia

UI:
- normalizar/trim;
- longitud máxima: 80 caracteres;
- debounce aproximado: 300 ms;
- no ejecutar con consulta vacía;
- conservar request sequence incremental;
- ignorar respuestas antiguas si una consulta más nueva ya comenzó.

No es obligatorio abortar requests para el MVP; sí es obligatorio evitar stale-response overwrite.

## 6. Sanitización

Supabase/PostgREST documenta que `.or()` usa sintaxis raw y debe sanitizarse.

Si un provider usa `.or()`:
- normalizar Unicode;
- eliminar caracteres de sintaxis PostgREST no necesarios;
- permitir letras, números, espacios y guion;
- colapsar espacios;
- truncar a 80 caracteres.

Nunca insertar texto crudo del usuario dentro de una expresión `.or()`.

## 7. Provider — Mascotas

Fuente:
`public.pets`.

RLS:
- `pets_public_read` permite SELECT de filas;
- permisos efectivos de columnas públicas ya están limitados.

Columnas públicas utilizables en Search:
- `id`;
- `name`;
- `species`;
- `age`;
- `photo_url`;
- `created_at`;
- `bio`;
- `breed`;
- `gender`;
- `is_lost`.

Excluir expresamente:
- `owner_id` de la UI;
- `zone`;
- `interests`;
- `weight`;
- `dietPlan`;
- `last_seen_location`.

Los grants actuales ya bloquean SELECT público de `zone`, `interests` y `weight`; Search debe mantener además una proyección explícita de columnas.

Búsqueda MVP:
- nombre;
- especie;
- raza.

Resultado:
- título: nombre;
- subtítulo: especie + raza cuando exista;
- imagen: `photo_url`.

Destino:
`PublicProfileView(targetPetId)`.

## 8. Provider — Comunidades

Fuente:
`public.communities`.

Acceso:
- SELECT para `authenticated`;
- Search real requiere sesión autenticada.

Campos de búsqueda:
- nombre;
- categoría;
- especie;
- zona.

Solo:
- `status = 'active'`.

Resultado:
- nombre;
- descripción breve;
- categoría/especie;
- miembros;
- imagen.

No necesita cargar memberships para presentar un resultado de Search.

Destino:
módulo Comunidades + `communityId` seleccionado.

## 9. Provider — Lugares

Fuente:
`public.pet_places`.

Reutilizar la semántica ya existente de `fetchPlaces({ search })`:
- nombre;
- zona;
- dirección;
- solo active.

Search no necesita:
- presencia;
- check-ins;
- ubicación del dispositivo.

Resultado:
- nombre;
- categoría;
- zona/dirección;
- foto.

Destino:
Mapa + lugar seleccionado.

## 10. Ranking

MVP: ranking determinista dentro de cada provider.

Prioridad:
1. nombre exacto;
2. nombre inicia con consulta;
3. nombre contiene consulta;
4. coincidencia en campo secundario.

Luego:
- título alfabético como desempate estable.

No crear score global entre tipos.

Search muestra grupos por dominio.

## 11. Límites y “Ver todos”

Cada provider puede recuperar una ventana pequeña suficiente para ranking local.

Objetivo inicial:
- hasta 20 candidatos por provider;
- vista agrupada muestra hasta 5;
- filtro específico puede mostrar el resto de esa ventana.

No implementar paginación infinita en MVP.

Disparador futuro:
si el catálogo supera el comportamiento razonable de esta ventana, añadir paginación cursor/offset por provider.

## 12. Deep-link interno desde Search

`GlobalSearchView` no debe conocer detalles internos de cada módulo.

Props/callbacks:
- `onSelectPet(petId)`;
- `onSelectCommunity(communityId)`;
- `onSelectPlace(placeId)`;
- `onClose()`.

### App.tsx
App sigue siendo coordinador de navegación.

Mascota:
1. cerrar Search;
2. abrir `PublicProfileView`.

Comunidad:
1. cerrar Search;
2. `activeTab = 'comunidades'`;
3. emitir request `communityId + requestKey`.

Lugar:
1. cerrar Search;
2. `activeTab = 'mapa'`;
3. emitir request `placeId + requestKey`.

Usar un contador/request key para permitir abrir repetidamente la misma entidad.

## 13. CommunitiesView

Refactorizar la funcionalidad real actualmente alojada en Explore:

Conservar:
- lista real;
- crear Comunidad;
- membership;
- detalle;
- publicaciones y flujo existente.

Eliminar del módulo:
- “Para ti”;
- búsqueda global;
- pestaña Eventos placeholder.

`CommunitiesView` acepta:
- `currentPet`;
- `canUseCommunities`;
- `createCommunityRequestKey`;
- `requestedCommunityId?`;
- `requestedCommunityKey?`;
- `lang`.

Cuando cambia el request key:
- abre directamente la Comunidad solicitada si existe.

## 14. MapView deep-link

Extender props:
- `requestedPlaceId?`;
- `requestedPlaceKey?`.

Después de cargar catálogo:
- si existe request;
- localizar place por id;
- limpiar filtros/search locales si impiden mostrarlo;
- seleccionar el lugar;
- dejar a Mapbox hacer flyTo mediante `selectedPlaceId`.

No duplicar fetch de detail si el lugar ya está en el catálogo cargado.

## 15. Search UI state

`GlobalSearchView` mantiene:
- `query`;
- filtro `all | pet | community | place`;
- loading;
- respuesta por grupos;
- fallos parciales;
- request sequence.

Estado vacío:
- consulta vacía → instrucciones;
- consulta sin match → no results;
- fallo parcial → resultados válidos + aviso por categoría;
- fallo total → retry.

## 16. Demo / sesión

Usuario objetivo del MVP: sesión autenticada real.

Motivo:
Comunidades solo permite SELECT a `authenticated`.

Para demo/no-auth:
- no ejecutar búsqueda federada incompleta como si fuera equivalente;
- Search puede mostrar CTA de autenticación / estado no disponible.

No cambiar RLS de Comunidades solo para soportar demo.

## 17. Telemetría

Las tablas de validation existentes no modelan correctamente:
- búsqueda ejecutada;
- resultado abierto;
- filtro.

Por tanto Gate 8 prepara una tabla dedicada mínima:

`public.search_usage_events`

Campos:
- `id uuid PK`;
- `user_id uuid default auth.uid()`;
- `session_id uuid`;
- `event_type text`;
- `result_type text nullable`;
- `filter_type text nullable`;
- `had_results boolean nullable`;
- `created_at timestamptz`.

Eventos permitidos:
- `search_open`;
- `search_execute`;
- `search_result_open`;
- `search_filter_change`.

Restricciones:
- NO query text;
- NO entity id;
- NO owner id;
- NO GPS;
- insert own only;
- no client SELECT;
- service_role conserva lectura para analytics.

Esta era la mutación funcional prevista. Tras el apply, Performance Advisor exigió una corrección forward para indexar el FK `user_id`.

Requiere autorización explícita del Product Owner antes de apply.

## 18. Índices de texto

No crear índices textuales ni `pg_trgm` ahora.

Evidencia actual:
- 4 mascotas;
- 1 Comunidad activa;
- 3 Lugares activos.

La infraestructura debe escalar primero por medición.

Disparador de revisión:
- crecimiento significativo por dominio;
- latencia percibida o p95 de búsqueda no aceptable;
- consultas con EXPLAIN que justifiquen índice.

Entonces evaluar:
- `pg_trgm`;
- full-text;
- motor externo solo si Postgres deja de ser suficiente.

## 19. Seguridad

No usar:
- `SECURITY DEFINER`;
- service role en cliente;
- vista que bypass RLS;
- query global con datos privados.

Cada provider consulta directamente su tabla bajo RLS/grants existentes.

Telemetría:
- RLS enabled;
- INSERT own;
- grants mínimos;
- Security Advisor después del apply.

## 20. Migración prevista

Gate 8 aplicó:
- `20261007102632 phase_12_search_telemetry` para `search_usage_events`, constraints, grants y RLS/policy;
- `20261007102748 index_search_usage_events_user` como corrección forward del FK detectado por Performance Advisor.

No tocar:
- `pets`;
- `communities`;
- `pet_places`;
- migrations aplicadas anteriores.

## 21. Build / pruebas técnicas

Antes de pedir apply:
- TypeScript build PASS;
- búsqueda Pets PASS;
- Comunidades PASS;
- Lugares PASS;
- fallo parcial simulado PASS;
- stale results protegidos;
- navegación Pet PASS;
- navegación Community PASS;
- navegación Place PASS;
- demo/no-auth seguro;
- diff auditado;
- migration SQL revisada.

Después de autorización y apply:
- insert telemetry own PASS;
- anon blocked;
- authenticated cannot SELECT telemetry;
- invalid event rejected;
- Security Advisor sin findings nuevos atribuibles.

## 22. Runtime Product Owner

Gate 8 no cierra hasta verificar:
- Search aparece en Header;
- Comunidades aparece en bottom nav;
- búsqueda encuentra una mascota real;
- búsqueda encuentra Comunidad real;
- búsqueda encuentra Lugar real;
- cada resultado abre su destino correcto;
- volver/cerrar no pierde navegación;
- búsqueda sin resultados es clara;
- F5 no rompe módulos reales existentes;
- Feed, Mapa, Comunidades y Mi Mascota siguen funcionando.

## 23. Definition of Done — Gate 7

Arquitectura cerrada:

- búsqueda federada;
- providers separados;
- contrato común;
- `Promise.allSettled`;
- stale-response guard;
- no motor externo;
- no índice central;
- proyección pública segura de Pets;
- Comunidades sin reescritura;
- deep-link interno definido;
- Search global en Header;
- Comunidades en bottom nav;
- telemetría sin raw query;
- una sola migración prevista;
- plan de pruebas y cierre definido.

**Gate 7: CERRADO.**

Siguiente:
**Gate 8 — implementación en rama, migración preparada pero NO aplicada sin autorización.**
