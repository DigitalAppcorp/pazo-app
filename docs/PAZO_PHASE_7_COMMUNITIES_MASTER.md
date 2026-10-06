# PAZO — Sub-Ruta Maestra Fase 7: Comunidades

**Estado:** CARRIL DE VALIDACIÓN — EXPERIMENTO ACTIVO  
**Fase padre:** Fase 7  
**Ciclo de vida:** `docs/PAZO_MODULE_LIFECYCLE.md`  
**Protocolo de experimentos:** `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`

---

# 0.1 Ficha de decisión actual

**Nombre:** Comunidades  
**Tipo:** N — efecto de red; posible A — adquisición; posible M — monetización futura  
**Estado:** EXPERIMENTO ACTIVO  
**Usuario objetivo:** dueños de mascotas que buscan pertenencia, información o actividad alrededor de intereses compartidos  
**Problema/deseo:** conexión con personas/mascotas afines, grupos locales o especializados  
**Resultado prometido:** pertenencia, descubrimiento, intercambio y posibles encuentros  
**Valor con un solo usuario:** bajo  
**Dependencia de masa crítica:** alta  
**Coste estimado:** muy alto  
**Riesgo operativo:** alto  
**Riesgo de moderación:** alto  
**Hipótesis de adquisición:** comunidades públicas/locales podrían generar invitaciones, contenido compartible o tráfico externo  
**Hipótesis de retención:** pertenencia y contenido recurrente podrían aumentar revisitas  
**Hipótesis de monetización:** herramientas avanzadas de administración podrían ser premium en el futuro  
**Alternativa más barata para probarlo:** fake door + “Me interesa” + una pregunta de intención  
**Métrica principal:** Interest Rate por cuenta única + revisita + concentración de intención  
**Criterio para construir:** señal prometedora + uso concreto dominante + plan realista para evitar comunidades vacías  
**Criterio para posponer:** interés débil, intención difusa, falta de masa crítica o coste superior a módulos de utilidad  
**Disparador para reevaluar:** crecimiento suficiente de audiencia/interés o evidencia externa de adquisición


---

# 0.2 Banco de ideas y auditoría conceptual

Antes de cerrar el experimento de Fase 7.0A, el Product Owner debe tener un espacio explícito para descargar ideas del módulo sin necesidad de estructurarlas.

## Objetivo

Capturar ideas antes de decidir qué mostrar en el fake door y antes de gastar tokens en especificación completa.

Las ideas pueden ser:
- funcionales;
- sociales;
- de identidad/status;
- de engagement;
- de adquisición;
- de retención;
- de monetización;
- de seguridad/moderación;
- de administración;
- de infraestructura;
- visuales/UX;
- futuras o experimentales.

## Flujo obligatorio

### A. Descarga de ideas
El Product Owner puede entregar ideas sin orden ni justificación completa.

No pedirle que las convierta primero en especificaciones.

### B. Auditoría conceptual
El AI debe analizar cada idea en:
- problema/deseo que resuelve;
- beneficio real;
- atractivo inicial;
- utilidad recurrente;
- riesgo de novedad sin retención;
- dependencia con otras funciones;
- coste técnico;
- coste operativo;
- moderación/privacidad/seguridad;
- potencial de adquisición;
- potencial de monetización inmediata o futura;
- encaje con el MVP;
- si necesita masa crítica;
- si requiere validación o es una dependencia necesaria.

### C. Clasificación
Cada idea puede quedar como una o varias de:
- CORE si Comunidades se construye;
- MVP REDUCIDO candidato;
- ENGAGEMENT;
- IDENTIDAD / STATUS;
- ADQUISICIÓN;
- MONETIZACIÓN;
- INFRAESTRUCTURA / dependencia;
- FUTURO;
- POSPONER;
- DESCARTAR.

Esta clasificación NO autoriza implementación.

### D. Uso en el experimento
Solo después de auditar el banco de ideas se decide:
- qué visión mínima de Comunidades debe comunicar la preview;
- qué beneficios deben verse para que el usuario entienda la propuesta;
- qué ideas merecen aparecer como opciones de intención;
- qué ideas son soporte y no deben convertirse en botones de votación;
- qué ideas deben guardarse para después de BUILD NOW/MVP REDUCIDO.

## Regla de ahorro de tokens

No definir completamente permisos, tablas, roles, economía, niveles o catálogos de una idea todavía no aprobada.

Definir únicamente lo suficiente para:
1. entender su valor;
2. detectar dependencias/riesgos;
3. decidir si debe influir en el experimento;
4. saber cuándo retomarla.

## Primera idea registrada — Insignias de Comunidades

**Origen:** Product Owner.

Idea inicial:
- administradores y otros roles podrían tener insignias visibles en vez de una simple etiqueta;
- las insignias podrían mostrarse también en el perfil de la mascota;
- podrían reforzar diferenciación, pertenencia e identidad;
- podría existir una vía de monetización inmediata o futura alrededor de ciertas insignias/herramientas, todavía no definida.

Auditoría preliminar, NO decisión final:
- insignias de autoridad real como Admin/Moderador probablemente pertenecen a identidad funcional y confianza, no deberían comprarse;
- insignias de logros/pertenencia pueden ser candidatas de engagement/status;
- insignias cosméticas podrían evaluarse como monetización futura;
- mostrar insignias fuera de la comunidad podría convertirlas en un sistema transversal de identidad/reconocimiento de PAZO;
- no diseñar todavía catálogo, rarezas, niveles, economía ni venta hasta que Comunidades pase el gate correspondiente.

**Estado:** IDEA REGISTRADA — PENDIENTE DE AUDITORÍA DURANTE LA LLUVIA DE IDEAS.

---

# 1. Pregunta principal

Antes de definir schema, roles, permisos o pantallas:

> ¿Comunidades genera suficiente valor para entrar al MVP ahora?

No asumir que sí solo porque es una función común en redes sociales.

---

# 2. Decisiones ya confirmadas

Si Comunidades finalmente se construye:

- cualquier usuario podrá crear una comunidad;
- no necesitará membresía paga para crearla;
- el creador será propietario/administrador inicial;
- la administración básica será gratuita;
- una futura membresía podrá desbloquear herramientas adicionales;
- esas herramientas premium todavía NO están definidas.

---

# 3. Hipótesis de valor

Comunidades podría aportar tres tipos de valor.

## Engagement
- motivo adicional para volver a PAZO;
- conversaciones alrededor de intereses concretos;
- contenido más especializado que el Feed general;
- grupos por especie, raza, zona o actividad.

## Retención
- pertenencia a grupos;
- relaciones recurrentes;
- eventos o conversaciones que crean hábito.

## Adquisición
Podría atraer usuarios nuevos si genera:
- páginas públicas compartibles;
- comunidades locales;
- invitaciones;
- contenido útil indexable;
- enlaces externos con valor propio.

**Pero esto es una hipótesis.**

Un click dentro de PAZO demuestra interés interno, no adquisición.

---

# 4. Riesgos y coste real

Comunidades es un módulo de efecto de red.

Sus riesgos:

- comunidades vacías;
- demasiado pocos usuarios por grupo;
- fragmentación del contenido;
- moderación;
- spam;
- roles/permisos;
- Join/Leave;
- Feed propio;
- búsqueda;
- notificaciones;
- eventos;
- administración;
- bans/expulsiones;
- coste de soporte.

Comparación:

QR, alertas y agenda entregan utilidad aunque exista un solo usuario.

Comunidades necesita usuarios + contenido + actividad.

Por eso su coste de oportunidad es mayor.

---

# 5. Recomendación actual

**No construir todavía el sistema completo de Comunidades.**

Estado recomendado:

**EXPERIMENTO ACTIVO / FAKE DOOR**

Mantener una preview clara del módulo y medir interés real.

Si la señal es débil, se pospone y PAZO continúa con módulos de utilidad más directa.

Si la señal es fuerte, entonces se abre la segunda parte de esta sub-ruta y se define el producto completo.

---

# 6. Experimento dentro de PAZO

La preview debe explicar de forma breve qué ofrecería Comunidades.

CTA principal:

**"Me interesa"**

Ese CTA representa intención, no una membresía ni Join real.

## Qué medir

- viewers únicos de Comunidades;
- clicks únicos en "Me interesa";
- revisitas;
- fuente de entrada;
- mascota/cuenta activa solo cuando sea útil para segmentación;
- fecha.

## Métrica principal

Interest Rate:

`unique_interest / unique_viewers`

---

# 7. Pregunta opcional después de "Me interesa"

Para descubrir QUÉ construir, puede mostrarse una pregunta de un solo paso:

**¿Qué te gustaría hacer en Comunidades?**

Opciones iniciales para validar, no funcionalidades aprobadas:

- encontrar personas y mascotas de mi zona;
- unirme a grupos por especie/raza;
- crear mi propia comunidad;
- organizar o encontrar encuentros;
- pedir/compartir consejos;
- otro.

No es obligatorio mostrarla a todos si genera fricción.

El objetivo es evitar gastar horas definiendo funciones que nadie quiere.

---

# 8. Gate para decidir construcción

No cerrar la decisión con una muestra minúscula.

Referencia inicial:

## Menos de 30 viewers únicos
Datos insuficientes.

## 30–99 viewers
Usar como señal direccional.

## 100+ viewers
Permite una decisión inicial más estable.

Interest Rate orientativo:

- <10%: POSPONER;
- 10–24%: mantener experimento;
- >=25%: evaluar MVP reducido.

Además debe existir una razón concreta de uso.

Ejemplo:

25% dice "Me interesa", pero casi nadie sabe qué haría allí -> señal débil.

25% + muchos eligen "grupos locales" o "encuentros" -> señal mucho más útil.

---

# 9. Gate de masa crítica

Aunque exista interés, Comunidades no debe lanzarse vacía.

Antes de construir/lanzar debemos evaluar:

- usuarios activos de PAZO;
- concentración geográfica;
- cuántos interesados compartirían intereses/zonas;
- capacidad de sembrar contenido inicial.

Si hay interés pero no masa crítica:

**mantener en desarrollo/espera**, no lanzar una experiencia vacía.

---

# 10. ¿Comunidades puede atraer usuarios nuevos?

Posiblemente sí, pero requiere una prueba aparte.

La señal interna "Me interesa" NO responde esto.

## Experimento externo barato

Antes de construir Comunidades completas se puede probar:

- una landing pública de Comunidades;
- ejemplos conceptuales de grupos;
- enlace compartible;
- CTA "Únete a PAZO / Avísame cuando esté disponible";
- tráfico orgánico desde redes.

Medir:

- visitantes externos;
- registros generados;
- conversión;
- compartidos/invitaciones.

Si no genera registros, no debemos vender internamente la idea como motor de adquisición.

---

# 11. Criterio de prioridad frente a otros módulos

Comunidades compite por tiempo con módulos de utilidad.

Antes de construirla comparar contra:

- Agenda/Cuidados;
- Documentos;
- Mapa/Lugares;
- Mensajería;
- otras funciones pendientes.

Evaluar cada módulo en:

- valor inmediato;
- demanda medida;
- adquisición;
- retención;
- coste técnico;
- coste operativo;
- dependencia de masa crítica.

Una función entretenida no debe desplazar automáticamente una herramienta de utilidad con mejor retorno para el MVP.

---

# 12. Resultado de Fase 7.0

La validación termina en una de cuatro decisiones:

## A. BUILD NOW
La evidencia justifica desarrollar Comunidades.

Entonces se abre Fase 7.1 y definimos:
- identidad;
- tipos;
- roles;
- permisos;
- contenido;
- Join/Leave;
- moderación;
- campos;
- eventos;
- notificaciones;
- ciclo de vida.

## B. MVP REDUCIDO
Solo construimos el uso más demandado.

Ejemplo conceptual:
si la mayoría quiere grupos locales, no construimos diez tipos de comunidad desde el día uno.

## C. EXPERIMENTO ACTIVO
Mantenemos "Me interesa" y seguimos acumulando datos.

No se programa backend de Comunidades.

## D. POSPUESTO
Se mueve a backlog.

Se define qué métrica/disparador la reabre.

---

# 13. Producto completo — BLOQUEADO

Las siguientes decisiones se conservan, pero NO deben consumirse ahora en diseño detallado hasta que Comunidades pase el gate:

- cuenta vs mascota vs modelo híbrido;
- pública / aprobación / privada;
- Owner/Admin/Moderador/Miembro;
- matriz de permisos;
- Feed de comunidad;
- posts;
- eventos;
- invitaciones;
- bans;
- reglas;
- categorías;
- búsqueda;
- notificaciones;
- archivado/eliminación;
- premium.

**No gastar tokens cerrando esta arquitectura mientras no sepamos si construiremos el módulo.**

---

# 14. Estado del disparador "Me interesa"

El Product Owner indica que existió una implementación hecha con Gemini.

Auditoría:
- no está confirmada en `main`;
- no existe una señal persistente específica visible en Supabase;
- es probable que esa lógica se haya perdido durante reescrituras anteriores.

Decisión:
- no invertir más tiempo intentando reconstruir esa implementación histórica;
- cuando se autorice código, crear un sistema genérico de validación para todos los módulos;
- Comunidades será el primer consumidor de ese sistema;
- hasta entonces, no construir backend de Comunidades.

---

# 15. Subfases revisadas

## 7.0A — Validación de valor
**ESTADO: EN CURSO**

- auditar fake door;
- definir señal;
- medir interés;
- comparar con otros módulos.

## 7.0B — Validación de adquisición
**ESTADO: OPCIONAL / SEGÚN OBJETIVO**

Solo si queremos probar que Comunidades atrae usuarios nuevos.

## 7.0C — Decisión de inversión
**ESTADO: BLOQUEADA POR DATOS**

Resultado:
- BUILD NOW;
- MVP REDUCIDO;
- EXPERIMENTO ACTIVO;
- POSPUESTO.

## 7.1+ — Diseño e implementación
**ESTADO: BLOQUEADO**

Solo se abre si 7.0C aprueba construir.

---

# 16. Recomendación provisional para MVP

Hasta tener datos:

**Comunidades NO es requisito del MVP.**

Debe considerarse una hipótesis de engagement/adquisición.

Mientras se valida, PAZO puede continuar desarrollando herramientas con valor individual claro.

La decisión se revisará con datos del fake door, no por intuición.
