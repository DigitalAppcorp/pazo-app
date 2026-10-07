# PAZO — Fase 12 — Global Search / Explore — MVP de producto

**Estado:** GATE 6 CERRADO  
**Fecha:** 2026-10-07  
**Decisión de inversión:** MVP REDUCIDO  
**Implementación autorizada:** NO — Gate 7 pendiente

## 1. Objetivo

Convertir Explore en la **búsqueda global de PAZO**.

Search no será un módulo grande de contenido. Será una utilidad transversal para encontrar entidades reales de PAZO y llevar al usuario al módulo propietario correspondiente.

Ciclo mínimo:

**abrir Buscar → escribir consulta → ver resultados reales por tipo → abrir entidad → continuar dentro de su módulo**

## 2. Navegación aprobada

### Barra inferior
La navegación principal queda conceptualmente:

- Inicio;
- Comunidades;
- Crear;
- Mapa;
- Mi Mascota.

Comunidades ocupa el slot actual de Explore.

### Header
Search pasa al Header como acción global junto a:
- Mensajes;
- Notificaciones.

El selector de idioma se conserva mientras siga existiendo en el producto.

### Comportamiento
Al tocar Buscar:
- se abre una superficie dedicada de búsqueda;
- conserva el contexto anterior para poder cerrarse/volver;
- Search no duplica los módulos propietarios.

## 3. Entidades buscables en MVP

### Mascotas
Buscar perfiles públicos de mascotas.

Mostrar solo información pública necesaria:
- foto;
- nombre;
- especie;
- raza cuando exista;
- bio corta cuando ayude a distinguir resultados.

Nunca tratar la cuenta humana como perfil público buscable.

No usar:
- owner_id como dato visible;
- datos de `pet_private_details`;
- peso;
- dieta;
- intereses privados;
- ubicación privada;
- last_seen_location salvo flujo específico de rescate.

Acción:
- tocar resultado → abrir perfil público de la mascota.

### Comunidades
Buscar Comunidades reales activas.

Campos útiles:
- imagen;
- nombre;
- descripción corta;
- categoría;
- especie cuando aplique;
- número de miembros.

Acción:
- tocar resultado → abrir módulo Comunidades directamente en esa Comunidad.

### Lugares
Buscar Lugares reales activos.

Campos útiles:
- foto;
- nombre;
- categoría;
- zona;
- dirección.

Acción:
- tocar resultado → abrir Mapa con ese lugar seleccionado y su detalle disponible.

## 4. Futuras entidades

La experiencia debe poder incorporar nuevos providers sin rediseñar Search.

Ejemplos futuros:
- Eventos;
- Adopciones;
- Servicios;
- negocios;
- otros módulos reales de PAZO.

Regla:
**una entidad solo entra a Search cuando su módulo y su fuente de verdad existen realmente.**

No mostrar categorías vacías/ficticias para módulos que aún no existen.

## 5. Posts

Los posts quedan fuera del MVP de Global Search.

Razones:
- Feed ya es la superficie de descubrimiento de publicaciones;
- buscar contenido textual aumenta ranking, volumen y moderación;
- no es necesario para demostrar el valor de Search global.

Puede añadirse como provider futuro si existe una razón de producto.

## 6. Experiencia de búsqueda

### Estado inicial
Al abrir Search sin consulta:
- input enfocado o listo para escribir;
- texto claro: buscar mascotas, Comunidades y Lugares;
- no inventar tendencias ni búsquedas populares.

### Consulta
La búsqueda textual debe funcionar de forma tolerante a mayúsculas/minúsculas.

No requiere búsqueda semántica.

### Resultados
Por defecto se agrupan por tipo:
- Mascotas;
- Comunidades;
- Lugares.

Cada grupo puede mostrar un conjunto corto inicial y permitir **Ver todos** cuando existan más resultados.

### Filtros mínimos
- Todos;
- Mascotas;
- Comunidades;
- Lugares.

No añadir filtros avanzados en MVP.

### Sin resultados
Mostrar estado explícito:
- “No encontramos resultados para …”
- sugerir revisar escritura o cambiar tipo;
- no fabricar recomendaciones irrelevantes.

### Loading
Mostrar feedback de carga sin bloquear toda la app.

### Error parcial
Si un provider falla y otros funcionan:
- mostrar resultados disponibles;
- indicar que una categoría no pudo cargarse;
- no convertir un fallo parcial en pantalla vacía total.

## 7. Ranking MVP

Ranking simple, determinista y por dominio.

Prioridad conceptual:
1. coincidencia exacta de nombre;
2. nombre que empieza con la consulta;
3. nombre que contiene la consulta;
4. campos secundarios permitidos por el provider.

No mezclar scores incomparables de distintas entidades para un ranking global complejo.

Por eso el MVP agrupa por tipo.

## 8. Privacidad

Search solo puede leer superficies que ya son públicas/legibles según las reglas de cada módulo.

Reglas:
- no indexar campos privados;
- no usar ubicación privada de mascotas;
- no convertir datos internos de cuenta en metadata de resultado;
- no persistir la consulta cruda del usuario en analytics durante MVP;
- métricas iniciales deben guardar eventos/contadores mínimos, no texto sensible.

## 9. Métricas

Métricas mínimas:
- aperturas de Search;
- búsquedas ejecutadas;
- búsquedas con resultado / sin resultado;
- tipo de resultado abierto;
- navegación exitosa a entidad;
- filtro utilizado.

No guardar raw query text por defecto.

Si después se necesita analizar qué busca la gente, requerirá una decisión explícita de privacidad/telemetría.

## 10. Comunidades como módulo propio

Mover Comunidades fuera de Explore NO significa reescribir el módulo.

Debe reutilizar:
- servicios;
- detalle;
- memberships;
- creación;
- posts;
- experimentos ya existentes.

El cambio de Fase 12 es de entrada/navegación e integración, no una reconstrucción de Comunidades.

## 11. Search no duplica destinos

Search es un router de descubrimiento.

- Mascota → perfil público;
- Comunidad → módulo Comunidades / detalle;
- Lugar → Mapa / lugar seleccionado.

Cerrar/volver desde el destino sigue las reglas normales del módulo propietario.

## 12. Fuera del MVP

- perfiles humanos públicos;
- Eventos sin módulo real;
- posts;
- mensajes;
- documentos privados;
- cuidados;
- notificaciones;
- ranking ML;
- recomendaciones personalizadas;
- historial de búsquedas;
- búsquedas populares;
- autocompletado complejo;
- búsqueda semántica;
- embeddings/vector DB;
- Algolia/Elasticsearch/Meilisearch;
- mapas dentro de Search;
- nuevos datos privados para mejorar resultados.

## 13. Definition of Done — Gate 6

Producto queda definido cuando:

- Search representa búsqueda global, no contenido propio;
- Comunidades queda como destino principal independiente;
- botón Search vive en Header;
- identidad buscable = mascotas/perfiles públicos;
- MVP busca Mascotas + Comunidades + Lugares;
- resultados navegan a entidades reales;
- eventos/posts quedan fuera;
- privacidad de mascota se conserva;
- estados loading/error/empty están definidos;
- métricas mínimas no almacenan raw query;
- arquitectura queda preparada para providers futuros.

**Gate 6: CERRADO.**

Siguiente:
**Gate 7 — arquitectura técnica exacta, contratos y preflight.**
