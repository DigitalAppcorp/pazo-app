# PAZO — Sistema Maestro de Decisión y Ciclo de Vida de Módulos

**Documento canónico para decidir qué construir, cuándo construirlo y cuánto construir.**  
**Objetivo principal:** ahorrar tiempo, código y tokens evitando desarrollar módulos antes de demostrar que aportan suficiente valor.

Este documento gobierna cualquier módulo nuevo o incompleto de PAZO.

---

# 0. Principio rector

Una idea no se convierte automáticamente en una fase de programación.

Antes de invertir en arquitectura, schema, RLS, pantallas y lógica se debe responder:

> **¿Vale la pena construir esto ahora, para quién y en qué versión mínima?**

PAZO usará dos carriles paralelos:

## Carril A — Validación de Producto
Sirve para:
- ideas nuevas;
- funciones opcionales;
- módulos sociales;
- módulos con efecto de red;
- hipótesis de adquisición;
- hipótesis de monetización.

Puede permanecer abierto sin bloquear el desarrollo principal.

## Carril B — Implementación
Solo recibe:
- utilidades núcleo con valor individual claro;
- obligaciones técnicas/seguridad;
- módulos que pasaron su gate de validación;
- MVP reducidos explícitamente aprobados.

**Un módulo en validación nunca debe bloquear otro módulo ya listo para construir.**

---

# 1. Clasificación inicial obligatoria

Antes de crear una sub-ruta técnica, clasificar el módulo.

## U — Utilidad individual
Entrega valor aunque exista un solo usuario.

Ejemplos:
- QR;
- alerta perdida;
- agenda;
- documentos;
- recordatorios.

### Tratamiento
Gate ligero.  
No necesita fake door obligatoriamente si:
- resuelve un problema claro;
- el alcance es razonable;
- encaja en el MVP.

---

## N — Network / efecto de red
Necesita otras personas, contenido o densidad para funcionar bien.

Ejemplos:
- comunidades;
- mensajes;
- matches;
- eventos sociales;
- check-ins sociales.

### Tratamiento
Gate completo antes de construir.

Debe evaluar:
- demanda;
- masa crítica;
- moderación;
- cold start;
- coste operativo.

---

## A — Adquisición
Su propósito principal o secundario es traer usuarios desde fuera de PAZO.

Ejemplos potenciales:
- páginas públicas;
- recursos compartibles;
- SEO;
- invitaciones;
- comunidades públicas.

### Tratamiento
Debe probarse externamente.  
El interés dentro de la app NO prueba adquisición.

---

## M — Monetización
Busca generar ingresos o desbloquear funciones pagas.

### Tratamiento
No construir por intuición.

Debe existir:
- valor demostrado;
- usuario objetivo;
- entitlement claro;
- hipótesis de disposición a pagar;
- regla de qué sigue siendo gratuito.

---

## I — Infraestructura / habilitador
No es una función que el usuario “quiera” por sí sola, pero habilita otras.

Ejemplos:
- notificaciones;
- búsqueda;
- moderación;
- analytics;
- seguridad;
- performance.

### Tratamiento
Se implementa cuando una dependencia real la requiere.  
No necesita fake door.

---

# 2. Ficha de decisión de módulo

Todo módulo debe tener una ficha corta antes de avanzar.

No escribir especificaciones de 20 páginas en esta etapa.

## Plantilla

**Nombre:**  
**Tipo:** U / N / A / M / I  
**Estado:** idea / validación / aprobado / pospuesto / implementación / completado  
**Usuario objetivo:**  
**Problema o deseo:**  
**Resultado que promete:**  
**Por qué podría importar para PAZO:**  
**Valor si solo existe un usuario:**  
**Dependencia de masa crítica:** baja / media / alta  
**Coste estimado:** bajo / medio / alto / muy alto  
**Riesgo operativo:** bajo / medio / alto  
**Riesgo de moderación:** bajo / medio / alto  
**Hipótesis de adquisición:** sí/no + explicación  
**Hipótesis de retención:** sí/no + explicación  
**Hipótesis de monetización:** sí/no + explicación  
**Alternativa más barata para probarlo:**  
**Métrica principal:**  
**Criterio para construir:**  
**Criterio para posponer:**  
**Disparador para reevaluar:**  

La ficha debe caber en una sola sección.  
Si todavía no podemos llenarla, no estamos listos para diseñar el módulo.

---

# 3. Gates del ciclo de vida

## Gate 0 — Idea
Pregunta:
> ¿Qué creemos que debería existir?

Salida:
- ficha básica;
- clasificación U/N/A/M/I.

No se programa.

---

## Gate 1 — Valor
Preguntas:
- ¿qué problema/deseo resuelve?
- ¿quién lo necesita?
- ¿qué cambia para ese usuario si existe?
- ¿hay otra función ya existente que resuelva lo mismo?
- ¿es importante para el MVP o solo “suena bien”?

Salida:
- propuesta de valor;
- razón para continuar o detener.

Si no hay valor claro → **POSPUESTO**.

---

## Gate 2 — Coste y dependencia
Evaluar:
- frontend;
- backend;
- Storage;
- RLS;
- moderación;
- notificaciones;
- búsqueda;
- APIs externas;
- soporte;
- efecto de red;
- privacidad;
- mantenimiento.

Salida:
- coste bajo/medio/alto/muy alto;
- dependencias;
- riesgo de cold start.

Cuanto más alto el coste, más fuerte debe ser la evidencia antes de construir.

---

## Gate 3 — Diseño de propuesta y experimento mínimo

Antes de instrumentar clicks o preguntar “qué función quieres”, definir **qué producto estamos poniendo delante del usuario**.

### 3A — Mapa de solución
Para el área que se quiere validar, documentar:

- job / resultado que busca el usuario;
- problema o deseo;
- capacidades candidatas;
- módulos o submódulos que dependen entre sí;
- funciones que son infraestructura y NO deben someterse a voto;
- funciones que solo tienen sentido como parte de un bundle coherente;
- riesgos de masa crítica, privacidad, moderación, APIs y operación;
- qué capacidades podrían servir también para adquisición, retención o monetización;
- alternativas que el Product Owner no había considerado.

### 3B — Conceptos coherentes
No validar listas arbitrarias de microfunciones.

Agrupar capacidades en **experiencias o propuestas de valor coherentes**.

Ejemplo:
“vida local con tu mascota” puede incluir mapa, lugares, eventos y check-ins.
No tiene sentido interpretar cada click aislado como autorización independiente si las piezas dependen unas de otras.

Cada concepto debe definir:
- promesa principal;
- qué incluye;
- qué NO incluye;
- dependencia técnica/operativa;
- primer hook visible;
- por qué sería atractivo;
- qué comportamiento demostraría valor real.

### 3C — Arquitectura de elección
Antes de mostrar opciones:

- decidir qué se compara y qué no;
- evitar opciones solapadas;
- evitar sesgo por orden/posición;
- incluir la posibilidad de no elegir;
- no asumir que el usuario conoce la solución técnica;
- preguntar primero por **resultado deseado**, no por nombres internos de módulos;
- distinguir interés, intención y comportamiento real;
- definir qué combinación de señales justifica construir.

### 3D — Experimento mínimo
Solo después elegir la prueba más barata que responda la principal duda.

Ejemplos:
- fake door;
- preview de una experiencia;
- CTA “Me interesa”;
- tarea concreta;
- lista de espera;
- encuesta de una pregunta;
- prototipo visual;
- prueba manual/concierge;
- landing externa.

Regla:

> **No instrumentar una opción hasta saber qué hipótesis representa y qué decisión permitirá tomar.**

> **No construir backend completo para validar una hipótesis que puede medirse con una pantalla y un evento.**

### Salida obligatoria de Gate 3

Para módulos opcionales/network, Gate 3 debe producir un artefacto de producto que contenga:
- mapa de capacidades;
- bundles/conceptos;
- dependencias;
- hooks;
- arquitectura de elección;
- experimento;
- métrica;
- criterio de decisión.

Sin este artefacto no se autoriza instrumentación ni Gate 4.

---

## Gate 4 — Datos
Recoger evidencia suficiente.

No mirar solo clicks brutos.

Medir:
- usuarios únicos;
- conversión;
- revisitas;
- intención;
- fuente;
- segmentos relevantes;
- adquisición externa si aplica.

Salida:
- evidencia insuficiente;
- señal débil;
- señal prometedora;
- señal fuerte.

---

## Gate 5 — Decisión de inversión
Solo cuatro resultados:

### BUILD NOW
Construir el módulo definido.

### MVP REDUCIDO
Construir únicamente el núcleo que explica la demanda.

### EXPERIMENTO ACTIVO
Seguir midiendo.  
No bloquear otros módulos.

### POSPUESTO
Mover al backlog con disparador explícito.

---

## Gate 6 — Especificación de producto
**Solo después de BUILD NOW o MVP REDUCIDO.**

Aquí sí definimos:
- funcionalidades;
- qué NO entra;
- roles;
- permisos;
- flujos;
- estados;
- contenido;
- errores;
- notificaciones;
- privacidad;
- monetización futura;
- Definition of Done.

Esta etapa produce la sub-ruta funcional del módulo.

---

## Gate 7 — Arquitectura técnica
Solo después de cerrar producto.

Definir:
- tablas;
- relaciones;
- RLS;
- RPC;
- Storage;
- paginación;
- índices;
- ownership;
- concurrencia;
- APIs;
- migraciones;
- tests.

---

## Gate 8 — Implementación
Seguir el workflow permanente de PAZO:
- rama;
- backend versionado;
- build;
- autorización Supabase;
- pruebas;
- visual;
- merge.

---

## Gate 9 — Validación post-lanzamiento
Construido no significa exitoso.

Medir:
- adopción;
- uso recurrente;
- abandono;
- errores;
- retención;
- coste operativo.

Posibles decisiones:
- mantener;
- mejorar;
- simplificar;
- retirar;
- monetizar.

---

# 4. Regla de evidencia proporcional al coste

No todos los módulos necesitan la misma validación.

## Coste bajo + utilidad alta
Puede pasar rápido a implementación.

## Coste alto + utilidad individual
Necesita buen alcance, pero no necesariamente fake door.

## Coste alto + efecto de red
Necesita evidencia antes de backend completo.

## Coste alto + efecto de red + moderación
Requiere evidencia + plan de masa crítica + plan de seguridad.

Comunidades cae actualmente en esta última categoría.

---

# 5. Instrumentación genérica futura

Cuando implementemos el sistema de validación, debe ser **genérico** para todos los módulos.

No crear una tabla distinta para Comunidades, otra para Mapa y otra para Matches.

## Identidad principal de medición

La métrica principal debe ser por **cuenta/usuario único**, no por mascota.

Razón:
una persona con cinco mascotas no debe contar como cinco interesados.

La mascota activa puede guardarse únicamente como dimensión de segmentación.

## Eventos conceptuales

- `module_view`
- `module_interest`
- `module_intent`
- `module_revisit` — preferiblemente derivado de views en días/sesiones distintas
- `module_external_visit`
- `module_signup_attribution`

## Reglas

- un `module_interest` principal por cuenta + módulo;
- evitar que clicks repetidos inflen interés;
- conservar timestamp;
- conservar source;
- contexto mínimo;
- no guardar PII innecesaria;
- separar métricas internas de adquisición externa.

**Este documento no autoriza todavía crear tablas o código.**

---

# 6. Qué significa “Me interesa”

No es un Like.

Representa:

> “Si esta función existiera de forma útil, quiero usarla.”

Por eso:
- debe ser reversible o al menos deduplicada;
- debe medirse por usuario único;
- no debe confundirse con abrir la pantalla;
- no debe conceder acceso ficticio;
- el usuario debe entender que la función está en evaluación.

---

# 7. Segunda señal: intención concreta

Un click puede ser curiosidad.

Para módulos grandes puede pedirse una pregunta opcional después de “Me interesa”:

> ¿Qué te gustaría hacer aquí?

El objetivo no es hacer una encuesta larga.

Debe ser:
- una pregunta;
- 4–6 opciones;
- “Otro” opcional.

Esta señal define el **MVP reducido**.

Ejemplo:
si Comunidades interesa principalmente por encuentros locales, no construimos necesariamente foros, roles avanzados, encuestas y diez tipos de comunidad.

---

# 8. Tercera señal: revisita

Volver al módulo en otro momento suele ser más fuerte que un click inicial.

Por eso interesa medir:
- vio una vez;
- mostró interés;
- volvió días después.

Una intención + revisita es más valiosa que diez taps accidentales de la misma cuenta.

---

# 9. Umbrales y muestras

No existe un porcentaje universal que garantice éxito.

Los números se usan como orientación.

## Tamaño de muestra

- <30 viewers únicos: insuficiente para decisión fuerte;
- 30–99: direccional;
- 100+: base inicial razonable.

## Interest Rate orientativo

- <10%: señal débil;
- 10–24%: continuar validando;
- >=25%: señal prometedora.

**Ningún umbral aprueba automáticamente un módulo.**

También se evalúan:
- coste;
- utilidad;
- revisita;
- intención;
- masa crítica;
- comparación con otros módulos.

---

# 10. Priorización entre módulos

PAZO no seguirá “el número de fase” como única prioridad.

Cuando existan varios candidatos listos, comparar:

1. valor inmediato;
2. demanda observada;
3. retención esperada;
4. adquisición;
5. coste de desarrollo;
6. coste operativo;
7. dependencia de masa crítica;
8. riesgo;
9. dependencia para otros módulos;
10. tiempo hasta entregar valor.

## Regla

Una función social atractiva no desplaza automáticamente una utilidad núcleo.

---

# 11. Dos carriles de roadmap

## Carril de Validación
Puede contener simultáneamente:
- Comunidades;
- Mapa social;
- Matches;
- Eventos;
- nuevas ideas.

No bloquea delivery.

## Carril de Implementación
Debe tener, idealmente, un módulo principal a la vez.

Recibe solo:
- módulos aprobados;
- utilidades núcleo;
- infraestructura necesaria.

Esto evita que PAZO quede detenido esperando meses de datos de una idea opcional.

---

# 12. Registro actual de módulos

Esta clasificación es estratégica y puede cambiar con datos.

| Módulo | Tipo | Estado recomendado | Motivo |
|---|---|---|---|
| QR / rescate | U + A | COMPLETADO | utilidad individual + página pública |
| Comunidades | N + posible A/M | EXPERIMENTO ACTIVO | alto coste, cold start, moderación |
| Agenda/Cuidados | U | CANDIDATO A IMPLEMENTACIÓN | utilidad individual clara |
| Documentos | U | CANDIDATO A IMPLEMENTACIÓN | utilidad privada clara |
| Mapa/Lugares | U/N + posible A | VALIDAR ALCANCE | APIs, ubicación y efecto local |
| Check-ins | N | VALIDAR | depende de densidad |
| Mensajería | N + I | VALIDAR/POSTERGAR | valor depende de red activa + moderación |
| Notificaciones generales | I | IMPLEMENTAR POR DEPENDENCIA | no es módulo de demanda |
| Explore/Search | I | IMPLEMENTAR CUANDO HAYA CONTENIDO | utilidad depende de entidades reales |
| Rediseño UI | calidad | PLANIFICADO | mejora producto existente |
| Matches | N + M | BACKLOG/VALIDAR | network effect + seguridad |
| Adopciones | U/N | BACKLOG | requiere organizaciones/moderación |
| Servicios | marketplace | BACKLOG | producto operativo distinto |
| Tiendas/Publicidad | M | BACKLOG | monetización posterior |

---

# 13. Comunidades bajo este sistema

Estado actual:

**EXPERIMENTO ACTIVO.**

No invertir todavía en:
- roles;
- schema;
- permisos;
- Feed;
- eventos;
- moderación;
- administración avanzada.

Primero:
1. reconstruir el fake door de forma genérica;
2. medir interés;
3. medir intención;
4. observar revisita;
5. medir masa crítica;
6. probar adquisición externa solo si interesa usar Comunidades como growth loop.

Mientras tanto, el Carril de Implementación puede continuar con otro módulo.

---

# 14. Regla de adquisición

Una función puede ser:
- útil;
- entretenida;
- retenedora;
- adquirente.

No son lo mismo.

Para declarar que un módulo atrae usuarios nuevos debemos atribuir:
- visita externa;
- registro;
- fuente.

El fake door interno no sirve para esa conclusión.

---

# 15. Regla de monetización

No decidir funciones premium antes de conocer el uso.

Primero:
1. demostrar valor;
2. observar qué funciones usan;
3. detectar límites o necesidades avanzadas;
4. decidir qué puede ser premium sin romper el valor gratuito.

Esto aplica especialmente a Comunidades.

---

# 16. Protocolo para ahorrar tokens

Al retomar un módulo en una conversación futura:

1. leer este documento;
2. leer la ficha/sub-ruta del módulo;
3. revisar su estado actual;
4. continuar solo desde el gate pendiente;
5. no volver a debatir gates ya cerrados;
6. no diseñar etapas posteriores anticipadamente.

Ejemplo:

Si Comunidades está en Gate 4 — Datos, no gastar tokens en diseñar roles.

---

# 17. Definition of Ready para programar un módulo opcional

Un módulo opcional solo puede entrar al Carril de Implementación cuando exista:

- resultado BUILD NOW o MVP REDUCIDO;
- problema/deseo definido;
- usuario objetivo;
- alcance incluido;
- alcance excluido;
- decisiones críticas cerradas;
- métrica post-lanzamiento;
- Definition of Done;
- prioridad frente a otros candidatos.

Después de eso comienza arquitectura y código.

---

# 18. Próximo paso del sistema

No programar todavía.

El siguiente trabajo es documental/producto:

1. aplicar este sistema a Comunidades;
2. definir la ficha de Comunidades;
3. definir el fake door genérico que luego servirá a otros módulos;
4. decidir qué métricas mínimas tendrá;
5. decidir qué módulo entra al Carril de Implementación mientras Comunidades recopila datos.

Solo después se autoriza código de instrumentación.
