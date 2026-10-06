# PAZO — Sub-Ruta Maestra 9A: Agenda y Cuidados

**Estado:** GATE 6 — ESPECIFICACIÓN DE PRODUCTO  
**Tipo:** U — utilidad individual  
**Resultado Gate 5:** BUILD NOW  
**Documento padre:** `docs/PAZO_MVP_MODULE_PRIORITY.md`

---

# 1. Problema que resuelve

Los dueños de mascotas necesitan recordar y registrar tareas recurrentes o puntuales relacionadas con el cuidado de cada mascota:

- citas veterinarias;
- vacunas;
- medicamentos;
- higiene;
- alimentación/cambios de rutina;
- otros cuidados.

La utilidad debe funcionar aunque PAZO tenga un solo usuario.

---

# 2. Resultado prometido

PAZO debe permitir responder rápidamente:

- ¿qué cuidado viene después?;
- ¿qué tengo pendiente hoy?;
- ¿qué se venció?;
- ¿qué ya hice?;
- ¿cuándo fue la última vez que hice ese cuidado?;
- ¿cuándo vuelve a tocar?

No intenta diagnosticar ni recomendar tratamientos.

---

# 3. Alcance MVP aprobado

## Crear cuidado

Cada cuidado tendrá:

### Obligatorio
- título;
- categoría;
- fecha.

### Opcional
- hora;
- notas;
- recurrencia;
- recordatorio interno.

## Categorías MVP

- veterinaria;
- vacuna;
- medicamento;
- higiene;
- alimentación;
- otro.

No crear una taxonomía médica compleja.

## Fecha/hora

- fecha obligatoria;
- hora opcional;
- si no existe hora, se trata como tarea de día completo;
- UI usa timezone local del usuario;
- backend debe conservar suficiente información para no mover fechas accidentalmente por UTC.

## Notas

Texto libre breve.

No usar notas como campo estructurado para diagnósticos, dosis o información clínica.

---

# 4. Estados de un cuidado

Los estados visibles se derivan de fecha y completion.

## Próximo
Fecha futura.

## Hoy
Fecha correspondiente al día actual.

## Vencido
Fecha/hora pasó y no se completó.

Un cuidado vencido:
- NO se completa automáticamente;
- permanece visible;
- puede marcarse como hecho;
- puede editarse/reprogramarse.

## Completado
El usuario confirma explícitamente que se realizó.

Debe registrar cuándo fue completado.

---

# 5. Historial

El historial no es simplemente mover una tarjeta a otra pestaña.

Debe conservar un registro real de cada realización.

Para cada completion interesa poder saber:
- qué cuidado fue;
- fecha programada;
- cuándo se marcó como completado;
- notas relevantes existentes en ese momento.

La arquitectura posterior decidirá si esto usa tabla de ocurrencias/completions.

---

# 6. Recurrencia MVP

Evitar un motor de calendario excesivamente complejo.

Opciones admitidas:

- no repetir;
- diario;
- semanal;
- mensual;
- anual.

## Regla al completar

Si NO es recurrente:
- termina y queda en historial.

Si ES recurrente:
- la ocurrencia actual queda en historial;
- se genera/calcula la siguiente fecha;
- el cuidado continúa activo.

## No entra todavía
- múltiples veces al día;
- días específicos múltiples por semana;
- “cada tercer martes”;
- excepciones avanzadas;
- rangos de tratamiento;
- calendarios veterinarios automáticos;
- recomendaciones clínicas.

Si después hay demanda, se amplía sin romper el modelo.

---

# 7. Edición

El usuario puede editar un cuidado pendiente.

Campos editables:
- título;
- categoría;
- fecha;
- hora;
- notas;
- recurrencia;
- recordatorio.

## Recurrentes

Editar un cuidado recurrente modifica las ocurrencias futuras.

No reescribir retroactivamente el historial ya completado.

---

# 8. Eliminación

El usuario puede eliminar un cuidado activo.

Regla:
- eliminar el cuidado activo no borra automáticamente el historial de completions anteriores.

El historial puede tener acción de eliminar registro si el usuario necesita corregir datos, pero esa acción se trata separadamente en UI para evitar borrados accidentales.

---

# 9. Recordatorios MVP

Separar:

1. **configuración del recordatorio**;
2. **canal de entrega**.

Agenda 9A debe guardar una preferencia de recordatorio.

Opciones iniciales:
- sin recordatorio;
- mismo día;
- 1 día antes;
- 2 días antes;
- 1 semana antes.

## Entrega en 9A

El MVP debe poder mostrar dentro de PAZO:
- vencidos;
- de hoy;
- próximos según el offset elegido.

No bloquear 9A por Push Web.

## Integración futura

Fase 11 generalizará notificaciones.
Fase 15 puede añadir Push/PWA.

La arquitectura debe permitir que esos canales consuman la misma agenda sin rediseñarla.

---

# 10. Superficie global de recordatorio

Agenda no debe obligar al usuario a abrir el modal para descubrir algo urgente.

Cuando haya:
- cuidado vencido;
- cuidado de hoy;
- cuidado dentro de la ventana de reminder;

PAZO puede mostrar un indicador/resumen no invasivo.

Diseño visual final se resolverá en Fase 13.

Regla funcional:
el indicador debe abrir directamente la Agenda de la mascota correspondiente.

---

# 11. Múltiples mascotas

Todo cuidado pertenece a una mascota específica.

Al cambiar mascota:
- Agenda muestra solo los cuidados de esa mascota;
- historial queda aislado;
- recordatorios deben identificar la mascota correcta.

Una cuenta nunca puede editar cuidados de una mascota ajena.

---

# 12. Privacidad

Agenda es privada.

No aparece en:
- perfil público;
- QR público;
- Feed;
- Explore;
- otras cuentas.

Acceso:
- únicamente propietario autenticado de la mascota.

No compartir Agenda en 9A.

---

# 13. Datos de salud y límites del producto

PAZO organiza información; no practica medicina.

No entra:
- diagnóstico;
- interpretación clínica;
- recomendación de medicamento;
- sugerencia de dosis;
- alertas médicas automatizadas basadas en síntomas;
- sustitución del veterinario.

Texto UX debe evitar presentar recordatorios como consejo médico.

---

# 14. Estados vacíos y errores

## Sin cuidados
Mostrar estado vacío útil + CTA para crear el primero.

## Error de carga
No sustituir por mock.

Mostrar error y opción de reintento.

## Error al guardar
No cerrar formulario fingiendo éxito.

## Offline
No inventar sincronización offline en 9A.

---

# 15. Rendimiento

Agenda normalmente tendrá pocos registros, pero no debe asumir crecimiento infinito.

Reglas:
- próximos: consulta acotada/ordenada;
- historial: paginado;
- no descargar años de historial al abrir;
- completar/editar afecta solo el registro necesario.

Page size exacto se decide en arquitectura.

---

# 16. Qué NO entra en 9A

- documentos/archivos;
- compartir con veterinario;
- links temporales;
- push del sistema operativo;
- SMS/email;
- integración con calendarios externos;
- sincronización con clínicas;
- recetas;
- dosis estructuradas;
- métricas médicas;
- peso/historial clínico avanzado;
- citas automáticas;
- IA médica.

Documentos pertenece a 9B.

---

# 17. Flujos MVP

## Crear
Agenda → Añadir cuidado → datos → Guardar → aparece en Próximos.

## Completar
Próximos/Hoy/Vencidos → Hecho → se registra completion → Historial.

## Recurrente
Hecho → registra occurrence → programa siguiente → permanece como cuidado activo.

## Editar
Abrir cuidado → Editar → Guardar → cambios persisten.

## Reprogramar vencido
Vencido → Editar fecha/hora → Guardar → vuelve a Próximos/Hoy.

## Eliminar
Abrir cuidado → Eliminar → confirmación → desaparece de activos.

---

# 18. Métricas post-lanzamiento

No necesitamos fake door para justificar 9A, pero sí medir si entrega valor.

Métricas útiles:
- usuarios con al menos 1 cuidado;
- cuidados creados por usuario activo;
- porcentaje de cuidados completados;
- usuarios que vuelven a Agenda;
- uso de recurrencia;
- uso de reminder;
- cuidados vencidos recuperados/completados.

No usar estas métricas para perfilar salud.

---

# 19. Definition of Done de producto

Producto 9A está definido cuando:

- categorías cerradas;
- campos cerrados;
- recurrencia cerrada;
- recordatorios cerrados;
- estados cerrados;
- historial cerrado;
- múltiples mascotas definido;
- privacidad definida;
- fuera de alcance definido;
- métricas post-lanzamiento definidas.

Este documento cumple Gate 6 salvo que Product Owner cambie alguna regla.

---

# 20. Próximo gate

Después de aprobar esta especificación:

**Gate 7 — Arquitectura Técnica**

Se definirá:
- tablas;
- relaciones;
- RLS;
- grants;
- índice por mascota/fecha;
- completion history;
- estrategia de recurrencia;
- timezone;
- consultas/paginación;
- integración incremental con notifications;
- migración;
- tests.

**No programar hasta cerrar Gate 7.**
