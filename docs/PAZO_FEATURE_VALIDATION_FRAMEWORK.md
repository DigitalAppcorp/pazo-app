# PAZO — Marco de Validación de Funcionalidades

**Objetivo:** evitar construir módulos costosos sin evidencia suficiente de utilidad, demanda o impacto para el MVP.

Este marco aplica especialmente a funciones opcionales, sociales, de entretenimiento o con efecto de red.

---

# 1. Clasificación antes de programar

Toda función nueva debe clasificarse primero.

## A. Utilidad directa
Entrega valor aunque PAZO tenga pocos usuarios.

Ejemplos:
- QR de mascota;
- alertas de mascota perdida;
- agenda/cuidados;
- documentos;
- recordatorios.

Estas funciones pueden justificarse por resolver un problema concreto del dueño.

## B. Social / engagement
Su valor aumenta con más usuarios y contenido.

Ejemplos:
- comunidades;
- eventos;
- matches;
- ciertos módulos sociales.

Estas funciones tienen riesgo de "cold start": si están vacías, su valor puede ser casi cero.

## C. Adquisición
Puede atraer usuarios nuevos desde fuera de PAZO.

Ejemplos potenciales:
- páginas públicas compartibles;
- contenido indexable;
- invitaciones;
- comunidades con identidad local;
- recursos públicos útiles.

Una función no debe considerarse de adquisición solo porque guste a usuarios que ya están dentro de PAZO.

---

# 2. Regla de validación

Antes de construir por completo un módulo B o C, responder:

1. ¿Qué problema o deseo resuelve?
2. ¿Para quién?
3. ¿Qué beneficio concreto genera?
4. ¿Depende de otros usuarios para funcionar?
5. ¿Qué coste técnico y operativo tiene?
6. ¿Qué riesgo de moderación/abuso introduce?
7. ¿Qué métrica demostraría interés real?
8. ¿Puede probarse esa hipótesis con una versión mucho más barata?

Si no podemos responder estas preguntas, el módulo no entra todavía en desarrollo completo.

---

# 3. Fake door / "Me interesa"

PAZO puede mostrar un módulo no construido como experimento transparente.

El usuario puede:
- entrar a una preview;
- entender qué promete el módulo;
- presionar "Me interesa";
- opcionalmente indicar qué desea hacer allí.

No se debe engañar al usuario haciéndole creer que la función ya existe.

## Eventos mínimos a medir

- `feature_view`: usuario único que vio el módulo.
- `feature_interest`: usuario único que presionó "Me interesa".
- `feature_revisit`: volvió al módulo en otro día/sesión.
- `feature_intent_reason`: opcional, respuesta a qué quiere hacer.
- `feature_source`: desde dónde llegó.

Las métricas deben calcularse sobre usuarios únicos además de eventos brutos.

---

# 4. Métricas principales

## Interest Rate

`usuarios únicos que presionaron Me interesa / usuarios únicos que vieron el módulo`

Mide demanda entre usuarios ya existentes.

## Revisit Rate

Usuarios que vuelven al módulo posteriormente.

Una segunda visita puede ser una señal más fuerte que un click de curiosidad.

## Intent Distribution

Si preguntamos "¿qué te gustaría hacer aquí?", permite descubrir qué funcionalidad concreta vale la pena construir.

## Acquisition Conversion

Solo aplica si existe una entrada externa.

`usuarios nuevos registrados desde una landing/enlace del módulo / visitantes externos del módulo`

**Importante:** el fake door dentro de la app NO mide adquisición.

---

# 5. Señales para tomar una decisión

Los siguientes umbrales son una guía inicial, no una ley permanente.

No tomar decisiones con muestras demasiado pequeñas.

## Muestra

- menos de 30 viewers únicos: señal insuficiente;
- 30–99: señal direccional;
- 100+: señal más confiable para la etapa inicial.

## Interest Rate orientativo

- <10%: normalmente POSPONER;
- 10–24%: mantener experimento y aprender por qué;
- >=25%: candidato serio a MVP reducido, si también encaja con prioridades y coste.

Además del porcentaje, observar:
- número absoluto de interesados;
- visitas repetidas;
- intención concreta;
- relación con retención;
- comparación contra otros módulos no construidos.

No construir únicamente porque un módulo tenga más clicks si existe otra función con más utilidad y menor coste.

---

# 6. Señal de adquisición

Para saber si una función atrae gente a PAZO se necesita una prueba externa.

Opciones baratas:
- landing pública del concepto;
- enlace compartible;
- contenido orgánico en redes;
- página pública indexable;
- lista de espera;
- CTA de registro.

Medir:
- visitas externas;
- registros;
- porcentaje de conversión;
- invitaciones/compartidos.

No construir una red social interna completa solo para descubrir después si atrae usuarios.

---

# 7. Resultado posible

Cada módulo validado termina en uno de estos estados:

## BUILD NOW
Hay evidencia suficiente y es prioritario.

Se define funcionalidad y se programa.

## MVP REDUCIDO
Hay interés, pero no justifica construir todo.

Se implementa la versión mínima que prueba el valor central.

## EXPERIMENTO ACTIVO
Todavía no hay evidencia suficiente.

Se conserva el fake door / "Me interesa".

## POSPUESTO
Demanda baja o coste demasiado alto.

Se mantiene en backlog y se define un disparador para reevaluarlo.

---

# 8. Disparadores de reevaluación

Un módulo pospuesto puede reabrirse cuando ocurra alguno:

- Interest Rate cruza el umbral acordado;
- alcanza un número mínimo de usuarios interesados;
- hay suficientes usuarios activos para evitar cold start;
- usuarios piden repetidamente la función por otro canal;
- aparece una oportunidad clara de adquisición;
- una función posterior depende de ese módulo.

---

# 9. Auditoría del mecanismo actual de PAZO

El Product Owner reporta que Gemini implementó un disparador de entrada al módulo + botón "Me interesa".

En la auditoría actual de `main`, ramas visibles y Supabase:
- sí existe tracking genérico de interacciones;
- Supabase actualmente contiene eventos reales principalmente de posts;
- no se confirmó todavía una señal persistente específica `feature_interest` ni una tabla específica de interés.

Por lo tanto:

**No duplicar el mecanismo.**

Antes de depender de sus métricas:
1. localizar/sincronizar la implementación exacta de Gemini;
2. verificar dónde guarda los datos;
3. comprobar que mide usuarios únicos y no solo clicks;
4. normalizarla a este marco si hace falta.

---

# 10. Regla global

Para módulos opcionales/sociales de alto coste:

**Validar antes de construir.**

La hoja maestra puede marcar una fase como "EN VALIDACIÓN" sin obligar a programarla inmediatamente.
