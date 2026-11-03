# Vigilante PAZO — contexto y hoja de ruta

Fecha: 3 de noviembre de 2026.
Estado: **idea aprobada en conversación por el PO; nada implementado.** Este documento es contexto para cualquier agente que retome el trabajo. No autoriza por sí mismo cambios en producción, envíos de push, migraciones ni gastos.

## Qué es

Un módulo que vigila fuentes oficiales (retiros de comida, brotes de enfermedades, calor, humo, cambios de reglas en LA), cruza cada noticia con los datos de cada mascota y prepara avisos personalizados. **Nada sale sin la aprobación del PO.**

Ejemplo de la lógica pedida por el PO:

| Estado de la mascota en PAZO | Qué recibe ante un brote |
|---|---|
| Vacuna registrada y vigente | Ningún push. La publicación sigue visible en el feed. |
| Vacuna registrada y vencida | "Hay leptospirosis cerca. La vacuna de Max venció." |
| Vacuna sin registrar | "Hay leptospirosis cerca. ¿Max ya tiene esta vacuna? Regístrala." |

Reglas de tono: "sin registrar" no significa "sin vacuna"; nunca decir "estás protegido"; siempre citar la fuente oficial con fecha y remitir al veterinario.

## Por qué

- Investigación de mercado (3-nov-2026): cada parte existe por separado (retiros: KibbleLab, PawLens, RecallPaw; brotes: Pet Disease Alerts; calor y aire: PawCast, Dogsafe), pero **no se encontró ninguna app que cruce las alertas con el perfil y las vacunas de la mascota**. La búsqueda se basó en fichas de tiendas y páginas de fabricantes; no se probaron las apps.
- Usa datos que solo PAZO tiene (pasaporte, agenda, zona) y motiva al dueño a mantenerlos al día.
- Gancho de anuncio propuesto: "PAZO only alerts you when it matters for YOUR pet."

## Flujo acordado

1. El Vigilante revisa las fuentes oficiales.
2. Detecta una noticia relevante para PAZO.
3. Redacta la publicación del feed y los textos de push y notificación, con sus variantes.
4. Calcula la audiencia con los datos de Supabase.
5. Envía al PO una tarjeta de aprobación: fuente, prioridad sugerida, cuántos recibirán push, cuántos notificación, y visibilidad en el feed. Opciones: Aprobar, Editar, Solo feed, Rechazar.
6. Solo tras la aprobación publica y envía. Después muestra resultados (aperturas, vacunas registradas).

Reglas de seguridad acordadas:

- Estados en el servidor: borrador → aprobada → enviada. La función de envío rechaza cualquier alerta sin aprobación registrada del PO.
- La audiencia se recalcula en el momento del envío.
- Prioridades: alta (push inmediato), media (push con tope semanal y horas de silencio), baja (solo feed).
- Al tocar el push se abre la publicación del feed, con una franja personal ("Esto aplica a Max") y un botón para actualizar la vacuna.
- Las publicaciones del Vigilante salen de una cuenta oficial "PAZO" con insignia Oficial, separada de la cuenta personal del PO (insignia Fundador) y de los permisos de administrador.

## Auditoría del código (solo lectura, 3-nov-2026)

Revisado sobre `origin/main` `6c67288d` (#199) y el esquema real de Supabase con consultas de catálogo y conteos agregados.

Ya existe:

- Cola de push en servidor (`push_private.outbox`) con reintentos, preferencias por categoría (`push_private.preferences`: sightings, community, care) y urgencia alta (`supabase/functions/pazo-push-worker/workerCore.mjs`).
- Notificaciones persistidas (`public.notifications`), categorías en UI: todas, cuidados, comunidad.
- Cuidados con categoría `vaccine` y fecha (`public.care_items`), con recordatorio push.
- Administración por `public.pazo_is_admin()` sobre `admin_private.admin_grants`.
- Insignia de Fundador en `profiles.is_founder`, mostrada en el perfil público vía `get_pet_founder_status`. El rol `authenticated` **no** puede actualizar esa columna.

Falta o no alcanza:

1. **Tipo de vacuna.** `care_items.title` es texto libre; no hay forma fiable de saber si es leptospirosis, rabia, etc. Bloqueo principal.
2. **Vencimiento.** Solo existe `due_date` (próxima fecha); hay que definirlo como vencimiento o añadir el dato.
3. **Zona.** `pets.zone` es texto libre y privado. Se necesita un dato estructurado (código postal o barrio de una lista).
4. **Comida.** `pets."dietPlan"` es texto libre, sin marca ni producto.
5. **Texto del push.** El worker usa textos fijos por tipo (decisión de seguridad: nada escrito por usuarios llega a la pantalla bloqueada). El Vigilante necesita un tipo nuevo con texto aprobado por el PO; `outbox.kind` tiene un CHECK que hay que ampliar.
6. **Destino del clic.** `public/sw.js` abre siempre `/?open=notifications`; falta abrir una publicación concreta.
7. **Autor oficial.** `posts` exige `pet_id` de una mascota propia (política `posts_owner_insert`); no hay forma de publicar como "PAZO". La insignia de Fundador no aparece en las tarjetas del feed.
8. **Nombres no reservados.** Los nombres de mascota no son únicos ni reservados; cualquiera puede llamarse "PAZO".

Datos reales en ese momento: 11 mascotas; 0 con zona; 0 con dieta; 0 vacunas registradas; 0 perfiles marcados como fundador; 1 suscripción push. **Hoy el Vigilante no podría segmentar a nadie**, por eso el primer paso es la captura de datos.

## Hoja de ruta (orden acordado con el PO)

1. **Captura de datos:** vacunas por tipo (lista cerrada) con vencimiento, y zona estructurada. Diseñar la experiencia para que el dueño lo viva como proteger a su mascota, no como una obligación. *Siguiente tema a planear.*
2. **Cuenta oficial PAZO** con insignia Oficial visible en el feed; marcar la cuenta del PO como Fundador; reservar el nombre "PAZO" y variantes.
3. **Push del Vigilante:** nuevo tipo en el outbox y apertura directa de la publicación al tocar el aviso.
4. **Bandeja de aprobación** en el panel admin, con el conteo de audiencia antes de enviar.
5. **Vigilante automático:** lectura de fuentes, borradores y propuesta de audiencia, siempre con aprobación del PO.

## Decisiones abiertas

- Fuentes concretas y su formato técnico: FDA (retiros), alertas del Condado de LA, Servicio Meteorológico (calor), AirNow (humo); posible alianza con Pet Disease Alerts.
- Reglas de audiencia por tipo de alerta.
- Tope de push por semana, horas de silencio y alertas simultáneas.
- Qué pasa si el PO no aprueba a tiempo una alerta urgente (propuesta: nunca se envía sola; insiste por otro canal).
- Canal de aprobación: panel admin más un push al PO.
- Costo de la IA que redacta.
- Riesgo legal y tono médico.
- Reparto: según `AGENTS.md`, ChatGPT programa y Codex/Claude ejecutan; este documento es la especificación de contexto.

## Material relacionado

- Investigación de crecimiento (local, fuera del repo): `reports/Oportunidades de crecimiento para PAZO.md` en la carpeta de trabajo del PO.
- Registro operativo local: `continuidad/ESTADO.md`, entrada VIGILANTE-AUDIT-01.
