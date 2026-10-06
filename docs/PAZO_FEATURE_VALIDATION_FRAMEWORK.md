# PAZO — Protocolo de Experimentos de Validación

**Documento operativo subordinado a:** `docs/PAZO_MODULE_LIFECYCLE.md`

Este archivo explica cómo medir hipótesis baratas antes de construir módulos opcionales.

No decide por sí solo qué construir.

---

# 1. Cuándo usarlo

Usarlo principalmente para módulos:
- sociales;
- opcionales;
- con efecto de red;
- caros;
- con hipótesis de adquisición;
- con hipótesis de monetización no demostrada.

No es obligatorio para seguridad, infraestructura o utilidades núcleo claramente justificadas.

---

# 2. Fake door

Una preview puede explicar una función todavía no construida.

CTA recomendado:

**Me interesa**

Debe quedar claro que la función está en evaluación.

No simular una función inexistente como si estuviera disponible.

---

# 3. Eventos conceptuales

La instrumentación futura debe ser genérica.

- `module_view`
- `module_interest`
- `module_intent`
- revisita derivada de views en sesiones/días distintos
- `module_external_visit`
- `module_signup_attribution`

No crear eventos/tablas específicos por módulo si el mismo sistema puede servir a todos.

---

# 4. Unidad de medición

Principal:

**cuenta/usuario único**

No mascota.

Motivo:
una cuenta con varias mascotas no debe inflar la demanda.

La mascota activa puede usarse como dimensión de segmentación.

---

# 5. Métricas

## Interest Rate

`usuarios únicos interesados / usuarios únicos que vieron el módulo`

## Revisit Rate

Usuarios que regresaron en otro día/sesión.

## Intent Distribution

Respuesta a una pregunta corta sobre qué desea hacer allí.

## Acquisition Conversion

Solo para tráfico externo:

`registros atribuidos / visitantes externos`

Un fake door interno no mide adquisición.

---

# 6. Pregunta de intención

Para módulos grandes, después de “Me interesa” puede mostrarse una sola pregunta:

> ¿Qué te gustaría hacer aquí?

Máximo:
- 4–6 opciones;
- “Otro” opcional.

No convertirlo en una encuesta larga.

---

# 7. Calidad de datos

- deduplicar interés por cuenta + módulo;
- no contar taps repetidos como demanda nueva;
- conservar fecha;
- conservar source;
- evitar PII innecesaria;
- distinguir tráfico interno de externo;
- medir usuarios únicos además de eventos brutos.

---

# 8. Lectura orientativa

## Muestra
- <30 viewers únicos: insuficiente;
- 30–99: direccional;
- 100+: base inicial razonable.

## Interest Rate
- <10%: débil;
- 10–24%: seguir validando;
- >=25%: prometedor.

Estos valores **no aprueban automáticamente** un módulo.

La decisión final usa también:
- coste;
- revisita;
- intención;
- masa crítica;
- riesgo;
- prioridad frente a otros módulos.

---

# 9. Experimento externo

Si queremos probar adquisición:

- landing pública;
- enlace compartible;
- contenido orgánico;
- lista de espera;
- CTA de registro.

Medir:
- visitantes externos;
- registros;
- conversión;
- fuente.

No construir un módulo social completo para descubrir si atrae usuarios.

---

# 10. Estado de la implementación

El Product Owner reportó que existió una implementación de Gemini con entrada al módulo + “Me interesa”.

Auditoría posterior:
- no está confirmada en `main`;
- no se encontró una señal persistente específica en Supabase;
- probablemente se perdió durante reescrituras anteriores.

Decisión:

**No intentar recuperar lógica antigua a cualquier costo.**

Cuando se autorice código de instrumentación:
- se construirá una implementación genérica;
- será pequeña;
- servirá para Comunidades y módulos futuros;
- tendrá tests/contratos claros;
- no modificará módulos reales fuera del tracking necesario.

---

# 11. Salida del experimento

El experimento alimenta el Gate 5 de `PAZO_MODULE_LIFECYCLE.md`.

Resultados:
- BUILD NOW;
- MVP REDUCIDO;
- EXPERIMENTO ACTIVO;
- POSPUESTO.


---

# Regla de portafolio y bundles

La validación de PAZO no debe convertirse en una votación de microfunciones.

Antes de crear opciones de interés:

1. definir el job/outcome;
2. mapear capacidades posibles;
3. separar infraestructura de funciones elegibles;
4. detectar dependencias;
5. agrupar capacidades en conceptos coherentes;
6. definir qué concepto/resultado se está validando;
7. solo después diseñar instrumentación.

## Riesgo de “caminos de hormiga”

Si se pregunta por acciones aisladas, los datos pueden empujar a construir piezas inconexas.

Ejemplos de interpretación incorrecta:
- muchos votos por chat ≠ Mensajería merece ser módulo principal;
- muchos votos por eventos ≠ Eventos funciona sin comunidad/densidad;
- muchos votos por mascotas cercanas ≠ ubicación precisa es aceptable;
- muchos votos por mapa ≠ hay suficiente contenido local para un mapa útil.

La decisión se toma sobre **minimum coherent product slices**, no sobre cada click aislado.

---

# Regla de atractivo vs valor

Una opción atractiva puede ganar clicks por novedad y aun así tener:
- baja retención;
- alto cold start;
- coste operativo alto;
- problemas de privacidad;
- dependencia de contenido inexistente.

Por eso se separan cuatro señales:

1. **Atención:** abrió/vio el concepto.
2. **Interés:** quiere que exista.
3. **Intención:** qué resultado desea.
4. **Comportamiento:** hizo una acción que aproxima uso real.

Para módulos caros/network, interés sin comportamiento no basta para BUILD NOW.

---

# Regla de conceptos y variantes

Si se cambia sustancialmente:
- promesa;
- bundle;
- copy principal;
- layout de elección;
- opciones;

los datos deben poder distinguir la versión del concepto.

No mezclar resultados históricos de propuestas distintas como si fueran el mismo experimento.

---

# Regla de dependencias

Funciones de soporte no siempre se validan directamente.

Ejemplos:
- notificaciones;
- búsqueda;
- chat dentro de una experiencia;
- moderación;
- filtros;
- geocoding;
- permisos.

Si una capacidad es necesaria para entregar un concepto ganador, puede entrar como dependencia aunque nadie haya “votado” por ella.

---

# Regla de portfolio

Antes de comparar Comunidades, Mapa, Matches u otros módulos opcionales, crear y mantener:

`docs/PAZO_PRODUCT_CAPABILITY_PORTFOLIO.md`

Debe contener:
- pilares de valor;
- jobs;
- conceptos/bundles;
- capacidades;
- dependencias;
- riesgos;
- hooks;
- señales necesarias;
- criterio de construcción.

Este portfolio es el filtro anterior a la instrumentación.
