# PAZO — Arquitectura Técnica 9A: Agenda y Cuidados

**Estado:** GATE 7 — ARQUITECTURA TÉCNICA  
**Producto:** `docs/PAZO_PHASE_9A_CARE_MASTER.md`  
**Regla:** este documento describe contratos y arquitectura. No contiene migración ejecutable.

---

# 1. Objetivo técnico

Persistir Agenda por mascota con:
- aislamiento owner-only;
- historial real;
- recurrencia simple;
- completar/deshacer atómico;
- consultas eficientes;
- integración futura con notifications/push sin rediseñar datos.

---

# 2. Entidades

## 2.1 care_items

Representa el cuidado activo/plan.

Campos conceptuales:

- `id uuid PK`
- `pet_id uuid FK pets(id)`
- `title text`
- `category text`
- `due_date date`
- `due_time time nullable`
- `timezone text`
- `recurrence text`
- `reminder_days_before smallint nullable`
- `notes text nullable`
- `status text`
- `created_at timestamptz`
- `updated_at timestamptz`

### category
Permitidos:
- veterinarian
- vaccine
- medication
- hygiene
- feeding
- other

Los labels ES/EN pertenecen al frontend, no al DB.

### recurrence
Permitidos:
- none
- daily
- weekly
- monthly
- yearly

### reminder_days_before
Permitidos:
- null
- 0
- 1
- 2
- 7

### status
Permitidos:
- active
- completed
- archived

Reglas:
- recurrente permanece `active` al completar;
- one-off pasa a `completed`;
- eliminar desde producto = `archived`, no hard delete.

---

# 3. Historial — care_completions

Representa una realización concreta.

Campos conceptuales:

- `id uuid PK`
- `care_item_id uuid FK care_items(id)`
- `pet_id uuid FK pets(id)`
- `scheduled_date date`
- `scheduled_time time nullable`
- `completed_at timestamptz`
- `title_snapshot text`
- `category_snapshot text`
- `notes_snapshot text nullable`
- `recurrence_snapshot text`
- `created_at timestamptz`

## Por qué snapshots

Editar el cuidado futuro no debe reescribir la historia.

Ejemplo:
“Pipeta” cambia después a “Antiparasitario mensual”.

La completion antigua conserva el nombre/contexto con el que fue realizada.

---

# 4. Relación y borrado

`care_items.pet_id -> pets.id`

`care_completions.care_item_id -> care_items.id`

`care_completions.pet_id -> pets.id`

No usar cascada desde `care_items` hacia historial como operación normal.

Como el producto archiva en vez de borrar:
- historial permanece;
- recurrencia futura se detiene;
- se evita pérdida accidental.

Borrar una mascota se resolverá dentro de la política global de eliminación de Fase 14; no inventar ahora esa cascada final.

---

# 5. Timezone

Evitar modelar una cita veterinaria como un instante UTC que cambie de día por conversión accidental.

Guardar:
- `due_date` como fecha local ingresada;
- `due_time` como hora local opcional;
- `timezone` IANA capturada al crear/editar, por ejemplo `America/Los_Angeles`.

## Regla visual
Mostrar fecha/hora como fueron programadas.

No convertir silenciosamente un cuidado a otra fecha porque el usuario viaje.

## Futuro Push
El timezone guardado permitirá programar entrega correctamente sin migrar datos.

---

# 6. Estados derivados

No guardar columnas redundantes `is_overdue` o `is_today`.

Se derivan usando:
- status;
- due_date;
- due_time;
- timezone;
- fecha/hora actual.

Estados visuales:
- upcoming;
- today;
- overdue;
- completed/history.

Esto evita cron jobs solo para cambiar flags.

---

# 7. Crear cuidado

Puede ser INSERT directo desde cliente autenticado si RLS verifica:

`pets.owner_id = auth.uid()`

El cliente no puede insertar usando una mascota ajena.

Campos con defaults seguros:
- status = active;
- recurrence = none;
- timestamps backend.

---

# 8. Editar cuidado

UPDATE directo permitido solo al owner.

RLS debe tener:
- USING ownership;
- WITH CHECK ownership.

Restricciones:
- no cambiar `pet_id` para trasladar el cuidado a una mascota ajena;
- snapshots históricos no se modifican.

Producto permite editar activos.

Editar items `completed`/archived debe estar restringido a acciones explícitas, no formularios normales.

---

# 9. Archivar/eliminar

No DELETE directo desde frontend en MVP.

Acción “Eliminar”:
- status -> archived;
- updated_at -> now.

Ventajas:
- conserva historial;
- evita cascadas accidentales;
- simplifica auditoría.

Un item archived no aparece en Agenda activa ni genera reminders.

---

# 10. Completar — operación atómica

Completar NO debe ser:
1. INSERT history desde frontend;
2. después UPDATE item.

Eso permite estados parciales.

Usar RPC controlada:

`complete_care_item(care_item_id)`

Responsabilidades:
1. autenticar;
2. comprobar owner vía pet;
3. bloquear fila del care item;
4. verificar `status=active`;
5. insertar completion con snapshot;
6. si recurrence=none:
   - status=completed;
7. si recurrence:
   - calcular siguiente due_date;
   - mantener active;
8. actualizar updated_at;
9. devolver completion + estado/nueva fecha.

Operación en una sola transacción.

---

# 11. Regla de recurrencia

Para evitar cadenas de tareas vencidas:

**la próxima fecha se calcula desde la fecha local de completion**, no desde una fecha vencida histórica.

Ejemplos:
- mensual vencía 1 de octubre;
- usuario lo completa 10 de octubre;
- siguiente = 10 de noviembre.

Motivo:
representa cuándo realmente se realizó el cuidado y evita generar inmediatamente otra ocurrencia atrasada.

## Cálculo
- daily: +1 día;
- weekly: +1 semana;
- monthly: +1 mes;
- yearly: +1 año.

PostgreSQL debe manejar correctamente final de mes.

No implementar reglas complejas de calendario en 9A.

---

# 12. Deshacer completion

Para mantener consistencia:

RPC:
`undo_care_completion(completion_id)`

Reglas:
- owner-only;
- solo puede deshacerse la completion más reciente de ese care item;
- elimina/revierte esa completion;
- restaura `due_date` y `due_time` desde scheduled snapshot;
- para one-off: status vuelve a active;
- para recurrente: restaura la ocurrencia que acababa de completarse.

Si existe una completion posterior:
- bloquear undo de una completion histórica anterior.

Esto evita reconstrucciones ambiguas de recurrencia.

---

# 13. Historial

Lectura owner-only.

Orden:
`completed_at DESC, id DESC`

Paginación:
- 20 por página;
- backend range/offset inicialmente;
- cursor se puede adoptar si escala mucho.

No descargar todo el historial al abrir Agenda.

---

# 14. Próximos cuidados

Consulta por mascota:

- status=active;
- order due_date ASC;
- due_time ASC NULLS LAST.

Cantidad esperada pequeña.

Puede limitarse inicialmente a 50 activos.

Si un usuario supera ese volumen, evaluar paginación adicional.

---

# 15. Recordatorio interno

9A NO necesita cron para funcionar.

Al cargar sesión/Agenda:
- consultar care_items activos del owner;
- identificar items dentro de reminder window;
- mostrar indicador global.

No crear filas de notifications repetidas cada vez que abre la app.

## Fase 11
Cuando notifications se generalice:
- un scheduler/cron podrá crear eventos de reminder;
- usar care_item_id como source;
- respetar reminder_days_before/timezone.

La Agenda queda compatible desde el inicio.

---

# 16. Consulta global entre mascotas

Para el indicador de reminders:

- obtener IDs de mascotas owned;
- query care_items active para esos pet IDs;
- RLS sigue verificando ownership;
- retornar solo ventana relevante.

No mezclar datos entre cuentas.

---

# 17. Grants y RLS

## care_items
Authenticated:
- SELECT own;
- INSERT own;
- UPDATE own;
- no DELETE directo.

Anon:
- ninguno.

Service role:
- completo.

## care_completions
Authenticated:
- SELECT own.

Writes:
- no insertar/editar/borrar directamente desde cliente;
- únicamente mediante RPCs controladas.

Anon:
- ninguno.

---

# 18. RPC Security

`complete_care_item`, `undo_care_completion` y `archive_care_item` mantienen integridad que no debe quedar disponible como writes directos.

Patrón final preparado:
- lógica privilegiada en schema no expuesto `care_private`;
- helpers internos `SECURITY DEFINER`;
- `SET search_path = ''`;
- ownership explícito con `auth.uid()`;
- EXECUTE interno restringido;
- RPCs públicas en `public` como `SECURITY INVOKER`;
- PUBLIC/anon sin EXECUTE;
- authenticated únicamente;
- referencias schema-qualified;
- Advisors después de aplicar.

Además:
- frontend no tiene UPDATE sobre `status` ni `pet_id`;
- completar/deshacer/archivar no se pueden falsificar con un UPDATE directo;
- `care_completions` es SELECT-only para authenticated.

---

# 19. Índices

Mínimos previstos:

## care_items
- `(pet_id, status, due_date, due_time)`
- opcional parcial para `status='active'` si Advisor/query plan lo justifica.

## care_completions
- `(care_item_id, completed_at DESC)`
- `(pet_id, completed_at DESC)`

FKs deben quedar indexadas.

No añadir índices especulativos sin consultas que los necesiten.

---

# 20. Constraints

Prever:

- title trim length 2..120;
- notes <= 1000;
- category check;
- recurrence check;
- reminder_days_before check;
- status check;
- timezone non-empty;
- due_time nullable;
- pet_id not null.

El frontend valida UX.
La DB valida integridad.

---

# 21. Concurrencia

## Doble tap en Hecho
RPC debe bloquear fila.

Debe evitar:
- dos completions por la misma ocurrencia;
- avanzar dos veces la recurrencia.

Se puede usar:
- row lock;
- identificador/constraint de occurrence si resulta necesario.

## Cambio rápido de mascota
Frontend debe ignorar respuestas viejas si el usuario cambia de mascota durante carga.

Seguir patrón de versiones ya usado por Feed.

---

# 22. Offline

No implementar offline-first en 9A.

Si request falla:
- mantener estado anterior;
- mostrar error;
- no fingir completion.

---

# 23. Migración prevista

Una sola fase puede dividir migración si mejora revisión:

## 9A.1
- care_items;
- care_completions;
- constraints;
- indexes;
- RLS/grants.

## 9A.2
- RPC complete;
- RPC undo;
- hardening.

No aplicar nada sin autorización explícita.

---

# 24. Plan de pruebas backend

## Ownership
- owner CRUD care_item: permitido;
- non-owner SELECT: vacío;
- non-owner UPDATE: bloqueado;
- spoof pet_id: bloqueado.

## Complete
- one-off: completion + status completed;
- recurring: completion + next date active;
- double completion concurrent: no duplica;
- other owner: bloqueado.

## Undo
- latest completion: revierte;
- older completion con una posterior: bloqueado;
- other owner: bloqueado.

## Privacy
- anon no puede leer nada;
- QR/public functions no exponen Agenda.

## Pagination
- historial page 1/page 2 sin solapamiento.

Pruebas de escritura con ROLLBACK cuando sea posible.

---

# 25. Plan frontend

Sin rediseñar visualmente todavía:

- reemplazar INITIAL_CARE_ITEMS por datos reales;
- CareModal recibe datos persistentes;
- crear real;
- editar;
- completar;
- deshacer latest;
- archivar;
- estados today/overdue;
- historial paginado;
- loading/error/empty;
- recordatorio global;
- cambio de mascota seguro.

Fase 13 podrá rediseñar la presentación sin cambiar contratos.

---

# 26. Definition of Done técnico

9A no se considera completada hasta:

- tablas aplicadas;
- RLS/grants auditados;
- CRUD persistente;
- completion atómica;
- recurrence validada;
- undo validado;
- historial paginado;
- F5 conserva datos;
- múltiples mascotas aisladas;
- indicador de reminder funciona;
- no mocks en núcleo de Agenda;
- build PASS;
- Advisors revisados;
- prueba visual aprobada;
- merged a main.

---

# 27. Estado del Gate 7

Arquitectura propuesta completa.

Antes de código:
- Product Owner puede cambiar cualquier regla de producto;
- si no hay cambios, esta arquitectura se considera base de implementación.

Siguiente etapa:
**Gate 8 — Implementación 9A**, en rama propia.

No se ha creado ni aplicado SQL todavía.
