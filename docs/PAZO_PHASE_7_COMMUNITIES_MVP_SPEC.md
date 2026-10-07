# PAZO — Fase 7 Comunidades — MVP útil real

**Estado:** GATE 6 CERRADO — APROBADO POR PRODUCT OWNER
**Decisión:** MVP REDUCIDO REAL
**Fecha:** 2026-10-06

## Decisión estratégica

Comunidades deja de validarse como un fake door de módulo completo.

PAZO construirá un núcleo real y usable de Comunidades para el MVP. Las capacidades avanzadas u opcionales se validarán dentro de ese núcleo antes de construirlas por completo.

La pregunta cambia de:
- “¿debería existir Comunidades?”

a:
- “¿qué capacidades hacen que usuarios reales de Comunidades vuelvan, participen y eventualmente generen valor económico?”

## Núcleo real propuesto

Un usuario debe poder:
1. descubrir comunidades reales desde Explorar;
2. abrir una comunidad;
3. unirse y salir;
4. ver contenido real;
5. publicar texto o foto;
6. dar like y comentar;
7. crear una comunidad;
8. administrarla de forma básica;
9. volver y encontrar actividad persistente.

## Identidad propuesta

- membership por cuenta;
- autoría social de posts/comentarios mediante la mascota activa.

Esto evita contar varias mascotas del mismo dueño como miembros distintos, pero preserva la identidad social centrada en mascotas.

## Explorar

Explorar sigue siendo el hub de descubrimiento de PAZO.

Comunidades vive dentro de su tab/categoría.

El tab Comunidades real debe permitir:
- ver comunidades;
- buscar/filtrar de forma básica;
- distinguir memberships reales;
- abrir detalle;
- crear comunidad.

## Community Detail

Mínimo:
- imagen;
- nombre;
- descripción;
- categoría;
- especie opcional;
- zona opcional;
- miembros reales;
- Owner/Admin visible;
- Join / Joined / Leave;
- Publicaciones;
- Información;
- Miembros.

## Membresía MVP

Propuesta:
- comunidades públicas;
- cualquier usuario autenticado puede ver;
- cualquier usuario autenticado puede unirse;
- una cuenta cuenta una vez;
- comunidades privadas/aprobación quedan para después.

## Contenido

Miembro:
- post texto;
- post con foto;
- like/unlike;
- comentarios;
- persistencia tras F5.

La mascota activa aparece como autor.

La arquitectura decidirá si se extiende el modelo de posts existente o se crea una entidad especializada.

## Creación

Cualquier cuenta autenticada puede crear.

No requiere pago.

Campos mínimos:
- nombre;
- descripción;
- categoría;
- especie opcional;
- zona opcional;
- imagen;
- reglas básicas.

Al crear:
- creador queda unido;
- creador es Owner/Admin;
- comunidad pública.

## Administración básica gratuita

Owner/Admin:
- editar datos básicos;
- gestionar reglas;
- eliminar contenido de su comunidad;
- retirar miembros;
- ver miembros;
- archivar/cerrar comunidad.

Owner/Admin tendrá insignia funcional visible. Esa autoridad no se compra.

## Extensiones en validación

No forman parte del núcleo inicial:
- eventos/caminatas;
- retos colectivos;
- insignias/logros no funcionales;
- Q&A avanzado;
- analytics para admins;
- automatización;
- roles avanzados;
- personalización avanzada;
- Community Pro.

Estas funciones se validarán contextualmente con usuarios que realmente usan Comunidades.

## Experimentos activos en el MVP

Para que el MVP mida qué extensiones priorizar, el núcleo real incluye una sección contextual **Funciones en desarrollo** dentro de `Información`, visible solo para miembros reales.

Experimentos activos iniciales:
- `communities_events` — Eventos y caminatas;
- `communities_challenges` — Retos colectivos;
- `communities_badges` — Insignias y reconocimiento;
- `communities_qa` — Preguntas y respuestas;
- `communities_admin_tools` — Herramientas avanzadas de administración, visible solo al Owner/Admin.

Semántica:
- una `view` cuenta únicamente cuando la tarjeta entra realmente en viewport;
- un `interest` es único por cuenta + experimento;
- el interés persiste tras F5;
- la fuente diferencia `community_info_member` y `community_info_owner`;
- no se presentan como funciones activas;
- no se muestran a visitantes no unidos, para aumentar el contexto de la señal;
- no se usan cifras o actividad ficticia.

Estos fake doors validan extensiones; no sustituyen funcionalidad del núcleo real.

## Monetización

Núcleo gratuito:
- crear;
- unirse;
- publicar/interactuar;
- administración básica.

Hipótesis futuras:
- Community Pro;
- Pazo Plus;
- promoción;
- publicidad/patrocinio contextual;
- cuentas profesionales.

## Cold start

No usar:
- miembros falsos;
- actividad falsa;
- prueba social inventada.

Se evaluará:
- comunidades oficiales PAZO claramente identificadas;
- contenido inicial real;
- destacar grupos con actividad real.

## Métricas post-lanzamiento

- visitas únicas;
- conversión Join;
- comunidades creadas;
- comunidades con al menos un post;
- usuarios que publican;
- usuarios que comentan/like;
- revisitas;
- actividad recurrente por comunidad.

## Fuera de alcance inicial

- privadas/aprobación;
- chat grupal;
- eventos completos;
- retos completos;
- ranking/puntos;
- catálogo complejo de badges;
- pagos;
- boosts;
- analytics avanzados;
- roles personalizados;
- e-commerce.

## Definition of Done Gate 6

**APROBADO por Product Owner el 2026-10-06.**

Queda aprobado:
- membership por cuenta + autoría por mascota activa;
- públicas en MVP;
- detalle de comunidad;
- Join/Leave;
- feed real;
- creación;
- administración básica;
- insignia Admin funcional;
- extensiones en validación;
- fuera de alcance;
- métricas.

Siguiente: Gate 7 — arquitectura técnica.
