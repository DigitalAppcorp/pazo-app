# PAZO — Product Capability Portfolio

**Estado:** ACTIVO — DISEÑO DE PRODUCTO / GATE 3  
**Objetivo:** definir qué experiencias coherentes merece la pena validar antes de instrumentar preferencias o construir nuevos módulos.

---

# 1. Principio rector

PAZO no debe preguntar:

> “¿Qué feature quieres?”

Debe descubrir:

> “¿Qué resultado quieres conseguir con tu mascota y qué experiencia completa haría que PAZO valga la pena?”

Una feature aislada puede obtener votos y aun así no formar un producto útil.

Por eso la unidad principal de diseño/validación será:

**minimum coherent product slice**

Una combinación mínima de capacidades que juntas entregan un resultado reconocible.

---

# 2. Qué ya está demostrado/construido

## Núcleo social
- identidad de mascota;
- perfiles;
- Feed;
- Follow;
- Like/Save/comments.

## Seguridad / rescate
- pasaporte QR;
- alerta perdida;
- avistamientos;
- página pública.

## Cuidado privado
- Agenda/Cuidados;
- Documentos privados.

Estas piezas no necesitan entrar de nuevo como opciones de votación.

Pueden convertirse en dependencias o diferenciadores de experiencias futuras.

---

# 3. Regla: lo que NO se somete a voto directo

No pedir al usuario que elija infraestructura como si fuera producto.

Ejemplos:
- RLS;
- moderación;
- notificaciones;
- búsqueda;
- geocoding;
- filtros;
- permisos;
- anti-spam;
- analytics;
- indexación;
- chat si es solo dependencia de otra experiencia;
- mapas SDK/proveedor;
- almacenamiento;
- seguridad.

Si una experiencia ganadora necesita estas piezas, se construyen como dependencias.

---

# 4. Pilares de valor posibles para PAZO

## A. Cuidar
Job:
> mantener organizada y accesible la vida práctica/salud de mi mascota.

Base actual:
- Agenda;
- Documentos.

Capacidades futuras:
- peso/medidas;
- vacunas con vencimiento;
- medicamentos más estructurados;
- historial cronológico;
- gastos;
- contactos veterinarios;
- emergency card;
- exportación de información.

Valor individual:
alto.

Network effect:
ninguno/bajo.

Estado:
no necesita competir ahora por validación de interés; ya existe base real.

---

## B. Proteger
Job:
> estar preparado si mi mascota se pierde o ocurre una emergencia.

Base actual:
- QR;
- Lost Mode;
- sightings.

Capacidades futuras:
- trusted contacts;
- difusión geográfica;
- alertas por radio;
- cartel compartible;
- historial de sightings;
- modo emergencia;
- contactos/veterinario visibles bajo reglas;
- recuperación post-evento.

Valor individual:
alto.

Adquisición:
alta potencial por páginas/alertas compartibles.

Estado:
posible expansión futura, pero no debe mezclarse con votación social general.

---

## C. Vivir la ciudad con mi mascota
Job:
> saber dónde puedo ir y qué puedo hacer cerca con mi mascota.

Este job puede convertirse en un bundle coherente.

### Concepto C1 — Vida local
Promesa:
**“Descubre lugares y planes cerca de ti donde tu mascota sí encaja.”**

Capacidades candidatas:
- mapa;
- parques;
- cafés/restaurantes pet-friendly;
- veterinarias;
- grooming/pet stores;
- filtros por especie;
- favoritos;
- rutas/direcciones externas;
- eventos/planes;
- actividad local.

Dependencias:
- contenido real de lugares;
- proveedor cartográfico/geocoding;
- búsqueda;
- reglas de calidad;
- privacidad de ubicación.

Capacidades network opcionales:
- check-ins;
- quién está cerca;
- reseñas;
- actividad reciente.

Riesgo oculto:
un mapa vacío no entrega valor aunque el usuario “quiera mapa”.

Minimum coherent slice:
**lugares útiles + mapa/lista + filtros + detalle real**.

Check-ins/personas cercanas NO son requisito para que el slice tenga valor.

Hook atractivo:
**“¿A dónde puedes ir hoy con tu mascota?”**

Señal fuerte:
- buscar un lugar;
- guardar/favorito;
- abrir indicaciones;
- volver a consultar.

No basta:
- votar “quiero mapa”.

---

## D. Encontrar personas/mascotas afines
Job:
> conocer personas y mascotas compatibles con mi estilo de vida.

Hay al menos dos soluciones distintas y no deben confundirse.

### Concepto D1 — Círculos / Comunidades
Promesa:
**“Encuentra tu grupo: raza, especie, zona o intereses.”**

Capacidades candidatas:
- grupos temáticos;
- grupos locales;
- preguntas/consejos;
- posts del grupo;
- encuentros;
- invitaciones;
- administración.

Dependencias:
- masa crítica;
- moderación;
- search/discovery;
- notificaciones;
- roles.

Hook atractivo:
**“Encuentra personas que viven lo mismo que tú y tu mascota.”**

Riesgo:
fragmentación + comunidades vacías.

Minimum coherent slice posible:
**grupos locales/temáticos + conversación básica + descubrimiento**.

Pero debe validarse cuál job domina:
- consejos;
- pertenencia;
- conocer gente;
- organizar planes.

### Concepto D2 — Compañeros / Playdates
Promesa:
**“Encuentra una mascota compatible para pasear o jugar.”**

Capacidades candidatas:
- perfiles compatibles;
- distancia aproximada;
- tamaño/energía/temperamento;
- disponibilidad;
- solicitud de encuentro;
- chat limitado;
- safety controls;
- bloqueo/report.

Dependencias:
- densidad local;
- ubicación;
- seguridad;
- moderación;
- messaging;
- consentimiento.

Hook atractivo:
**“¿Tu mascota necesita un compañero compatible?”**

Riesgo:
más atractivo visualmente que Comunidades, pero mayor riesgo de seguridad.

Minimum coherent slice:
**descubrimiento compatible + solicitud mutua + contacto seguro**.

No validar “matches” como swipe superficial sin definir seguridad y resultado.

---

# 5. Experiencias sociales que pueden ser bundles, no módulos aislados

## Eventos
Evento por sí solo no necesariamente es un producto.

Puede ser:
- capacidad de Vida Local;
- capacidad de Comunidades;
- salida natural de Playdates.

Pregunta correcta:
> ¿Los usuarios quieren encontrar cosas que hacer, pertenecer a un grupo, o conocer a una mascota/persona concreta?

No:
> “¿Quieres Eventos?”

## Mensajería
No asumir que es un módulo principal.

Puede ser infraestructura de:
- Playdates;
- Comunidades;
- Eventos;
- proveedores.

Solo construir chat cuando un flujo ganador necesite conversación privada.

## Notificaciones
Infraestructura de:
- rescate;
- agenda;
- comunidades;
- playdates;
- eventos.

No pedir votos.

## Search/Explore
Infraestructura/capa de descubrimiento.

Debe crecer según las entidades reales disponibles.

---

# 6. Servicios y marketplace

Job:
> resolver necesidades de cuidado con proveedores confiables.

### Concepto E1 — Servicios locales
Promesa:
**“Encuentra quién puede cuidar, pasear o atender a tu mascota cerca de ti.”**

Capacidades:
- vets;
- grooming;
- walkers;
- boarding;
- trainers;
- perfiles de negocio;
- horarios;
- contacto;
- reseñas;
- booking futuro.

Valor:
puede existir sin gran red social si hay oferta suficiente.

Dependencias:
- adquisición de negocios;
- calidad de listings;
- moderación/reviews;
- eventualmente pagos/bookings.

Hook:
**“¿Quién puede ayudarte hoy con tu mascota?”**

Riesgo:
es casi un marketplace y requiere estrategia de supply, no solo demanda.

No construir booking antes de demostrar que el directorio/lead genera uso.

---

# 7. Adopción

Job:
> encontrar una mascota adecuada / ayudar a una mascota a encontrar hogar.

Capacidades:
- perfiles;
- shelters/rescues;
- filtros;
- formularios;
- estado de adopción;
- verificación.

Riesgos:
- operaciones;
- organizaciones;
- fraude;
- actualización de disponibilidad.

Puede generar adquisición/SEO.

No debe competir con módulos sociales como simple tarjeta “¿te interesa adopción?”.

Requiere partner/supply strategy.

---

# 8. Identidad pública y crecimiento

Job:
> compartir algo útil de mi mascota fuera de PAZO.

Base:
- rescue QR/public page.

Oportunidades:
- perfil público compartible;
- pet card;
- badges/logros;
- página de evento;
- comunidad pública;
- lost poster;
- invitación a playdate;
- local guide compartible.

Estas capacidades pueden ser **growth loops**.

Validación correcta:
tráfico externo + signup attribution.

No medir adquisición con clicks internos.

---

# 9. Monetización futura

No mostrar como “feature vote” todavía.

Posibles modelos:
- membership de owner;
- tools premium para communities;
- boosts/listings de negocios;
- sponsored local discovery;
- provider subscriptions;
- premium safety/care exports;
- booking fees;
- marketplace take rate.

Regla:
primero demostrar valor/uso del bundle.

---

# 10. Supuestos que debemos desafiar

## Supuesto 1
“Si muchos usuarios votan una función, hay que construirla.”

Falso.

Puede ganar por:
- novedad;
- visual atractivo;
- copy;
- posición;
- curiosidad.

La decisión también necesita coste, recurrencia, densidad y coherencia.

## Supuesto 2
“Cada módulo debe validarse por separado.”

Falso.

Mapa + lugares pueden ser un único slice.
Eventos pueden ser parte de Vida Local o Comunidades.
Chat puede ser una dependencia de Playdates.

## Supuesto 3
“Más opciones generan mejores datos.”

Falso.

Demasiadas opciones:
- fragmentan intención;
- crean caminos incoherentes;
- aumentan sesgo;
- hacen imposible interpretar prioridad.

## Supuesto 4
“El usuario sabe qué solución necesita.”

No siempre.

El usuario conoce mejor el resultado:
- quiero salir con mi perro;
- quiero que tenga amigos;
- quiero gente que entienda mi problema;
- necesito un groomer.

No necesariamente sabe si la solución correcta es:
mapa, comunidad, match, evento o chat.

## Supuesto 5
“Interés interno demuestra growth.”

Falso.

Growth necesita experimento externo y attribution.

## Supuesto 6
“Una función social atractiva puede lanzarse vacía.”

Falso.

Hay que resolver cold-start antes.

---

# 11. Primera arquitectura de conceptos para validar

No lanzar 15 opciones.

Propuesta inicial de conceptos de alto nivel:

## Concepto A — Vida Local
“Descubre lugares y planes donde tu mascota es bienvenida.”

Incluye conceptualmente:
- lugares;
- mapa/lista;
- filtros;
- planes/eventos locales.

Puede crecer después hacia check-ins.

## Concepto B — Círculos
“Encuentra personas que viven lo mismo que tú y tu mascota.”

Incluye conceptualmente:
- grupos locales/temáticos;
- consejos;
- pertenencia;
- posibles encuentros.

## Concepto C — Compañeros
“Encuentra una mascota compatible para pasear o jugar.”

Incluye conceptualmente:
- compatibilidad;
- descubrimiento;
- solicitud mutua;
- contacto seguro.

## Concepto D — Servicios
“Encuentra ayuda confiable para cuidar a tu mascota.”

Incluye conceptualmente:
- vets;
- groomers;
- walkers;
- otros proveedores.

No incluir booking/pagos todavía.

---

# 12. Qué NO haría en el primer experimento

No mostrar:
- Mapa
- Eventos
- Chat
- Check-ins
- Veterinarias
- Grooming
- Matches
- Comunidades
- Reviews

como nueve botones independientes.

Eso mediría piezas técnicas, no propuestas de valor.

---

# 13. Arquitectura inicial de validación recomendada

## Etapa 1 — Concept attraction
Cada concepto debe presentarse como experiencia.

Medir por separado:
- exposición;
- apertura;
- interés.

No obligar a elegir solo uno.

## Etapa 2 — Job/intención
Dentro del concepto interesado:
preguntar qué resultado busca.

Ejemplo Vida Local:
- lugares donde ir;
- eventos/planes;
- servicios esenciales;
- ver actividad cercana.

## Etapa 3 — Priorización relativa
Solo cuando una cuenta mostró interés en 2+ conceptos:
preguntar opcionalmente:

**“Si PAZO pudiera lanzar uno primero, ¿cuál usarías antes?”**

Esto añade trade-off sin impedir interés múltiple.

## Etapa 4 — Señal de compromiso
Para conceptos caros:
pedir una acción más fuerte.

Ejemplos:
- “Avísame cuando esté listo”;
- configurar filtros;
- seleccionar zona aproximada;
- crear preferencias de playdate;
- guardar tipos de lugares;
- elegir necesidades de servicio.

No tiene que construir el módulo real.

## Etapa 5 — Behavioral/concierge experiment
Antes de BUILD NOW de un módulo caro:
simular manualmente una parte del valor cuando sea posible.

Ejemplo:
- Vida Local: lista curada real de 10–20 lugares;
- Compañeros: interest profile sin matching público;
- Servicios: directorio manual pequeño;
- Círculos: un único grupo piloto, no engine completo.

---

# 14. Datos que la instrumentación futura debe poder distinguir

La infraestructura NO debe limitarse a:
- module_key;
- interest;
- intent.

Debe considerar desde diseño:
- concept_key;
- concept_version;
- exposure;
- interest;
- intent;
- priority_choice;
- commitment action;
- source;
- session;
- user;
- active pet como contexto opcional.

Motivo:
si cambia sustancialmente la promesa o el bundle, no se pueden mezclar datos como si fueran el mismo concepto.

La tabla/RPC final se definirá después de aprobar este portfolio.

---

# 15. Reglas de decisión

No BUILD NOW solo por Interest Rate.

Evaluar una matriz:

1. atracción;
2. intención clara;
3. compromiso;
4. revisita;
5. valor individual;
6. masa crítica requerida;
7. disponibilidad de contenido/supply;
8. coste técnico;
9. coste operativo;
10. privacidad/seguridad;
11. potencial de adquisición;
12. retención esperada;
13. coherencia con el núcleo actual.

La salida sigue siendo:
- BUILD NOW;
- MVP REDUCIDO;
- EXPERIMENTO ACTIVO;
- POSPUESTO.

---

# 16. Riesgo de sesgo en la UI

Si comparamos conceptos:
- no asumir que el primero recibe más clicks por valor;
- mantener tamaño/jerarquía visual equivalentes;
- registrar versión;
- rotar/alternar orden si la muestra futura lo justifica;
- evitar copy sensacionalista desigual;
- medir apertura además de CTA.

---

# 17. Qué falta decidir con Product Owner

Antes de instrumentación:

1. ¿Estos cuatro conceptos representan correctamente el espacio que PAZO quiere explorar?
2. ¿Hay un quinto resultado estratégico que falta?
3. ¿Vida Local debe incluir Servicios o conviene mantenerlos separados?
4. ¿Compañeros/Playdates encaja con la identidad de PAZO o se considera una etapa posterior?
5. ¿Qué conceptos deben aparecer en la experiencia inicial y cuáles solo se guardan para después?
6. ¿Queremos validar solo retención/utilidad interna o también growth externo en esta etapa?
7. ¿Qué compromiso mínimo debe superar un concepto caro antes de BUILD NOW?

---

# 18. Estado

Este documento es el artefacto activo de Gate 3.

No autoriza instrumentación todavía.

PR #15 permanece pausado.

Siguiente:
- revisar/challenger este portfolio;
- cerrar conceptos y bundles;
- diseñar la experiencia de validación;
- solo después reabrir Gate 6 de instrumentación.
