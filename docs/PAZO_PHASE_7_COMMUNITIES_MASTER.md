# PAZO — Sub-Ruta Maestra Fase 7: Comunidades

**Estado:** VALIDACIÓN DE PRODUCTO — NO PROGRAMAR COMUNIDADES TODAVÍA  
**Fase padre:** Fase 7  
**Marco obligatorio:** `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`

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

El Product Owner indica que ya existe una implementación hecha con Gemini que:
- registra entrada al módulo;
- ofrece botón "Me interesa".

La auditoría actual no pudo confirmar esa implementación específica en `main` ni una señal persistente específica en Supabase.

Por lo tanto el próximo paso técnico NO es construir Comunidades.

Es:

1. localizar la implementación exacta de Gemini;
2. sincronizarla si solo está local;
3. auditar qué eventos guarda;
4. comprobar que no cuente clicks repetidos como usuarios distintos;
5. adaptar únicamente el tracking si fuese necesario;
6. dejar el módulo funcionando como experimento.

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
