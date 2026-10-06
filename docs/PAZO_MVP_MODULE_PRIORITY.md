# PAZO — Priorización de Módulos para el MVP

**Documento de decisión de producto.**  
**Marco:** `docs/PAZO_MODULE_LIFECYCLE.md`  
**Estado:** ACTIVO

Este documento registra qué módulo ocupa el Carril de Implementación y por qué.

---

# 1. Evidencia auditada

## Agenda/Cuidados
Estado real:
- UI existente en `CareModal.tsx`;
- permite crear cuidado local;
- permite marcar completado/deshacer;
- muestra próximos e historial;
- datos actuales vienen de `mockData`;
- no existe tabla real de cuidados en Supabase;
- no persiste F5;
- no existe motor real de recordatorios;
- no depende de otros usuarios.

Conclusión:
- utilidad individual clara;
- coste técnico moderado;
- bajo riesgo de moderación;
- excelente candidato a MVP.

---

## Documentos privados
Estado real:
- UI existente dentro de `CareModal.tsx`;
- lista documentos mock;
- “Añadir Documento” y “Compartir” todavía son simulaciones;
- no existe tabla real de documentos;
- no existe Storage privado específico;
- compartir temporal requiere URLs firmadas / expiración;
- contiene información potencialmente sensible.

Conclusión:
- utilidad individual clara;
- valor real;
- mayor riesgo y coste que Agenda por privacidad/Storage;
- conviene construir después de estabilizar Agenda.

---

## Mapa/Lugares
Estado real:
- existe tabla `pet_places`;
- actualmente contiene pocos registros;
- `MapView` sigue siendo preview/fake door;
- no existe mapa real;
- no está decidido proveedor de mapas ni reglas de ubicación;
- el fake door actual intenta escribir en `interactions`, pero no es compatible con el schema actual:
  - omite `actor_pet_id` obligatorio;
  - usa un `target_id` textual donde la columna requiere UUID.

Conclusión:
- el interés actual NO puede considerarse medido de forma fiable;
- puede tener utilidad y adquisición local;
- requiere proveedor, datos, privacidad y densidad;
- debe permanecer en VALIDACIÓN DE ALCANCE hasta tener instrumentación genérica y decisiones geográficas.

---

## Mensajería 1 a 1
Estado real:
- UI mock relativamente completa;
- conversaciones, solicitudes y mensajes son memoria local;
- no existen tablas de conversaciones/mensajes;
- requeriría RLS, unread, solicitudes, bloqueo/abuso y probablemente Realtime;
- su valor depende de que existan suficientes relaciones activas entre usuarios.

Conclusión:
- network effect alto;
- coste y riesgo operativos altos;
- no debe ocupar ahora el Carril de Implementación;
- reevaluar cuando exista mayor actividad social real.

---

## Notificaciones generales
Estado real:
- Fase 6 ya creó infraestructura real para notificaciones de rescate;
- el sistema general aún no existe.

Conclusión:
- es infraestructura, no módulo de demanda;
- debe ampliarse incrementalmente cuando Agenda, Mensajería u otros módulos lo necesiten;
- no requiere fake door.

---

## Explore/Search
Estado real:
- hoy mezcla comunidades/eventos/mock y algunos accesos reales;
- su valor aumenta cuando existan suficientes entidades reales que buscar.

Conclusión:
- infraestructura dependiente del contenido;
- no priorizar antes de que más módulos sean reales.

---

# 2. Matriz de decisión

Escala:
- Valor: 1 bajo → 5 alto
- Coste: 1 bajo → 5 alto
- Riesgo: 1 bajo → 5 alto
- Masa crítica: 1 baja → 5 alta

| Módulo | Valor inmediato | Coste | Riesgo | Masa crítica | Resultado |
|---|---:|---:|---:|---:|---|
| Agenda/Cuidados | 5 | 2 | 1 | 1 | BUILD NOW |
| Documentos | 4 | 3 | 3 | 1 | SIGUIENTE DESPUÉS DE AGENDA |
| Mapa/Lugares | 4 | 4 | 3 | 3 | VALIDAR ALCANCE |
| Mensajería | 3 | 4 | 4 | 4 | POSPONER / REEVALUAR |
| Comunidades | 3 | 5 | 5 | 5 | EXPERIMENTO ACTIVO |
| Notificaciones generales | 4 | 3 | 2 | 1 | IMPLEMENTAR POR DEPENDENCIA |
| Explore/Search | 3 | 3 | 2 | 3 | IMPLEMENTAR CUANDO HAYA CONTENIDO |

---

# 3. Decisión

## Carril de Implementación

**Siguiente módulo: Agenda/Cuidados.**

Resultado del Gate 5:

**BUILD NOW**

Razones:
1. entrega valor a un usuario aislado;
2. no necesita masa crítica;
3. ya existe una UI que permite validar el flujo;
4. su backend es acotable;
5. puede aumentar retención por utilidad recurrente;
6. crea una base natural para recordatorios/notificaciones;
7. no exige APIs externas;
8. no abre una superficie importante de moderación.

---

# 4. Documentos se separa de Agenda

Aunque hoy comparten modal, se tratarán como submódulos distintos.

## 9A — Agenda/Cuidados
Primero.

Objetivo:
- persistencia de cuidados;
- CRUD;
- completar/deshacer;
- historial;
- fechas/horas;
- recurrencia mínima aprobada;
- recordatorio lógico;
- aislamiento por mascota/owner.

## 9B — Documentos privados
Después.

Objetivo:
- metadata persistente;
- Storage privado;
- upload;
- descarga/preview;
- categorías;
- URLs firmadas temporales;
- eliminación;
- aislamiento fuerte por propietario.

Razón:
no mezclar persistencia sencilla de Agenda con seguridad/Storage de Documentos en una sola implementación grande.

---

# 5. Qué NO se decide todavía de Agenda

Aunque Agenda pasa a BUILD NOW, antes de código debe cerrarse su Gate 6 — Especificación de producto.

Falta decidir:
- tipos definitivos de cuidado;
- campos obligatorios;
- recurrencia;
- cuándo un cuidado pasa a historial;
- edición/eliminación;
- recordatorios internos;
- relación con notificaciones;
- tratamiento de cuidados vencidos;
- timezone;
- si se permiten notas/adjuntos;
- qué entra y qué no en MVP.

No diseñar schema hasta cerrar estas decisiones.

---

# 6. Qué pasa con Comunidades y Mapa

## Comunidades
Continúa:
**EXPERIMENTO ACTIVO**

No bloquea Agenda.

## Mapa/Lugares
Continúa:
**VALIDAR ALCANCE**

El fake door actual no genera datos fiables.  
No arreglarlo de forma específica.

Cuando se autorice instrumentación:
- crear sistema genérico;
- usarlo para Comunidades, Mapa y módulos futuros.

---

# 7. Disparadores de reevaluación

## Mensajería
Reabrir cuando:
- exista una base más amplia de follows/relaciones reales;
- haya una razón concreta para contactar a otro usuario;
- otro módulo dependa de comunicación directa.

## Mapa
Reabrir cuando:
- exista tracking genérico;
- se defina proveedor;
- se defina precisión/privacidad;
- haya suficiente inventario local de lugares.

## Comunidades
Usar su sub-ruta y datos de validación.

---

# 8. Próximo gate

Agenda/Cuidados pasa a:

**Gate 6 — Especificación de Producto**

Antes de cualquier código:
1. crear sub-ruta maestra de Agenda;
2. definir problema/beneficio;
3. definir alcance MVP;
4. definir flujos y estados;
5. definir reglas de recurrencia/recordatorios;
6. definir qué NO entra;
7. cerrar Definition of Done;
8. después diseñar arquitectura técnica.

No programar todavía.
