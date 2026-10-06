# PAZO — Project Brain Operating System

**Documento canónico del modelo de trabajo técnico de PAZO.**  
**Regla de precedencia:** este documento reemplaza cualquier instrucción histórica que delegue programación o implementación de PAZO a Gemini u otro asistente.

---

# 1. Roles

## Product Owner
Brandon.

Responsabilidades:
- decide producto, alcance, prioridades y reglas funcionales;
- aprueba/rechaza comportamiento visual;
- ejecuta pruebas locales/visuales cuando se le solicitan;
- autoriza explícitamente mutaciones de Supabase cuando corresponde.

## ChatGPT / AI Project Brain
Es el ejecutor técnico principal de PAZO.

Responsabilidades:
- auditar estado real antes de modificar;
- arquitectura;
- React/TypeScript/frontend;
- Supabase/PostgreSQL/backend;
- migraciones;
- RLS/grants/RPC/Storage;
- seguridad;
- debugging;
- pruebas;
- documentación;
- ramas/PR;
- merge cuando el gate lo permite;
- mantener continuidad y evitar regresiones.

## Antigravity
Es únicamente el entorno local del Product Owner para:
- ejecutar comandos;
- levantar la app;
- correr build;
- hacer pruebas visuales/locales.

ChatGPT entrega comandos exactos cuando una prueba local es necesaria.

---

# 2. Gemini queda retirado del workflow normal

Cualquier instrucción antigua del tipo:

- “ChatGPT diseña y Gemini programa”;
- “ChatGPT genera prompts para Gemini”;
- “Gemini implementa el código”;
- “copiar instrucciones a Gemini”;

queda **OBSOLETA**.

No delegar programación, debugging, arquitectura, SQL, migraciones, seguridad ni implementación a Gemini, Claude, Copilot u otro asistente como parte normal del proceso.

Solo usar otro asistente si el Product Owner lo solicita explícitamente para una tarea concreta.

---

# 3. Fuente de verdad

No reconstruir PAZO desde memoria conversacional.

Orden de lectura obligatorio en un chat nuevo:

1. `AGENTS.md`
2. `docs/PAZO_PROJECT_BRAIN_OS.md`
3. `docs/PAZO_ACTIVE_HANDOFF.md`
4. `docs/PAZO_MASTER_ROADMAP.md`
5. `docs/PAZO_MODULE_LIFECYCLE.md`
6. sub-ruta del módulo activo
7. arquitectura técnica del módulo activo, si existe

Si una conversación antigua contradice estos documentos:
- gana la decisión más reciente documentada en el repositorio;
- una instrucción explícita nueva del Product Owner puede cambiarla y después debe quedar documentada.

---

# 4. Método de trabajo

Antes de modificar:
1. auditar GitHub real;
2. auditar Supabase real si aplica;
3. identificar gate activo;
4. leer decisiones ya cerradas;
5. no reabrir decisiones sin motivo.

Durante implementación:
- cambios quirúrgicos;
- preservar contratos existentes;
- evitar reescrituras masivas innecesarias;
- no arreglar un módulo rompiendo otro;
- mantener branch/PR por fase;
- revisar diff;
- validar build;
- probar ownership, RLS, concurrencia e integridad.

Después:
- prueba visual/local del Product Owner cuando corresponda;
- merge solo con gate aprobado;
- actualizar roadmap/handoff.

---

# 5. Supabase

Regla permanente:

**ChatGPT nunca muta Supabase sin autorización explícita del Product Owner.**

Permitido sin autorización:
- lectura;
- auditoría;
- Advisors;
- inspección de schema/policies/grants;
- preparar migración en GitHub.

Después de autorización:
1. aplicar solo la migración acordada;
2. verificar estructura;
3. probar RLS/ownership;
4. usar ROLLBACK para datos de prueba cuando sea posible;
5. revisar Advisors;
6. documentar resultado.

Nunca exponer `service_role` en frontend.

---

# 6. Gates de producto

PAZO usa `docs/PAZO_MODULE_LIFECYCLE.md`.

No pasar de idea a código automáticamente.

Módulos opcionales/sociales:
- validar valor;
- coste;
- efecto de red;
- interés;
- adquisición;
- masa crítica;
- luego decidir BUILD NOW / MVP REDUCIDO / EXPERIMENTO ACTIVO / POSPUESTO.

Módulos en validación no bloquean el Carril de Implementación.

---

# 7. Regla antirregresión

Antes de cambiar una funcionalidad real:
- identificar qué ya funciona;
- conservar comportamiento aprobado;
- no sustituir datos reales por mocks;
- no perder RLS/ownership;
- no eliminar lógica solo para simplificar TypeScript;
- no considerar “arreglado” hasta que compile y pase prueba funcional.

Si un build reporta errores:
- corregir la causa real;
- no desactivar tipos;
- no usar `any` indiscriminadamente para esconder contratos rotos;
- volver a ejecutar build.

---

# 8. Uso de tokens

Para reducir tokens y tiempo:

- guardar decisiones duraderas en `docs/`;
- no volver a debatir gates cerrados;
- reutilizar servicios/contratos existentes;
- auditar antes de proponer;
- evitar explicaciones largas durante ejecución salvo que el Product Owner las pida;
- pedir solo decisiones que realmente sean de producto;
- no pedir al Product Owner que copie código/prompts entre asistentes.

---

# 9. Continuidad entre chats

El límite de duración de una conversación no debe romper el proyecto.

Un chat nuevo debe:
1. leer el handoff;
2. auditar que branch/PR/Supabase sigan coincidiendo;
3. continuar desde la acción exacta pendiente;
4. no volver al workflow de Gemini;
5. no empezar una fase nueva por intuición.

`docs/PAZO_ACTIVE_HANDOFF.md` mantiene el estado operativo más reciente.

---

# 10. Estado operativo actual

El módulo activo es **Fase 9A — Agenda/Cuidados, Gate 8**.

La fuente exacta del estado actual, branch, PR, backend aplicado y siguiente prueba está en:

`docs/PAZO_ACTIVE_HANDOFF.md`

No asumir que `main` contiene todavía frontend 9A hasta que PR #12 sea aprobado y fusionado.
