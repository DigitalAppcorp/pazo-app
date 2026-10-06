# PAZO — Referencia Canónica de Explorar

**Estado:** APROBADA COMO REFERENCIA VISUAL/ESTRUCTURAL POR PRODUCT OWNER  
**Origen visual:** screenshot del Product Owner, 2026-10-06  
**Alcance:** define la estructura y jerarquía de la pantalla Explorar.  
**Regla:** Explorar es un HUB de descubrimiento. Comunidades es una categoría dentro de Explorar, no el módulo completo.

---

# 1. Propósito de Explorar

Explorar es la puerta de entrada para descubrir más del ecosistema PAZO.

Hoy o en etapas posteriores puede contener:
- personas/mascotas;
- comunidades;
- eventos;
- lugares u otras experiencias;
- productos en una fase futura cuando ese módulo exista y sea validado.

No asumir que todas estas superficies son funcionales hoy.

---

# 2. Estructura visual canónica

La pantalla de referencia aprobada tiene esta jerarquía:

1. Header global de PAZO.
2. Hero de descubrimiento.
3. Buscador visual.
4. Tabs/categorías.
5. Contenido contextual por tab.
6. Bottom navigation global.

La estética aprobada:
- fondo cálido claro;
- verde oscuro PAZO;
- amarillo lima como acento;
- cards blancas grandes;
- bordes muy redondeados;
- sombras suaves;
- tipografía fuerte y legible;
- densidad visual limpia;
- fotos a la izquierda en cards;
- controles tipo pill;
- mobile-first.

---

# 3. Hero canónico

Mantener como referencia:

**Pill:**  
\`DESCUBRIMIENTO\`

**Título:**  
\`Encuentra a los tuyos.\`

El título no significa exclusivamente Comunidades. Debe funcionar como promesa general de descubrimiento dentro de PAZO.

**Subtítulo actual a corregir:**

No usar:
> Comunidades locales organizadas por especie e intereses

porque reduce Explorar a Comunidades.

Copy recomendado:

> **Descubre mascotas, comunidades, eventos y nuevas experiencias dentro de PAZO.**

EN:
> **Discover pets, communities, events and new experiences across PAZO.**

---

# 4. Buscador

Visualmente se conserva en la misma posición que la referencia.

Placeholder recomendado:

> **Mascotas, comunidades, eventos...**

EN:
> **Pets, communities, events...**

## Regla funcional

La búsqueda unificada completa pertenece a una fase futura de Explore/Search.

Hasta que exista:
- no prometer búsqueda global real si el backend no la soporta;
- puede mantenerse como parte de la composición visual si se marca/deshabilita apropiadamente;
- no introducir resultados ficticios como si provinieran de búsqueda real.

Cuando Explore/Search se implemente, este mismo control se convierte en la entrada canónica.

---

# 5. Tabs canónicos

Conservar:
- **Para ti**
- **Comunidades**
- **Eventos**

Diseño:
- seleccionado: fondo verde PAZO + texto amarillo;
- no seleccionado: fondo blanco + texto verde/gris;
- misma forma pill y espaciado de la referencia.

Futuras categorías deben añadirse únicamente cuando exista razón de producto. No llenar horizontalmente Explorar con módulos futuros aún no validados.

---

# 6. Tab Para ti

**Objetivo:** dar una muestra de descubrimiento mixto dentro de PAZO.

Debe conservar el espíritu de la referencia:
- tarjeta destacada de una mascota/perfil;
- secciones sugeridas;
- cards fáciles de escanear;
- posibilidad de descubrir Comunidades sin convertir toda la pantalla en Comunidades.

## Perfil destacado

La referencia usa:
- avatar/foto;
- nombre;
- especie + zona;
- frase corta;
- CTA \`Ver ficha\`.

Mientras la entidad sea mock:
- no debe presentarse como usuario real si puede inducir engaño;
- se puede conservar únicamente como demo claramente controlada durante desarrollo;
- antes de producción debe provenir de datos reales o eliminarse.

## Comunidades sugeridas dentro de Para ti

Puede existir una sección:
**Comunidades sugeridas**

Pero durante 7.0A:
- cards son previews conceptuales;
- no mostrar miembros ficticios;
- no mostrar \`Unirme / Unido\` como si membership existiera;
- tocar una card puede llevar al tab/superficie \`Comunidades\` para entender el concepto.

Esto permite conservar la composición aprobada sin falsear funcionalidad.

---

# 7. Tab Comunidades — Experimento 7.0A

Este tab es donde vive el experimento aprobado.

## Objetivo UX

El usuario debe entender en pocos segundos:

1. qué es una Comunidad;
2. por qué podría importarle;
3. ejemplos de qué tipo de grupos existirían;
4. qué podría hacer dentro;
5. después decidir si le interesa.

## Orden de contenido

### A. Encabezado corto

**Título:**
> **Comunidades**

**Explicación:**
> **Espacios creados por usuarios de PAZO para reunir personas y mascotas que comparten una zona, especie, raza, actividad, duda o interés.**

Etiqueta:
> **Vista previa · aún no activa**

No usar copy tipo “Ayúdanos a decidir qué construir” como hero principal. El producto debe explicarse primero.

### B. Ejemplos visuales

Usar cards en el estilo de la referencia.

Ejemplos conceptuales:
- Gatos de LA;
- Aves de Los Ángeles;
- Perros Senderistas LA.

Cada card puede contener:
- foto;
- nombre;
- categoría/especie;
- tagline.

No contiene:
- miembro counts ficticios;
- botón Join funcional;
- Joined;
- actividad ficticia.

Debe existir una indicación discreta:
> **Ejemplo conceptual**

### C. Qué puedes hacer

Explicar en bloques cortos:

**Conecta con gente como tú**  
Grupos por zona, especie, raza, intereses o experiencias compartidas.

**Pregunta y comparte**  
Dudas, consejos y conocimiento útil.

**Haz planes juntos**  
Caminatas, encuentros, eventos y retos.

**Construye reconocimiento**  
Roles, aportes e insignias que podrían mostrarse en el perfil de tu mascota.

**Crea tu propio grupo**  
Cualquier usuario podría crear una comunidad y administrar lo básico gratis.

No convertir estos cinco elementos en módulos ni botones independientes.

### D. CTA de validación

Después de que el usuario entendió la propuesta:

**Pregunta:**
> **¿Usarías Comunidades en PAZO?**

**CTA:**
> **Sí, me interesa**

Subcopy:
> **Esta función todavía está en evaluación. Tu respuesta nos ayuda a decidir si vale la pena construirla.**

### E. Intent

Solo después del interés:

> **¿Qué haría que volvieras más a Comunidades?**

Una elección:
- Encontrar personas y mascotas como las mías.
- Resolver dudas y compartir consejos.
- Encontrar planes, caminatas, eventos o retos.
- Crear y hacer crecer mi propia comunidad.
- Ganar y mostrar reconocimiento o insignias.
- Otro.

---

# 8. Semántica de medición

Abrir \`Explorar\`:
**NO cuenta como view de Comunidades.**

Abrir deliberadamente el tab \`Comunidades\`:
**sí cuenta como view de Comunidades.**

Cambiar a:
- Para ti;
- Eventos;

no crea views de Comunidades.

La métrica sigue siendo por cuenta autenticada.

---

# 9. Tab Eventos

Explorar mantiene la pestaña Eventos porque forma parte de su arquitectura de descubrimiento.

Hasta que Eventos pase su propia validación:
- no construir sistema real dentro de esta fase;
- no mostrar eventos falsos como activos;
- usar un estado coherente de próxima experiencia/preview si es necesario.

Comunidades no autoriza implementar Eventos.

---

# 10. Productos futuros

Productos/commerce forman parte de la visión futura de PAZO, pero están explícitamente pospuestos.

Por tanto:
- no añadir tab Productos ahora;
- no añadir marketplace;
- no introducir cards de commerce en el MVP;
- cuando se valide ese módulo, Explorar puede ser una de sus superficies de descubrimiento.

---

# 11. Qué NO debe volver a ocurrir

- reemplazar Explorar completo por una landing de Comunidades;
- medir community_view al entrar a Explorar;
- usar miembros ficticios como prueba social;
- usar Join/Joined antes de tener membership real;
- fingir búsqueda unificada;
- mezclar productos futuros dentro del MVP actual;
- rediseñar Explorar desde cero cuando ya existe una referencia aprobada.

---

# 12. Definition of Done visual para este ajuste

Antes de cerrar PR #16:

- Explorar conserva la apariencia y jerarquía de la referencia del Product Owner;
- hero/buscador/tabs mantienen el lenguaje visual aprobado;
- Para ti sigue sintiéndose como discovery hub;
- Comunidades es claramente una categoría;
- Comunidades se entiende antes del CTA;
- no hay member counts ficticios;
- no hay Join/Joined ficticio;
- community_view se registra únicamente al entrar al tab Comunidades;
- interés/intención persisten tras F5;
- demo no crea señales reales;
- Product Owner aprueba visual/end-to-end.
