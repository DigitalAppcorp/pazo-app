# PAZO — Instrumentación Genérica de Validación

**Estado:** GATE 6 — ESPECIFICACIÓN DE PRODUCTO CERRADA  
**Tipo:** I — infraestructura / habilitador  
**Resultado Gate 5:** BUILD NOW  
**Marco:** `docs/PAZO_MODULE_LIFECYCLE.md`  
**Protocolo:** `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`

---

# 1. Ficha de decisión

**Nombre:** Instrumentación genérica de validación  
**Tipo:** I — infraestructura  
**Estado:** aprobado para especificación  
**Usuario objetivo:** equipo de producto de PAZO; el usuario final solo interactúa con previews/fake doors transparentes  
**Problema:** PAZO no puede medir de forma fiable interés, intención y revisita en módulos opcionales  
**Resultado prometido:** evidencia persistente y comparable para decidir qué módulos merecen inversión  
**Por qué importa:** Comunidades está en experimento activo y Mapa tiene un fake door cuyo tracking actual es incompatible con el schema real  
**Valor con un solo usuario:** bajo como feature visible; alto como habilitador de decisiones  
**Dependencia de masa crítica:** baja para funcionar; la calidad estadística aumenta con muestra  
**Coste estimado:** bajo/medio  
**Riesgo operativo:** bajo  
**Riesgo de moderación:** bajo  
**Hipótesis de adquisición:** no en este MVP interno  
**Hipótesis de retención:** indirecta; evita construir funciones sin demanda  
**Hipótesis de monetización:** no  
**Alternativa más barata:** reutilizar `interactions`; descartada porque representa comportamiento social y exige UUIDs incompatibles con feature keys  
**Métrica principal:** viewers únicos, interest rate, revisita e intent distribution por cuenta + módulo  
**Criterio para construir:** existe una dependencia real de validación en más de un módulo y no hay señal persistente confiable  
**Criterio para posponer:** ningún módulo necesita validación activa  
**Disparador para reevaluar:** ya ocurrió; Comunidades y Mapa necesitan medición fiable

---

# 2. Gates 0–5

## Gate 0 — Idea
Crear un sistema genérico para medir demanda de módulos todavía no construidos.

**Cerrado.**

## Gate 1 — Valor
Evita decidir por intuición y permite comparar módulos opcionales con evidencia real.

**Cerrado.**

## Gate 2 — Coste/dependencias
Coste bajo/medio:
- persistencia pequeña;
- RLS;
- servicio frontend reutilizable;
- dos consumidores iniciales;
- sin API externa;
- sin moderación;
- sin Storage.

**Cerrado.**

## Gate 3 — Experimento mínimo
La versión más barata que resuelve la duda es:
- persistir views;
- persistir interés deduplicado;
- persistir una intención concreta;
- derivar revisita;
- conectar Comunidades y Mapa.

No construir dashboards ni analytics avanzados.

**Cerrado.**

## Gate 4 — Evidencia
Auditoría real:
- no existe tabla de feature signals/experiments;
- Comunidades no tiene señal persistente confirmada;
- Mapa intenta escribir un string en `interactions.target_id`, que es UUID;
- `interactions` exige `actor_pet_id` y no es un sistema de analytics de producto;
- solo existen 2 lugares reales, por lo que construir Mapa completo antes de medir demanda sería prematuro.

La necesidad de infraestructura está demostrada.

**Cerrado.**

## Gate 5 — Decisión
**BUILD NOW.**

Motivo:
infraestructura pequeña, reutilizable y requerida por módulos que ya están en validación.

---

# 3. Objetivo del MVP

Responder de forma fiable:

- cuántas cuentas únicas vieron un módulo en evaluación;
- cuántas dijeron “Me interesa”;
- qué porcentaje representa;
- cuántas regresaron otro día/sesión;
- qué uso concreto quieren;
- desde qué superficie interna llegaron.

No intenta responder adquisición externa todavía.

---

# 4. Identidad de medición

Unidad principal:

**cuenta autenticada única.**

No mascota.

La mascota activa puede guardarse como dimensión opcional, pero nunca aumenta el conteo de usuarios únicos.

No registrar:
- nombre;
- email;
- teléfono;
- texto libre;
- dirección;
- ubicación precisa.

---

# 5. Señales MVP

Solo tres señales persistentes:

## module_view
La cuenta vio una preview/módulo en evaluación.

Reglas:
- puede existir más de una view en sesiones/días distintos;
- repetición inmediata no debe inflar revisita;
- permite derivar revisitas.

## module_interest
La cuenta pulsa **Me interesa**.

Reglas:
- máximo una señal principal por cuenta + módulo;
- taps repetidos no aumentan demanda;
- no concede acceso ni crea membresía.

## module_intent
Respuesta a una sola pregunta:

**¿Qué te gustaría hacer aquí?**

Reglas:
- una opción codificada;
- sin texto libre en MVP;
- puede reemplazar la respuesta previa del mismo usuario/módulo.

---

# 6. Revisita

No crear evento manual `module_revisit`.

Se deriva cuando una misma cuenta tiene views del mismo módulo:
- en sesiones distintas; o
- en días distintos.

La definición técnica exacta de sesión pertenece a Gate 7.

---

# 7. Módulos consumidores iniciales

## Comunidades
Primer consumidor.

Estado visible:
- debe quedar claro que está **en evaluación**;
- no simular Join/Leave real;
- las comunidades mock pueden permanecer solo como ejemplos conceptuales;
- CTA principal del experimento: **Me interesa**.

Después del interés:
- mostrar una única pregunta opcional de intención.

Opciones iniciales:
- personas y mascotas de mi zona;
- grupos por especie/raza;
- crear mi propia comunidad;
- encuentros;
- consejos;
- otro.

“otro” es solo un código; no abre texto libre.

## Mapa / Radar Pazo
Segundo consumidor.

Mantener la preview actual, pero:
- eliminar el insert roto en `interactions`;
- usar el sistema genérico;
- registrar view al entrar;
- registrar interest al pulsar **Me interesa esta función**;
- pregunta opcional de intención.

Opciones iniciales:
- parques pet-friendly;
- veterinarias/servicios;
- lugares para comer/café con mascota;
- mascotas/personas cercanas;
- check-ins;
- otro.

Estas opciones miden intención; no aprueban funcionalidades todavía.

---

# 8. Transparencia UX

Todo fake door debe decir claramente que:
- la función está en evaluación o preparación;
- “Me interesa” ayuda a priorizar;
- pulsarlo no activa una función inexistente.

No usar:
- “Unirme” si no existe membresía;
- contadores falsos que aparenten usuarios reales;
- estados que simulen una función ya disponible.

---

# 9. Source interno

Cada signal puede conservar una fuente interna codificada, por ejemplo:
- `explore`;
- `map_tab`;
- `direct`;
- otra superficie futura.

No guardar URLs completas ni parámetros que puedan contener PII.

---

# 10. Session context

Para distinguir revisitas:
- cada sesión cliente puede tener un identificador aleatorio;
- no debe identificar al usuario fuera de PAZO;
- no es un secreto;
- no se usa para autenticación.

Su arquitectura exacta se define en Gate 7.

---

# 11. Métricas mínimas

Por módulo:

- unique viewers;
- unique interested;
- Interest Rate;
- viewers por día;
- revisit rate;
- intent distribution;
- source distribution.

No construir dashboard en este MVP.

Las métricas pueden consultarse con SQL/herramientas internas hasta justificar una interfaz administrativa.

---

# 12. Calidad de datos

- interés deduplicado por cuenta + módulo;
- una cuenta con varias mascotas cuenta una sola vez;
- views no deben duplicarse por render accidental;
- signals requieren sesión autenticada;
- timestamps del servidor;
- claves de módulo estables;
- no usar IDs mock como identidad analítica;
- no mezclar signals con likes/follows/saves.

---

# 13. Privacidad

Los signals son privados.

Usuarios:
- pueden registrar sus propias señales;
- no pueden leer señales agregadas de otros usuarios desde el cliente.

No exponer:
- lista de interesados;
- user IDs;
- métricas internas al público.

---

# 14. Fuera de alcance

- Google Analytics;
- Mixpanel;
- Amplitude;
- dashboard administrativo;
- cohortes avanzadas;
- funnels arbitrarios;
- heatmaps;
- tracking de clicks global;
- adquisición externa;
- atribución de signup;
- A/B testing;
- ubicación precisa;
- texto libre;
- analytics de contenido social real.

---

# 15. Post-lanzamiento

El sistema no se mide por “adopción” como feature.

Se valida por:
- eventos llegando sin duplicación;
- capacidad de consultar métricas fiables;
- Comunidades acumulando views/interest/intent;
- Mapa acumulando views/interest/intent.

Cuando exista muestra suficiente, esos datos alimentan Gate 4/5 de cada módulo consumidor.

---

# 16. Definition of Done de producto

La infraestructura está funcionalmente definida cuando:

- identidad principal por cuenta está cerrada;
- signals MVP están cerrados;
- deduplicación de interés está definida;
- revisita derivada está definida;
- intent de una pregunta está definido;
- privacidad está definida;
- Comunidades y Mapa están definidos como consumidores iniciales;
- fake doors son transparentes;
- no existe dashboard obligatorio;
- adquisición externa queda fuera;
- no se reutiliza `interactions`.

---

# 17. Próximo gate

Gate 6 fue aprobado por el Product Owner.

Gate 7 está cerrado en:
`docs/PAZO_VALIDATION_INSTRUMENTATION_ARCHITECTURE.md`

Siguiente etapa:
**Gate 8 — Implementación**.

No aplicar ninguna migración a Supabase sin autorización explícita.
