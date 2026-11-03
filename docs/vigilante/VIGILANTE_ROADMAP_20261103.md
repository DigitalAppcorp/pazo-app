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

0. **Panel de notificaciones con catálogo único de tipos y plantillas de tarjeta** (diseño aprobado más abajo). Migrar primero los tipos actuales sin cambiar su comportamiento.
1. **Captura de datos:** vacunas por tipo (lista cerrada) con vencimiento, y zona estructurada. Diseñar la experiencia para que el dueño lo viva como proteger a su mascota, no como una obligación. *Siguiente tema a planear.*
2. **Cuenta oficial PAZO** con insignia Oficial visible en el feed; marcar la cuenta del PO como Fundador; reservar el nombre "PAZO" y variantes.
3. **Push del Vigilante:** nuevo tipo en el outbox y apertura directa de la publicación al tocar el aviso.
4. **Bandeja de aprobación** en el panel admin, con el conteo de audiencia antes de enviar.
5. **Vigilante automático:** lectura de fuentes, borradores y propuesta de audiencia, siempre con aprobación del PO.

## Paso 1 — diseño cerrado (solo planeación, 3-nov-2026)

Principio del PO: **no pedir datos por adelantado**. El dueño descubre el valor primero y después registra el dato con gusto.

1. **Código postal en el onboarding.** Campo opcional por hogar (cuenta), con botón de información: "Lo usamos solo para avisos de salud cerca de ti. Nadie más lo ve." Revisar antes cómo encaja con `src/features/onboarding/FirstUsePrompt.tsx` para no alargar el alta.
2. **Notificación de bienvenida** en la pantalla de notificaciones (no push). Texto corto, sin emojis (regla `test:no-emojis`):
   - ES: "Te damos la bienvenida a PAZO. Cuéntanos más de Max: su peso, qué come y su salud. Así te avisamos solo de lo que le importa a él. Puedes cambiarlo cuando quieras." Botón: "Completar perfil de Max".
   - EN: "Welcome to PAZO. Tell us more about Max: weight, food and health. We'll only alert you about what matters to him. Change it anytime."
   - Lleva al formulario de edición de la mascota; si no hay mascota, a "Agregar mascota"; si hay varias, primero elegir cuál.
   - También se envía a los usuarios existentes (no verán el onboarding nuevo).
3. **Vacunas sin pedirlas.** Nunca se le pide al usuario que registre vacunas. El Vigilante decide:
   - vacuna registrada y vigente: no avisa;
   - registrada y vencida: avisa que venció;
   - sin registrar: avisa la noticia y pregunta si la tiene.
4. **Opciones de vacuna en Cuidados.** Cuando el dueño elige "Vacuna" por su cuenta, el formulario ofrece tipos para tocar según especie (perro: Rabia, Moquillo/Parvo DHPP, Leptospirosis, Bordetella, Influenza canina, Otra; gato: Rabia, Triple felina, Leucemia felina, Otra), en lugar del título libre. Sin esto el Vigilante no puede leer las vacunas.
5. **Respuestas dentro del aviso del Vigilante:** "Ya la tiene" (registra la vacuna con el tipo marcado, fecha opcional, y deja de avisar), "No la tiene" (muestra qué hacer) y "No sé" (sugiere preguntar al veterinario).
6. **Datos con opciones, no texto libre**, en el formulario de la mascota:
   - fecha de nacimiento aproximada (mes y año) en lugar de la edad libre actual;
   - enfermedades de una lista (alergias, diabetes, cardiaco, respiratorio, convulsiones, Otra), siempre privadas, nunca en la ficha pública del QR;
   - comida: marca y producto. Los retiros de la FDA suelen anunciarse por marca y lote, así que el aviso dirá "revisa el lote en la bolsa". El escaneo de código de barras requiere librería o foto porque Safari en iPhone no lo lee de forma nativa.
7. **Alcance inicial:** perros y gatos.

## Riesgo: el panel de notificaciones (revisión 3-nov-2026)

Hoy cada tipo de notificación (`sighting`, `community_join`, `care_reminder`, `new_follower`, `admin_new_pet`, `admin_new_account`, `supporter_campaign`, `supporter_verified`) se maneja repartido en varios lugares:

- `src/features/notifications/notificationSource.ts`: categoría, referencias tipadas y textos;
- `src/features/notifications/supporterNotification.ts`: textos de Amigo de PAZO;
- `src/components/modals/NotificationsModal.tsx`: si se puede tocar, qué texto, qué icono y qué botón;
- `src/App.tsx` `handleOpenNotification`: cadena de if/else con el destino;
- `supabase/functions/pazo-push-worker/workerCore.mjs`: texto fijo del push;
- `push_private.outbox.kind`: CHECK con los tipos permitidos.

Lo que está bien: las referencias son tipadas y las escribe el servidor; un tipo desconocido se muestra como tarjeta simple que no se puede tocar (falla segura).
El riesgo: agregar un tipo obliga a tocar unos seis lugares. Si se olvida uno, la notificación queda sin destino, con el icono o texto equivocado, o el push sale y la tarjeta no reacciona. Las notificaciones con botones (Vigilante: "Ya la tiene / No la tiene / No sé") aumentan ese riesgo.

Propuesta (solo planeación):

1. **Catálogo único de tipos.** Un solo archivo donde cada tipo declara: categoría, icono, textos ES/EN, destino al tocar, botones de acción, cómo validar su referencia, y prioridad de push. El panel y `App.tsx` leen de ahí en lugar de tener cadenas propias.
2. **Tarjeta con acciones como componente común.** Los botones llaman a una función del servidor que valida la respuesta; la notificación guarda que ya se respondió y los botones se ocultan. Nada de texto libre del usuario.
3. **Falla segura igual que hoy.** Tipo desconocido o referencia inválida: tarjeta simple, sin destino ni botones.
4. **Prueba de contrato** (como las que ya usa PAZO): todo tipo permitido en la base de datos y en el worker de push debe existir en el catálogo, y al revés. Si falta uno, la prueba falla antes de publicar.
5. **Prueba visual** de cada tipo en la biblioteca de pantallas, incluida la tarjeta con botones.
6. Migrar los tipos actuales al catálogo **sin cambiar su comportamiento** antes de agregar los del Vigilante y la bienvenida.

### Diseño aprobado del panel (PO, 3-nov-2026; solo planeación)

- **Tipo y categoría son cosas distintas.** Cada notificación tiene un *tipo* (nuevo seguidor, alerta epidemiológica, cuidado agendado…) que decide su tarjeta. La *categoría* sigue siendo el filtro del panel y agrupa varios tipos.
- **Base común para todas las tarjetas:** icono, título, hora, punto de "nuevo" y la línea visual de PAZO.
- **Cuatro plantillas** sobre esa base; cada tipo elige una y define sus textos, icono, destino y botones:
  1. *Informativa*: solo avisa (bienvenida, nueva cuenta).
  2. *Para abrir algo*: lleva a una pantalla (nuevo seguidor, cuidado, nueva mascota).
  3. *Con respuesta*: trae botones ("Ya la tiene / No la tiene / No sé").
  4. *Alerta del Vigilante*: fuente oficial con fecha, franja personal ("Esto aplica a Max") y botones.
- **Orden por fecha de creación**, con tres excepciones:
  1. Las alertas importantes sin responder quedan fijadas arriba hasta que se respondan o caduquen; luego vuelven a su lugar por fecha.
  2. Las alertas caducan (brotes, calor): al caducar se ven atenuadas y sin botones.
  3. Las repetidas se agrupan ("3 nuevos seguidores"). Puede llegar después, pero el catálogo debe preverlo.

Este diseño es el **paso previo** al Vigilante: primero se migran los 8 tipos actuales al catálogo sin cambiar su comportamiento, y después se agregan la bienvenida y los tipos del Vigilante.

Nota: el clic en el push hoy abre siempre el panel de notificaciones. Para el Vigilante se puede conservar esa entrada única (push → panel → publicación), que es más simple y segura que abrir pantallas directamente desde el push.

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
