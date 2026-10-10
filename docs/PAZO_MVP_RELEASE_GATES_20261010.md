# PAZO — único carril de cierre del MVP (10 oct 2026)

**Decisión Product Owner:** «no nos compliquemos ... hay que priorizar la salida del MVP». Se congela F14 A3 avanzado; **no** avanzar borrador por borrador en el ejecutor de eliminación. La app aún no tiene usuarios externos validados. Primero salir a una beta pequeña, segura y medible; después invertir según uso.

## Fuente de este candidato de lanzamiento
- Rama **`release/mvp-beta-fast-track-20261010`** creada desde commit **`781069d6`** del PR #37, **antes de sus 132 commits posteriores de A3 avanzado**. Contiene las integraciones de PR #36/#37, Auth, reportes, moderación, UI legal, intake de eliminación, perfil recuperado y MapView funcional. Se verificó que **no tiene el endpoint `supabase/functions/f14-account-deletion/index.ts` ni `src/features/account/deletionExecutionPlan.ts`**; el Mapa no tiene `PLACES_MAP_DEVELOPMENT_ONLY`.
- **A3 avanzada no se pierde:** permanece en PR #37 y PR #38 sin merge; su código NO es dependencia del candidato RC. No cherry-pick SQL `f14_a3_*`, no instalar jobs ni nuevas migraciones.
- Continúan las decisiones de coste: desarrollo y QA en localhost con Supabase actual; **Vercel no se toca** hasta que exista RC aceptado; no servicios pagos nuevos ni borrado de los 6 usuarios de prueba actuales.

## Bajas de cuenta: MVP proporcional y verificable
- Ya funciona en Supabase la solicitud/estado/cancelación; la UI explica que **pedir la baja no equivale a que ya fue ejecutada**. Conservar tal cual, sin otro módulo automático.
- Operación provisional mediante `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md` y cola privada `supabase/queries/f14_beta_deletion_request_queue_READ_ONLY.sql`. Hay **0 solicitudes** en la inspección del 10 oct 2026. El PO autorizó publicar **appdigital.corp@gmail.com** como contacto de privacidad y soporte; se expone solo como enlace `mailto:` en la app. El UUID Auth del operador, sus credenciales y datos de solicitudes se mantienen privados.
- **No habilitar beta pública** hasta comprobar el cierre manual de **una cuenta nueva descartable** de extremo a extremo, la preservación de terceros y la atención real de la cola. Si hay dependencias/claims complejos, bloquear el caso y atenderlo individualmente; no mentir con `completed` ni borrar Auth primero. Una beta interna limitada puede seguir desarrollándose.

## Prioridades desde ahora (estrictamente en este orden)

| Orden | Gate mínimo | Estado y prueba decisiva |
|---|---|---|
| 1 | **Integración MVP limpia** | Rama RC desde commit pre-A3 creada. Comparar #36/#37/main y comprobar código+Mapa+Auth. **CI #608 SUCCESS** (2026-10-10, commit `4744d6f3`): `npm ci`, `test:governance`, build y lint concluido sin error. Comparación GitHub contra `main`: **ahead 167 / behind 0**, 98 archivos; no sustituye gate de merge/QA de RC. No tocar main todavía |
| 2 | **Auth — QA previamente aceptada** | **PASS del PO:** registro + sesión + mascota + Feed (2026-10-08); recuperación por enlace y formulario de nueva contraseña (2026-10-10). No repetir ni reabrir como bloqueo sin regresión demostrada. Código Auth devuelto al baseline aprobado `781069d6`. |
| 3 | **Moderación mínima real** | Denuncia y decisión ya probadas; falta verificar retirada real de medios de **un único objeto nuevo descartable** con seguridad del operador y comprobar URL/origen. Si purga automática está apagada, documentar y usar un flujo supervisado verdadero, sin prometer purga CDN |
| 4 | **Privacidad y salida segura** | Atención manual comprobada con cuenta de test separada; políticas/Terms definitivos (**operador identificado por PO: Alvarado Solutions LLC**; jurisdicción/domicilio legal de contacto, criterios de conservación y proceso real de baja aún pendientes); **contacto público de privacidad confirmado en ES/EN**. `LEGAL_RELEASE_READY=false` hasta que sean reales |
| 5 | **RC y lanzamiento** | QA móvil mínima de cambios nuevos, inventario/limpieza **autorizada** de datos de prueba, gate de merge revisado por PO; **solo después** decidir Vercel y exposición a público externo |

## Lo que NO haremos ahora
No nuevas insignias premium, mensajería real, diseños cosméticos, cambios de Mapa ya aprobado, más tests de splash/feed/cuidados ya aceptados, A3 de 30 tablas/leases/CDN ni cron/servicios pagados. Los controles de datos y privacidad que sí bloquean beta pública no se omiten: se resuelven de forma focalizada.

## Aceptación y colaboración del PO
Solo pedir al PO **una acción cuando sea indispensable**: confirmar jurisdicción/datos legales complementarios de Alvarado Solutions LLC y criterios reales de retención (operador y correo de privacidad ya aprobados); y aprobar por separado una prueba destructiva estrictamente de cuenta/archivo descartables o el merge/producción. No pedir otra aprobación general para continuar auditoría/código seguro. No mezclar un «CI PASS» con «beta lanzada».

**Estado actual:** carril de integración y operación manual preparado; lanzamiento aún **NO aprobado** y eliminación definitiva **NO probada**. La versión avanzada A3 permanece en pausa, preservada en GitHub.

## Corrección de QA Auth — evidencia aceptada, NO RETEST (2026-10-10)

- **Evidencia anterior documentada del PO:** `LOCAL AUTH PASS` (2026-10-08) para registro, creación de mascota, Feed y persistencia tras recarga; **«listo, funcionó»** (2026-10-10) para enlace de recuperación y formulario de nueva contraseña. El PO reiteró que ya había hecho la prueba. Se reconoce como **QA aceptada**; no solicitarla de nuevo.
- El cambio reciente que añadía `emailRedirectTo` y un helper nuevo a `signUp` no estaba motivado por una regresión observada y reabría QA sin necesidad. **Revertido** en esta rama: `AuthContext.tsx`, `signupFlow.ts` y `signupFlow.test.mjs` restaurados desde el baseline de código `781069d6`. La recuperación conserva su lógica que ya fue aprobada. No volver a introducir un cambio en Auth por especulación.
- **Siguiente P0 efectivo:** revisar integración/RC y bloqueos de salida de privacidad (responsable legal, política/retención) y procedimiento manual de baja; usar evidencias de moderación existentes y verificar solo lagunas concretas, no repetir módulos probados.
- Contacto público `appdigital.corp@gmail.com` y **Alvarado Solutions LLC como operador** confirmados por PO; `LEGAL_RELEASE_READY=false` por datos legales complementarios, retención y baja real pendientes, no por Auth. Sin Vercel, `main`, Supabase write ni eliminación de cuentas.

## Identificación del operador del servicio — decisión PO (2026-10-10)

**Operador declarado por el Product Owner:** **Alvarado Solutions LLC**, empresa que el PO indica está registrada. Se incorporó una única constante en `src/features/legal/legalCopy.ts` y la atribución en Privacidad/Términos ES y EN; se añadió prueba anti-regresión. **El PO confirmó California como estado de registro**, sin comprobación independiente en el registro oficial. No inventar domicilio, agente registrado ni datos no aportados; no confundir la cuenta de soporte con la entidad responsable. El correo público autorizado sigue siendo `appdigital.corp@gmail.com`.

**Gate legal restante:** confirmar información legal de contacto exigible, fecha efectiva, retención real y operación de solicitudes de baja; revisión final del texto. `LEGAL_RELEASE_READY=false` hasta entonces. Auth y módulos funcionales ya aprobados NO se reensayan. No tocar Vercel, Supabase ni `main`.

## 2026-10-10 — CI RC y operación moderadora real

- **CI RC oficialmente confirmado:** GitHub Actions #608 `SUCCESS`, commit `4744d6f3`, job `verify`: Checkout, Node 22, npm ci, pruebas de gobernanza/privacidad/MVP, build y lint, todas las etapas marcadas `success`. Evidencia: https://github.com/DigitalAppcorp/pazo-app/actions/runs/38056411791. No repetir suites de Auth, Feed, Comunidades, Cuidados, Lugares ya aprobadas.
- **Comparación contra main:** `ahead=167`, `behind=0`, 98 rutas modificadas/añadidas. PR #36 continúa DRAFT; #37/#38 se conservan pausados. **No hacer merge automático** ni usar los PRs A3 completos como lanzamiento.
- **Bloqueo operativo hallado en DB (solo SELECT):** `moderation_private.moderator_grants` **0 filas**. `public.f14_is_moderator()` exige `auth.uid()` presente en esa tabla, así que **nadie puede administrar denuncias desde la interfaz** tras el reset. La cuenta previamente designada para tareas internas existe **una sola vez y está confirmada** en Auth, pero **NO tiene permiso de moderador**. Una autorización de atención de soporte/privacidad no equivale automáticamente a esta concesión. **Gate pendiente de PO:** aprobación explícita para otorgar el rol mínimo de moderador a esa cuenta, con SQL auditado y verificación posterior. No activar `service_role` en frontend ni almacenar UUID Auth en documentación.
- Estado hosted agregado: 6 cuentas Auth, 1 perfil, 1 mascota y 1 avatar `pet-avatars`; 0 posts, comentarios, comunidades, denuncias pendientes, solicitudes de baja y claims retenidos. Estos son datos de prueba. La tabla histórica de reset con cero productos ya **no es el estado actual**. No borrar ni modificar estas cuentas/archivos.
- **Permanece pendiente**: operación supervisada real de eliminación de una cuenta **nueva descartable** y, en su caso, retirada física de **un medio nuevo descartable** bajo un gate específico; cierre final del texto legal y política de conservación verificable. `LEGAL_RELEASE_READY=false`, automatización A3 en pausa, Edge de purge apagado, sin Vercel.

## 2026-10-10 — reconciliación de retención sin expandir alcance

- Auditoría read-only de categorías PostgreSQL y código de observabilidad. Se preparó `docs/PAZO_MVP_RETENTION_MATRIX_DRAFT_20261010.md`: criterios por categoría (cuenta, posts, archivos, cuidados, rescate, moderación, soporte, eventos, logs y backups), sin prometer plazos no configurados. Política ES/EN en `legalCopy.ts` explica limitaciones reales y `legalCopy.test.mjs` las verifica. **`LEGAL_RELEASE_READY=false`**; faltan validación de operación manual de baja y términos/retención efectivos de proveedores antes de aprobación pública.
- Se detectó que `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql` en la rama RC seguía ejecutable por accidente; se insertó un `RAISE EXCEPTION` previo al primer `ALTER TABLE` y una prueba de contrato. **No** constituye reanudación de A3; solo evita DDL accidental. No se aplicó SQL alojado.
- QA funcional previa del PO sigue aceptada sin repetición; A3 automatizado en pausa, medio de moderación desactivado. No tocar Vercel, `main` ni las cuentas actuales. **CI completo del RC no verificado**; no declarar PASS de la rama por comprobaciones estáticas.

## Gate moderador — aprobado por PO, escritura bloqueada (2026-10-10)

- PO autorizó explícitamente asignar rol de moderador PAZO a la cuenta de soporte/privacidad previamente designada. No autorizó más privilegios ni cambios generales.
- Inspección de solo lectura: una única cuenta confirmada y no suspendida; la tabla privada moderation_private.moderator_grants guarda user_id, granted_at y granted_by. El rol se comprueba por public.f14_is_moderator(). Roles anon/authenticated sin USAGE del esquema privado y sin privilegio INSERT.
- Intento de concesión con cardinalidad exacta e idempotencia: BLOQUEADO por controles de seguridad de la herramienta. No eludir ese bloqueo mediante otro mecanismo.
- VERIFICACIÓN POSTERIOR READ-ONLY: total_moderators=0, target_grants=0, auth_accounts=6 y pending_reports=0. **PERMISO NO APLICADO.** Ninguna cuenta ni dato modificado.
- Próximo paso: un administrador autorizado debe aplicar la concesión por el canal permitido y confirmar con sesión real del destinatario que la cola está disponible y que un usuario normal sigue denegado. Media Purge permanece OFF. La autorización del PO ya está documentada; no solicitarla de nuevo.

## 2026-10-10 — revisión mínima y real de baja (sin A3 automático)

- GitHub Actions **CI #614 SUCCESS**, commit `5962d8b4` (https://github.com/DigitalAppcorp/pazo-app/actions/runs/38058821560). CI **#616 SUCCESS**, commit `acd09781` (https://github.com/DigitalAppcorp/pazo-app/actions/runs/38059208273); incluye la nueva protección del preflight.
- Supabase READ-ONLY confirmó que la cuenta aprobada tiene **1 grant de moderación** y que siguen **6 cuentas Auth** y **0 solicitudes de baja activas**. El usuario titular no es alterado; el UUID interno no se incorpora a GitHub.
- Se auditó FK en hosted: `public.pets.owner_id` y `public.posts.user_id` exigen cleanup previo para borrar Auth; `public.community_posts.author_user_id` lleva CASCADE, por lo que se prohíbe eliminar indiscriminadamente los hilos de otras personas. Las solicitudes privadas carecen de FK a Auth, por lo que requieren tratamiento/retención final manual documentado.
- **Protección de último moderador:** `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` ahora devuelve `blocked_last_moderator` si el solicitante es el único moderador. Verificado con ejecución READ-ONLY del preflight contra la cuenta operadora (sin exponer ID): resultado **blocked_last_moderator**. CI contrato PASS. No existe SQL que borre cuentas ni nueva Edge.
- El intake de baja existe; **en builds públicos el botón está apagado** por `VITE_F14_DELETION_REQUESTS_ENABLED` hasta completar la operación manual verificable. No publicitar opción inaccesible ni activarla sin operador de soporte.
- **Siguiente gate único:** ensayo limitado con cuenta nueva descartable, previa aprobación específica para borrar esa identidad y sus medios; nunca usar las seis existentes. Después confirmar las políticas públicas ES/EN y la release candidate. No repetir Auth, Feed, Comunidades, Mapa ni Moderación ya aprobados sin defecto concreto.


## Desbloqueo del cierre administrativo: ensayo único QA, autorizado, aún NO ejecutado

Work se detuvo correctamente antes de crear la cuenta por no existir un procedimiento aprobado para marcar `completed`. Se auditaron la tabla real de solicitudes (estados `requested / cancelled / processing / completed`, `processed_at` obligatorio al completar) y sus FKs: **no hay FK de la solicitud hacia Auth**, de modo que el registro puede finalizarse **después** de borrar Auth.

Se aprobaron **DOS plantillas restringidas a la cuenta QA identificada por el alias exacto** y al entorno inicial de seis usuarios / un moderador / una mascota / un objeto:

- `supabase/queries/f14_qa_begin_processing_ADMIN_ONLY.sql`: **solo después** de enviar desde la cuenta QA su propia solicitud `requested`, validar preflight y asegurar ausencia de hilos ajenos. Ejecutar en SQL Editor de administrador; cambia **únicamente esa fila** de `requested` a `processing`. Falla cerrado si no hay exactamente siete cuentas, si el moderador no coincide, si el alias no está confirmado o hay otras solicitudes en curso.
- `supabase/queries/f14_qa_complete_verified_ADMIN_ONLY.sql`: **después** de retirar solo el avatar propio mediante Storage, borrar los datos propios con verificación de titularidad, cerrar Auth mediante **Auth Admin oficial** y confirmar que continúan las **seis cuentas originales** y la línea base de mascotas/Storage. Reemplazar el UUID de ceros por el UUID exacto de la QA capturado antes del cierre. Marca **una sola fila `processing`** como `completed` con `processed_at` y bloquea si queda Auth, mascota, avatar, publicación, comunidad, moderador alterado o petición ajena.

**No ejecutar ambos scripts seguidos:** entre fase 1 y 2 debe realizarse y verificarse el borrado real. Cada bloque es una transacción acotada que falla cerrado; no son funciones públicas, DDL, Edge, migraciones ni borradores de A3. La fase 2 no garantiza automáticamente borrado de caché/CDN ni de copias de seguridad: registrar sus límites honestamente. El operador de Work debe revisar preflight y confirmar los seis **UUID anteriores**, sin divulgarlos en el repositorio, antes de cualquier borrado irreversible.

El PO ya aprobó crear/borrar **una cuenta nueva**; no volver a pedir autorización genérica, pero detenerse ante bloqueos concretos (por ejemplo, falta de sesión de PAZO o Auth Admin). Si la QA no usa el alias exacto `appdigital.corp+pazo-baja-qa@gmail.com`, **no modificar el script para abrir el alcance**. Volver a planificar el ensayo seguro. No ejecutar nada sobre las seis cuentas.

**Estado actual:** ninguna cuenta QA creada, cero solicitudes; **procedimiento preparado, NO ensayado**, lanzamiento beta pública todavía bloqueado.


## Revisión legal acotada — CalOPPA / salida pública (2026-10-10)

**Auditoría solo lectura; no se publica la política ni se habilita `LEGAL_RELEASE_READY`.**
La pantalla de registro `src/components/views/OnboardingView.tsx` ya contiene enlaces a los borradores ES/EN de Privacidad y Reglas **antes** de crear la cuenta; no rediseñar Auth ni repetir QA aprobada. Verificar visibilidad suficientemente prominente también en la ruta inicial al publicar.

**Solo faltan estas comprobaciones de texto y operación:** (1) enumerar tipos de datos y terceros/proveedores reales, diferenciando Supabase, Mapbox y PostHog si se habilita; (2) explicar contacto/corrección/baja auténticos, incluido que el botón de baja está apagado en builds públicos hasta aprobar su procedimiento; (3) explicar cómo se notificarán cambios materiales de la política; (4) fijar **fecha efectiva al publicar**, nunca anticiparla; (5) documentar cómo responde el servicio a `Do Not Track` y si terceros pueden recopilar información identificable; (6) describir ubicación voluntaria frente a check-ins guardados y contacto de avistamientos. Estas declaraciones requieren reconciliación con el producto y configuración de proveedores, no nuevas funcionalidades.

**CalOPPA** exige una política visible para servicios comerciales que recopilan información identificable de consumidores en California, y declaraciones de categorías, terceros, cambios, fecha efectiva y Do Not Track. Fuentes oficiales:
- https://oag.ca.gov/news/press-releases/attorney-general-kamala-d-harris-launches-new-tool-help-consumers-report
- https://oag.ca.gov/sites/all/files/agweb/pdfs/privacy/COPP_bus_reportinfo_sharing1.pdf

**No asumir que la CCPA/CPRA se aplica o no** sin evaluar sus umbrales y condiciones reales de empresa. CPPA FAQ: https://cppa.ca.gov/faq y umbrales actualizados: https://cppa.ca.gov/regulations/cpi_adjustment.html. El domicilio registral no se inventa ni se declara por defecto requisito universal de CalOPPA si no se ha verificado. El operador y correo público ya están confirmados por el PO. **El ensayo de baja de una cuenta QA sigue delegado exclusivamente a Codex:** `docs/PAZO_CODEX_PENDING_QA_20261010.md`. No tocar sus siete cuentas/archivo ni cambiar baselines.

## Gate operativo vigente — recorte explícito (2026-10-10)

El PO confirma: **lanzar un MVP pequeño y seguro sin prolongar mejoras no indispensables**.

| Condición de salida | Evidencia actual | Acción restante |
|---|---|---|
| Funcionalidad básica | QA del PO ya aceptada (Auth, Feed, Comunidades, Cuidados, Lugares) | No repetir salvo regresión observada |
| Telemetría opcional | PostHog apagado en código mediante `isObservabilityEnabled() => false` (commit `7f8f75ff`) | Cerrado para RC, no invertir más tiempo |
| Política/Reglas ES/EN | Borradores actualizados con operador, contacto, retención cualitativa, exclusión de PostHog y recurso Unsplash | Revisión mínima de precisión y aprobación de textos **finales**, fecha efectiva solo al publicar; `LEGAL_RELEASE_READY=false` |
| Baja manual | Intake y SOP disponibles, cuenta de ensayo reservada | Solo Codex certificará E2E de cuenta descartable; no intervenir |
| Moderación/media | Moderador DB asignado, flujo de denuncia documentado; media purge OFF | No afirmar retirada física de origen/CDN sin evidencia; dejar protocolo manual seguro |
| RC final | GitHub Actions #626 PASS en SHA anterior; HEAD actual no certificado | Comprobar CI en SHA definitivo y pedir gate PO antes de merge/deploy |

**Posbeta:** A3 avanzado, métricas PostHog, nuevas funcionalidades, mejora cosmética, auditorías ampliadas y automatización de medios. **No posponer:** falsedad material del aviso de privacidad, filtración activa, falta de atención real de solicitudes o seguridad básica. Sin nuevos proveedores pagados, cambios en Supabase, Vercel o main.

**Interpretación de avances anteriores:** cualquier instrucción histórica que pida reactivar PostHog o expandir la auditoría por rutina queda subordinada a este gate y al handoff vigente.
