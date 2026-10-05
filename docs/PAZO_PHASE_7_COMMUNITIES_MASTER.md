# PAZO — Sub-Ruta Maestra Fase 7: Comunidades

**Documento canónico de producto y desarrollo para Fase 7.**  
**Estado:** DEFINICIÓN DE PRODUCTO — NO PROGRAMAR TODAVÍA  
**Fase padre:** Fase 7 — Comunidades reales  
**Fuente superior:** `docs/PAZO_MASTER_ROADMAP.md`

---

# 0. Regla de esta sub-ruta

Esta fase no se implementa como un bloque genérico de “comunidades”.

Antes de crear tablas, RLS, componentes o flujos se deben cerrar las decisiones de producto marcadas como **DECISIÓN PENDIENTE**.

Mientras este documento indique **DEFINICIÓN DE PRODUCTO**:

- no crear esquema definitivo de Supabase;
- no inventar roles;
- no inventar permisos;
- no inventar reglas de moderación;
- no inventar funciones premium;
- no convertir mocks en comportamiento definitivo;
- sí se puede auditar el código existente y documentar opciones;
- cada decisión aprobada por el Product Owner se registra aquí.

---

# 1. Decisiones confirmadas

Estas decisiones ya son oficiales para Fase 7.

## 1.1 Creación de comunidades

**CONFIRMADO**

Cualquier usuario de PAZO puede crear una comunidad.

No importa:
- si paga una membresía;
- si usa el plan gratuito;
- si tiene una futura suscripción premium.

La creación básica de comunidades **no será una función premium**.

## 1.2 Propiedad de la comunidad

**CONFIRMADO**

El usuario que crea una comunidad se convierte en su propietario/administrador inicial.

El creador tendrá capacidades administrativas de la comunidad.

**Importante:** todavía no están definidas las acciones exactas incluidas en ese rol. La matriz de permisos debe diseñarse antes de programarla.

## 1.3 Membresía de pago

**CONFIRMADO A NIVEL DE PRINCIPIO**

En el futuro una membresía de PAZO podrá desbloquear herramientas adicionales para comunidades.

Todavía no están definidas:
- cuáles herramientas;
- límites;
- niveles;
- precios;
- entitlement;
- si las herramientas premium pertenecen al creador, a la comunidad o a la cuenta.

Por lo tanto:

**Fase 7 no debe bloquear creación, administración básica ni participación normal por no pagar.**

Las futuras herramientas premium se marcarán como **PUNTO DE EXTENSIÓN**, no se inventarán ni se cobrarán durante esta fase.

---

# 2. Objetivo de Fase 7

Convertir el prototipo/mock actual de Comunidades en un sistema social real y persistente donde usuarios y mascotas puedan descubrir, crear, administrar y participar en comunidades de PAZO.

La fase debe dejar una base suficientemente sólida para que posteriormente puedan añadirse:
- eventos;
- herramientas premium;
- notificaciones generales;
- moderación avanzada;
- negocios/organizaciones;
- otras extensiones sociales.

---

# 3. Principio de identidad — DECISIÓN CRÍTICA PENDIENTE

PAZO tiene una regla global:

> La identidad social principal pertenece a la mascota.

Pero una comunidad es creada por una **cuenta/usuario**, que puede tener varias mascotas.

Debemos definir cómo se representa esa relación.

## Opciones a decidir

### Opción A — Membresía por mascota
Cada mascota se une individualmente.

Ejemplo:
- Brandon posee Pancho y Minino.
- Pancho puede estar en “Gatos de Los Ángeles”.
- Minino puede no estar.
- publicaciones, roles y actividad pertenecen a la mascota participante.

Ventaja:
- coherencia con la identidad social actual de PAZO.

Consecuencia:
- una misma cuenta puede tener varias membresías dentro de la misma comunidad.

### Opción B — Membresía por cuenta
La cuenta se une una sola vez y puede actuar usando cualquiera de sus mascotas.

Ventaja:
- administración más simple.

Consecuencia:
- mezcla identidad de usuario y mascota, diferente al núcleo social actual.

### Opción C — Cuenta administra / mascota participa
La propiedad y administración pertenecen a la cuenta.
La participación social visible pertenece a una mascota seleccionada.

Ventaja:
- separa autoridad administrativa de identidad social.

Consecuencia:
- requiere definir con precisión qué acciones son “de cuenta” y cuáles “de mascota”.

**DECISIÓN PENDIENTE.**

No diseñar schema definitivo de members/roles hasta resolver esto.

---

# 4. Tipos de comunidad — DECISIÓN PENDIENTE

Debemos decidir qué tipos existen en el MVP.

Posibles modelos:

## Pública
- cualquiera puede verla;
- cualquiera puede unirse.

## Pública con aprobación
- cualquiera puede verla;
- Join genera solicitud;
- admin/moderador aprueba o rechaza.

## Privada
- no necesariamente aparece en descubrimiento;
- entrada solo por invitación o enlace.

## Solo lectura / informativa
- administradores publican;
- miembros consumen.

**DECISIÓN PENDIENTE:** cuáles de estos tipos entran en Fase 7.

---

# 5. Estructura mínima de una comunidad — DECISIÓN PENDIENTE

Definir qué datos necesita una comunidad.

Candidatos:

- nombre;
- slug o identificador público;
- foto/avatar;
- portada;
- descripción;
- categoría;
- especie objetivo;
- ubicación o alcance geográfico;
- idioma;
- visibilidad;
- reglas;
- creador;
- fecha de creación;
- contador de miembros;
- estado activa/archivada;
- etiquetas/intereses.

No todos deben implementarse necesariamente.

**DECISIÓN PENDIENTE:** campos obligatorios, opcionales y cuáles no existen.

---

# 6. Categorías — DECISIÓN PENDIENTE

Necesitamos decidir si las comunidades se clasifican.

Ejemplos únicamente para discusión:
- especie;
- raza;
- zona/localidad;
- actividades;
- cuidados;
- adopción;
- social;
- entrenamiento;
- rescate;
- intereses generales.

No crear taxonomía todavía.

Preguntas:
- ¿categorías fijas de PAZO?
- ¿tags libres?
- ¿ambas?
- ¿una comunidad puede tener varias categorías?

---

# 7. Roles — DECISIÓN PENDIENTE

Únicamente está confirmado que existe un **creador/propietario administrador**.

Una posible matriz, todavía NO aprobada:

- Owner / Propietario;
- Admin;
- Moderador;
- Miembro.

Preguntas críticas:
- ¿puede haber varios admins?
- ¿el owner puede transferir la comunidad?
- ¿el owner puede abandonar su comunidad?
- ¿un admin puede nombrar otros admins?
- ¿moderador puede expulsar miembros?
- ¿moderador puede borrar publicaciones?
- ¿se necesita rol “miembro aprobado” vs “pendiente”?
- ¿se necesita rol especial para negocios/verificados?

No implementar roles secundarios hasta definirlos.

---

# 8. Permisos administrativos — DECISIÓN PENDIENTE

Debemos definir qué significa exactamente “administrador normal de comunidad”.

Candidatos para evaluación:

## Configuración
- editar nombre;
- descripción;
- foto;
- portada;
- reglas;
- categoría;
- privacidad.

## Miembros
- aprobar solicitudes;
- rechazar solicitudes;
- eliminar miembros;
- bloquear reingreso;
- invitar;
- revisar lista.

## Equipo
- nombrar admin;
- retirar admin;
- nombrar moderador;
- retirar moderador.

## Contenido
- fijar publicación;
- borrar publicación;
- cerrar comentarios;
- publicar anuncio;
- destacar contenido.

## Comunidad
- pausar;
- archivar;
- eliminar;
- transferir propiedad.

Cada permiso debe clasificarse como:
- Owner únicamente;
- Admin;
- Moderador;
- Miembro;
- no incluido en MVP.

---

# 9. Participación del miembro — DECISIÓN PENDIENTE

Definir qué puede hacer un miembro normal.

Candidatos:
- ver contenido;
- publicar;
- comentar;
- reaccionar;
- guardar;
- invitar;
- reportar;
- crear eventos;
- responder encuestas;
- compartir publicaciones.

No asumir que el Feed global y el Feed de comunidad usan exactamente las mismas reglas.

---

# 10. Contenido dentro de comunidades — DECISIÓN CRÍTICA PENDIENTE

Debemos definir qué vive dentro de una comunidad.

## Pregunta principal

¿Una comunidad tiene su propio Feed?

Opciones:

### A. Posts independientes de comunidad
Una publicación puede pertenecer específicamente a una comunidad.

### B. Compartir posts del Feed global
Se comparte/referencia contenido existente.

### C. Híbrido
Se crean posts dentro de la comunidad y también se pueden compartir posts globales.

También debemos decidir:
- fotos;
- texto;
- video;
- encuestas;
- publicaciones fijadas;
- anuncios del admin;
- comentarios/reacciones;
- orden cronológico vs ranking.

---

# 11. Eventos — DECISIÓN PENDIENTE

El concepto original de PAZO incluye eventos, pero todavía no está decidido si se construyen dentro de Fase 7.

Opciones:
- incluir eventos básicos en Comunidades;
- dejar eventos para una subfase posterior;
- mover eventos a otra fase global.

Si entran:
- creador;
- fecha/hora;
- lugar;
- cupo;
- RSVP;
- invitados;
- cancelación;
- recordatorios.

No implementar hasta decidir.

---

# 12. Descubrimiento y búsqueda

Fase 7 necesita una experiencia mínima para encontrar comunidades.

Debe coordinarse con Fase 12 — Explore/Search unificado.

## Alcance posible de Fase 7
- listado real de comunidades;
- búsqueda por nombre;
- filtros mínimos aprobados;
- sugerencias por intereses/especie;
- comunidades a las que pertenece la mascota/cuenta;
- paginación.

## Regla de rendimiento propuesta
Las listas no deben cargar datasets ilimitados.

Antes de implementar se definirá page size, pero debe existir paginación desde backend.

---

# 13. Página de comunidad — DECISIÓN PENDIENTE

Posibles bloques:

- portada;
- avatar;
- nombre;
- descripción;
- reglas;
- categoría;
- ubicación;
- miembros;
- botón Join/Leave;
- rol del usuario;
- Feed;
- admins/moderadores;
- eventos;
- acciones de administración.

Debemos definir qué entra en el MVP antes de diseñar la pantalla final.

---

# 14. Join / Leave — DECISIÓN PENDIENTE

Debemos resolver:

- Join instantáneo o aprobación;
- comportamiento según tipo de comunidad;
- qué ocurre si una cuenta tiene varias mascotas;
- qué ocurre con publicaciones del miembro al abandonar;
- cooldown para volver a entrar;
- expulsión;
- ban;
- invitaciones;
- solicitudes pendientes.

---

# 15. Reglas y moderación

Fase 14 contiene moderación global, pero Comunidades necesita un mínimo operativo.

Debemos distinguir:

## Moderación local de comunidad
Puede entrar en Fase 7:
- expulsar miembro;
- moderar contenido de esa comunidad;
- roles internos;
- reglas locales.

## Moderación global PAZO
Permanece en Fase 14:
- reportes a PAZO;
- sanciones globales;
- bloqueo global;
- revisión de abuso;
- enforcement de plataforma.

**DECISIÓN PENDIENTE:** mínimo exacto de moderación local para Fase 7.

---

# 16. Privacidad y seguridad — requisitos obligatorios

Independientemente de decisiones de producto:

- nadie administra una comunidad por modificar IDs en el cliente;
- permisos se validan en backend;
- roles no se confían al frontend;
- RLS separa miembros/no miembros según la visibilidad definida;
- cambios de roles requieren reglas explícitas;
- owner_id/creator_id no se usa como autorización sin comprobar auth.uid();
- una mascota/cuenta no puede falsificar membresía;
- operaciones sensibles deben ser atómicas;
- borrar una comunidad debe definir cascadas antes de implementarse;
- Storage de avatar/portada debe tener ownership;
- listas grandes deben paginarse;
- contadores derivados deben ser backend-managed o calculados de forma consistente.

---

# 17. Membresía premium — puntos de extensión, NO funcionalidades

La futura membresía paga NO puede impedir:
- crear una comunidad;
- administrar sus funciones básicas;
- unirse;
- participar en las funciones gratuitas definidas.

Fase 7 debe evitar diseñar el schema de forma que luego sea imposible añadir entitlements.

Posibles áreas futuras, solo como marcadores:
- analytics;
- personalización avanzada;
- herramientas administrativas avanzadas;
- límites ampliados;
- automatizaciones;
- destacados;
- herramientas para eventos;
- herramientas para negocios.

**NINGUNA está aprobada.**

La definición comercial pertenece principalmente a Fase 16 — Monetización.

---

# 18. Notificaciones de comunidades

Fase 11 generaliza el sistema de notificaciones.

En Fase 7 debemos decidir cuáles son imprescindibles para que Comunidades funcione.

Candidatas:
- solicitud aceptada;
- solicitud rechazada;
- nuevo rol;
- expulsión;
- invitación;
- anuncio importante.

Likes/comentarios/posts nuevos pueden esperar al sistema general si no son imprescindibles.

**DECISIÓN PENDIENTE.**

---

# 19. Métricas y contadores

Posibles contadores:
- miembros;
- posts;
- eventos;
- solicitudes pendientes.

Debemos decidir:
- cuáles se almacenan;
- cuáles se calculan;
- qué necesita actualización atómica;
- qué se muestra públicamente.

No duplicar contadores sin una fuente de verdad clara.

---

# 20. Estados del ciclo de vida — DECISIÓN PENDIENTE

Posibles estados:
- active;
- paused;
- archived;
- deleted.

Debemos decidir:
- si existe soft delete;
- si una comunidad puede restaurarse;
- qué pasa con members/posts;
- qué ve un usuario cuando una comunidad ya no está activa.

---

# 21. Subfases propuestas

Estas subfases son estructura de trabajo; su contenido exacto se ajusta después de cerrar decisiones.

## 7.0 — Definición de producto
**ESTADO: EN CURSO**

Cerrar:
- identidad;
- tipos;
- roles;
- permisos;
- participación;
- contenido;
- Join/Leave;
- moderación local;
- campos;
- eventos;
- notificaciones mínimas.

**No programar antes de completar 7.0.**

## 7.1 — Fundación de datos y seguridad
**ESTADO: BLOQUEADA POR 7.0**

- esquema;
- RLS;
- grants;
- índices;
- RPCs necesarias;
- Storage;
- ownership.

## 7.2 — Crear y administrar comunidad
**ESTADO: BLOQUEADA**

- flujo Crear comunidad;
- owner;
- edición;
- herramientas gratuitas aprobadas.

## 7.3 — Membresía / Join / Leave
**ESTADO: BLOQUEADA**

- membership;
- solicitudes si aplican;
- roles base;
- conteos.

## 7.4 — Página y contenido de comunidad
**ESTADO: BLOQUEADA**

- perfil;
- contenido;
- Feed si se aprueba;
- interacción.

## 7.5 — Descubrimiento
**ESTADO: BLOQUEADA**

- Explore;
- búsqueda;
- filtros;
- sugerencias;
- paginación.

## 7.6 — Administración y moderación local
**ESTADO: BLOQUEADA**

- miembros;
- equipo;
- permisos;
- reglas;
- acciones aprobadas.

## 7.7 — Integraciones mínimas
**ESTADO: BLOQUEADA**

- notificaciones indispensables;
- enlaces con perfiles/mascotas;
- puntos de extensión premium, sin monetización real.

## 7.8 — Estabilización
**ESTADO: BLOQUEADA**

- concurrencia;
- seguridad;
- Advisors;
- rendimiento;
- build;
- pruebas visuales/end-to-end;
- eliminación de mocks.

---

# 22. Definition of Done de Fase 7

Fase 7 solo se puede marcar **COMPLETADA** cuando:

- decisiones de 7.0 estén registradas;
- comunidades ya no dependan de mockData para su núcleo;
- crear comunidad persista;
- owner/admin se valide en backend;
- Join/Leave persista;
- permisos definidos funcionen;
- página de comunidad use datos reales;
- búsqueda/descubrimiento mínimo funcione;
- listas estén paginadas;
- RLS y grants estén auditados;
- un usuario no pueda elevarse de rol manipulando el cliente;
- build de producción pase;
- pruebas visuales sean aprobadas;
- Supabase Advisors sean revisados;
- PR esté fusionado a main;
- esta sub-ruta y la hoja maestra general sean actualizadas.

---

# 23. Secuencia de definición recomendada

Para ahorrar tiempo y tokens, las decisiones se cerrarán en este orden:

1. **Quién participa:** cuenta, mascota o híbrido.
2. **Tipos de comunidad:** pública / aprobación / privada.
3. **Roles:** owner/admin/mod/member u otra matriz.
4. **Permisos:** qué puede hacer cada rol.
5. **Contenido:** Feed, posts y formatos.
6. **Join/Leave:** solicitudes, invitaciones, expulsión y ban.
7. **Campos de comunidad:** nombre, imagen, descripción, categoría, ubicación, reglas.
8. **Moderación local mínima.**
9. **Eventos:** dentro o fuera de Fase 7.
10. **Notificaciones mínimas.**
11. **Descubrimiento/búsqueda/filtros.**
12. **Ciclo de vida:** archivar/eliminar/transferir.
13. Cerrar 7.0.
14. Diseñar backend.
15. Programar.

No abordar simultáneamente los 12 puntos si todavía hay decisiones anteriores abiertas.
