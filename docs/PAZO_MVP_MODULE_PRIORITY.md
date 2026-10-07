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
- núcleo real de Fase 8 merged y backend validado;
- cierre REABIERTO por fake doors + 3D markers ya aprobados;
- fake doors implementadas y module keys aplicados;
- 3D assets implementados;
- primera prueba visual 3D detectó fallback 2D;
- fix de visibilidad 3D aplicado y nueva validación Product Owner: PASS;
- Mapbox real;
- catálogo curado real;
- check-ins reales con privacidad/expiración;
- sugerencias reales;
- ubicación del dispositivo efímera y no persistida;
- backend/RLS/E2E aprobados.

Conclusión:
- Fase 8 está COMPLETADA;
- PR #22 está merged y `main` verificado;
- pasa a Gate 9 / medición post-lanzamiento;
- las fake doors siguen como instrumentos de priorización, no como autorización automática de build.

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
- ya existen mascotas, Comunidades y Lugares reales;
- Explore actual reutiliza Comunidades reales y una mascota derivada del Feed;
- el buscador actual solo filtra Comunidades;
- mascotas y Lugares todavía no participan de una búsqueda unificada;
- Eventos continúa como placeholder;
- Gate 0–2 auditados y cerrados.

Conclusión:
- valor suficiente para continuar el lifecycle;
- coste medio-bajo para un MVP reducido;
- Product Owner aprobó Global Search + Comunidades como módulo principal;
- Gate 5: MVP REDUCIDO;
- Gate 6: CERRADO;
- Gate 7: SIGUIENTE;
- implementación todavía NO autorizada.

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
| Mapa/Lugares | 4 | 4 | 3 | 3 | CIERRE EN CORRECCIÓN — QA PASS / MERGE PENDIENTE |
| Mensajería | 3 | 4 | 4 | 4 | POSPONER / REEVALUAR |
| Comunidades | 3 | 5 | 5 | 5 | EXPERIMENTO ACTIVO |
| Notificaciones generales | 4 | 3 | 2 | 1 | IMPLEMENTAR POR DEPENDENCIA |
| Global Search | 4 | 3 | 2 | 2 | MVP REDUCIDO — GATE 7 SIGUIENTE |

---

# 3. Decisión

## Carril de Implementación

**Agenda/Cuidados (9A) y Documentos privados (9B) ya fueron completados.**

Resultado histórico del Gate 5 de Agenda:

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
COMPLETADA.

Resultado entregado:
- metadata persistente;
- Storage privado;
- upload;
- descarga/preview autenticados;
- categorías;
- eliminación;
- aislamiento fuerte por propietario;
- compartir externamente quedó fuera del MVP.

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
**COMPLETADA — GATE 9 / MEDICIÓN.**

Fake doors:
- backend/registro: PASS;
- runtime + F5 del Product Owner: PASS.

3D markers:
- assets/layer: PASS;
- fix de escala/cámara: PASS;
- validación visual del Product Owner: PASS.

PR #22 merged y `main` verificado.

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

# 8. Estado actual del Carril de Implementación

- 9A Agenda/Cuidados: COMPLETADA.
- 9B Documentos privados: COMPLETADA.
- 8 Mapa/Lugares/Check-ins: COMPLETADA — Gate 9 / medición.
- No hay un siguiente módulo autorizado automáticamente.

Candidatos:
- Global Search: **MVP REDUCIDO — GATE 7 SIGUIENTE**; Gate 0–6 cerrados, implementación aún no autorizada.
- Mensajería: POSPONER / REEVALUAR por masa crítica y moderación.
- Notificaciones generales: implementar solo por dependencia concreta.
- Rediseño UI: planificado, pero no debe desplazar una necesidad funcional más valiosa sin decisión explícita.

El próximo módulo debe pasar nuevamente por `docs/PAZO_MODULE_LIFECYCLE.md`; no asumir prioridad por numeración histórica.
