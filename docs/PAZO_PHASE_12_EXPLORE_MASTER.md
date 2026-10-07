# PAZO — Fase 12 — Explore/Search unificado

**Estado:** GATE 7 CERRADO — ARQUITECTURA LISTA / GATE 8 SIGUIENTE  
**Fecha:** 2026-10-07  
**Implementación autorizada:** SIGUIENTE — no mutar Supabase sin autorización explícita  
**Project Brain OS:** v1.3.0

## 1. Auditoría de estado real — Gate 0

### Frontend actual
`src/components/views/ExploreView.tsx` ya existe y no es un mock completo.

Real:
- Comunidades se cargan desde Supabase mediante `fetchCommunitySummaries`;
- un resultado de mascota puede aparecer indirectamente mediante `featuredPost` del Feed real;
- navegación a perfil público de mascota ya existe;
- detalle y membresía de Comunidades son reales.

Parcial / engañoso:
- el input dice “Mascotas, comunidades, eventos en LA...”;
- en realidad `searchQuery` solo filtra Comunidades ya cargadas;
- “Para ti” muestra como máximo una mascota derivada de un post disponible, no una búsqueda/recomendación de mascotas;
- la búsqueda de Comunidades se hace en cliente sobre el lote cargado, por lo que puede omitir resultados fuera de ese lote.

No real:
- búsqueda unificada de mascotas;
- búsqueda unificada de lugares;
- resultados de eventos;
- ranking global;
- paginación unificada;
- deep-link desde Explore a un lugar concreto del Mapa.

Eventos:
- la pestaña Eventos sigue siendo placeholder;
- no existe un modelo real de eventos autorizado para Fase 12.

### Backend reutilizable
Ya existen fuentes reales:

#### Mascotas
- `public.pets`: lectura pública por RLS;
- servicio actual solo carga mascotas owned;
- no existe `searchPublicPets`;
- campos privados como `zone`, `interests`, peso y dieta viven fuera de la tabla pública y no deben entrar en Search;
- una futura proyección de búsqueda debe seleccionar únicamente campos públicos mínimos.

#### Comunidades
- `public.communities`: lectura para usuarios authenticated;
- `fetchCommunitySummaries` tiene búsqueda server-side por nombre, pero Explore hoy carga sin search y filtra localmente otros campos;
- paginación offset/limit ya existe.

#### Lugares
- `public.pet_places`: active rows legibles por anon/authenticated;
- `fetchPlaces` ya permite búsqueda por nombre, zona y dirección;
- categorías y datos reales ya existen.

#### Posts
- el Feed real puede aportar señales de descubrimiento;
- los posts NO forman parte del alcance histórico de Fase 12 y no deben añadirse por inercia.

### Snapshot de densidad actual
Auditado en Supabase:
- mascotas: 4;
- posts: 14;
- comunidades activas: 1;
- lugares activos: 3.

Estos números son solo evidencia del estado actual, no límites de producto.

## 2. Gate 1 — Valor

### Usuario objetivo
Usuario autenticado de PAZO que quiere descubrir entidades reales sin tener que saber de antemano en qué módulo están.

### Problema
PAZO ya tiene contenido real repartido entre Feed, Comunidades y Mapa, pero Explore promete descubrimiento global sin cumplirlo. El usuario puede escribir una búsqueda que aparenta buscar mascotas, comunidades y eventos, aunque el resultado real se limita a Comunidades.

### Resultado prometido
Una superficie única que permita:
- encontrar mascotas;
- encontrar Comunidades;
- encontrar Lugares;
- navegar a la entidad real;
- entender claramente cuando un tipo de contenido todavía no existe.

### Por qué importa ahora
El requisito histórico “primero tener contenido real” ya se cumple parcialmente:
- mascotas reales;
- Feed real;
- Comunidades reales;
- Lugares reales.

Por eso Explore puede aportar utilidad real sin inventar contenido.

### Clasificación
**U / I con dependencia de contenido.**

- Utility: reduce fricción de descubrimiento.
- Infrastructure: puede convertirse en punto común de entrada a entidades existentes.
- Network effect: mejora con más contenido, pero no requiere masa crítica para funcionar.

**Gate 1: CERRADO — valor suficiente para seguir evaluando.**

## 3. Gate 2 — Coste y dependencias

### Frontend
Coste estimado: **medio-bajo**.

Ya existe:
- tab Explore;
- input;
- categorías;
- tarjetas;
- navegación a mascota;
- detalle de Comunidades.

Falta:
- modelo de resultados unificado;
- estados de loading/error/zero results por tipo;
- navegación a lugar desde Explore;
- filtros coherentes;
- separación entre “buscar” y “Para ti”.

### Backend
Coste estimado: **bajo a medio** para un MVP reducido.

No hacen falta tablas nuevas para buscar entidades existentes.

Necesario:
- servicio `searchPublicPets` con proyección segura;
- mejorar búsqueda de Comunidades para que no dependa de filtrar solo 20 resultados en cliente;
- reutilizar `fetchPlaces({ search })`;
- decidir estrategia de paginación por tipo.

No recomendado todavía:
- Elasticsearch/Algolia/Meilisearch;
- vector search;
- motor de ranking complejo;
- full-text global prematuro;
- nueva tabla agregada de search index.

### Índices actuales
- `pets`: PK + owner_id;
- `communities`: índices por status/category/species/created_at;
- `pet_places`: status/category y status/coordinates;
- no existen índices específicos de texto por nombre.

Con el volumen actual, `ILIKE` es suficiente. Si el catálogo crece, se puede considerar `pg_trgm` o full-text después de medir.

### Navegación
- mascota → perfil público: ya resuelto;
- comunidad → detalle: ya resuelto dentro de Explore;
- lugar → falta contrato para abrir Mapa con un `placeId` seleccionado desde Explore.

Ese deep-link interno es una dependencia real del MVP si Lugares entra en búsqueda.

### Privacidad
Riesgo: **bajo si se usa una proyección explícita**.

Reglas:
- no exponer `owner_id` como dato de UI;
- no usar `pet_private_details` para búsqueda;
- no buscar por ubicación privada de mascota;
- no mostrar `last_seen_location` salvo flujo de rescate correspondiente;
- no almacenar raw search query en analytics sin una decisión explícita de privacidad.

### Moderación
No añade una superficie de contenido nueva; solo descubre contenido existente.

Riesgo operativo: bajo-medio porque una búsqueda hace más visible contenido abusivo ya existente. Fase 14 de moderación sigue siendo necesaria antes de Beta pública.

### Eventos
No deben entrar en el núcleo real hasta que exista un módulo/event model real aprobado.

### Coste total
**Medio-bajo** si el MVP se limita a entidades existentes y resultados por tipo.

**Gate 2: CERRADO.**

## 4. Conclusión provisional antes de Gate 2.5

No recomiendo construir el alcance histórico completo tal como está escrito todavía.

La opción técnicamente sensata sería un **MVP REDUCIDO REAL**:
- mascotas;
- Comunidades;
- Lugares;
- resultados separados por tipo;
- navegación real;
- búsqueda textual simple;
- filtros mínimos;
- sin eventos;
- sin motor algorítmico complejo;
- sin search infrastructure externa.

Pero esta NO es todavía la decisión Gate 5.

Antes debe abrirse Gate 2.5 para capturar y auditar las ideas del Product Owner sobre qué debería significar “Explorar” en PAZO.

## 5. Gate 2.5 — Idea Bank ABIERTO

El Product Owner puede descargar ideas sin estructurarlas.

Para cada idea, Project Brain evaluará:
- problema/deseo;
- utilidad;
- atractivo inicial;
- recurrencia;
- engagement/retención;
- adquisición;
- monetización;
- dependencia de masa crítica;
- coste técnico;
- privacidad/moderación;
- encaje MVP;
- riesgo de novedad sin uso;
- alternativa más barata.

No convertir ideas automáticamente en features.

## 6. Gate 2.5 — Idea Bank entries

### I1 — Explore como búsqueda global de PAZO
**Origen:** Product Owner.  
**Estado:** APROBADA.

Idea:
- Explore no es un gran módulo de contenido;
- su función principal es buscar cualquier entidad disponible dentro de PAZO;
- ejemplos: mascotas/perfiles, Comunidades/grupos, Lugares y, cuando exista un módulo real, Eventos;
- el peso técnico está en la lógica de búsqueda y navegación, no en una pantalla grande.

Auditoría:
- encaje estratégico: ALTO;
- tipo: I + U;
- valor con un solo usuario: medio-alto;
- dependencia de masa crítica: baja para búsqueda, media para riqueza de resultados;
- coste MVP: medio-bajo;
- riesgo de moderación: bajo-medio;
- riesgo de privacidad: bajo si solo usa proyecciones públicas;
- recomendación: CANDIDATO FUERTE PARA MVP REDUCIDO.

Arquitectura conceptual recomendada:
- búsqueda federada por dominio, no índice global pesado inicialmente;
- un orquestador de Search lanza consultas en paralelo a providers de Mascotas, Comunidades y Lugares;
- cada provider controla sus campos públicos, filtros y ranking básico;
- la UI agrupa resultados por tipo y permite “Ver todos”;
- un provider de Eventos se añade solo cuando exista un modelo real de Eventos;
- si el volumen futuro lo exige, migrar después a pg_trgm/full-text o un motor externo sin cambiar la UX principal.

Nota de identidad — CERRADA:
El Product Owner aclaró que por “usuarios” se refería a **mascotas/perfiles públicos**. Search NO introduce perfiles humanos públicos ni búsqueda de cuentas humanas.

### I2 — Comunidades como módulo principal propio
**Origen:** Product Owner.  
**Estado:** APROBADA.

Idea:
- sacar Comunidades de Explore;
- darle un acceso principal equivalente a Feed, Mapa y Mi Mascota;
- reutilizar el slot actual de Explore en la barra inferior.

Navegación propuesta:
- Inicio;
- Comunidades;
- Crear;
- Mapa;
- Mi Mascota.

Auditoría:
- encaje con estado real: ALTO, porque Comunidades ya tiene backend, membresías, detalle y contenido;
- reduce acoplamiento conceptual entre Search y Comunidades;
- mejora la claridad de IA/navigation;
- coste frontend: bajo-medio;
- no requiere nueva infraestructura backend por sí sola.

### I3 — Mover Explore/Search al Header
**Origen:** Product Owner.  
**Estado:** APROBADA.

Idea:
- Explore deja la barra inferior;
- se convierte en botón de búsqueda global en el Header, junto a Mensajería y Notificaciones.

Auditoría:
- encaje conceptual: ALTO;
- búsqueda global funciona mejor como utility/action que como destino principal persistente;
- el Header actual ya contiene selector de idioma, Mensajes y Notificaciones;
- añadir Search es técnicamente viable, aunque la densidad móvil debe revisarse visualmente en Fase 13;
- alternativa futura: abrir Search como pantalla/modal full-screen conservando el botón en Header.

### Relación entre las tres ideas
Las tres propuestas son coherentes entre sí:

**Comunidades ocupa navegación primaria; Explore se transforma en Search global transversal.**

Esto resuelve la ambigüedad actual de Explore sin crear otro gran módulo.

---

## 7. Gate 3 — Experimento mínimo

Search es principalmente infraestructura/utilidad, por lo que no requiere fake door adicional.

La prueba mínima ya existía:
- Explore visible en navegación;
- input de búsqueda visible;
- Comunidades reales dentro de la superficie;
- navegación real a perfil público desde contenido recomendado.

La principal incertidumbre no era “¿la gente quiere una pantalla llamada Explore?”, sino **qué debe significar esa superficie y dónde debe vivir**.

Esa incertidumbre quedó resuelta por decisión del Product Owner:
- Search = búsqueda global;
- Comunidades = módulo principal propio;
- Search = acción global en Header;
- identidad buscable = mascotas/perfiles públicos, no humanos.

**Gate 3: CERRADO sin código adicional.**

## 8. Gate 5 — Decisión de inversión

**Resultado: MVP REDUCIDO.**

Razones:
- Search es infraestructura habilitadora;
- ya existen tres dominios reales que justifican su uso;
- corrige una promesa engañosa del Explore actual;
- el coste puede mantenerse bajo usando búsqueda federada;
- no requiere nueva entidad de contenido;
- no requiere motor externo;
- no necesita masa crítica para funcionar;
- la navegación de Comunidades queda conceptualmente más clara.

MVP aprobado:
- búsqueda global de mascotas;
- Comunidades;
- Lugares;
- filtros por tipo;
- navegación al módulo/entidad propietaria;
- Search accesible desde Header;
- Comunidades ocupa el slot inferior actual de Explore;
- arquitectura extensible para futuros providers.

Fuera del MVP:
- Eventos hasta que exista módulo real;
- posts;
- perfiles humanos;
- ranking ML;
- búsqueda semántica/vectorial;
- motor externo;
- tendencias;
- recomendaciones complejas.

## 9. Gate 6 — Especificación

Sub-ruta:
`docs/PAZO_PHASE_12_EXPLORE_MVP_SPEC.md`

El alcance funcional está definido allí.

**Gate 6: CERRADO.**

## 10. Gate 7 — Arquitectura

Sub-ruta:
`docs/PAZO_PHASE_12_EXPLORE_ARCHITECTURE.md`

Decisión:
- federated search;
- providers separados para Pets / Communities / Places;
- no índice global;
- no motor externo;
- deep-links internos definidos;
- una migración mínima solo para telemetría sin raw query;
- Supabase apply requiere autorización explícita.

**Gate 7: CERRADO.**

## 11. Estado

- Gate 0: CERRADO;
- Gate 1: CERRADO;
- Gate 2: CERRADO;
- Gate 2.5: CERRADO;
- Gate 3: CERRADO;
- Gate 5: MVP REDUCIDO;
- Gate 6: CERRADO;
- Gate 7: CERRADO;
- Gate 8: EN CURSO — frontend/search/deep-links implementados en PR #28; build/runtime/telemetry pendientes.

No implementar hasta cerrar Gate 7 — arquitectura técnica.


## 12. Gate 8 — checkpoint de implementación

Branch:
`feat/phase-12-global-search`

PR:
#28 — Draft.

Audited HEAD before local build:
`66c24b54d514ab8a9074c5b2a1c629707f929104`

Implemented:
- Global Search Header action;
- Communities bottom-nav module;
- federated Pets / Communities / Places Search;
- safe public pet projection;
- grouped filters/results;
- partial-failure tolerance;
- stale-response protection;
- deep-links to Pet / Community / Place;
- obsolete Explore container removed.

Pending:
- local `npm run build`;
- telemetry migration authorization/apply;
- backend QA;
- runtime + visual Product Owner QA;
- Scope Closure Reconciliation;
- PR #28 ready/merge;
- `main` verification.

Vercel checks are currently blocked by the account's daily build/deployment quota and do not constitute compilation evidence.
