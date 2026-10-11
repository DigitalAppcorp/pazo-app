# PAZO — Subhoja maestra: pendientes reales de cierre del MVP

## Delta de ejecución autorizado — 2026-10-10

Orden maestra PO posterior a esta subhoja: ejecutar P0/P1, **excluir T18–T20/P2, F13 y producción**. Supersede instrucciones antiguas de resolver P2 conjuntamente. HEAD inicial remoto verificado: `39c0238c55901e2f242f4e3fc990ffaf5f7ef97f`; copia aislada limpia, checkout original preservado. Sin Computer Use. Implementación de este delta: commit `fix(mvp): close functional P1 gaps and preserve unconfirmed community media`; SHA se registra en el delta de publicación antes del push.

| Tarea | Estado vigente | Cambio/archivo y prueba | Intervención pendiente |
|---|---|---|---|
| T01 | PASS | `CreateModal.tsx`: encuentro deshabilitado/próximamente, sin ruta comunidad ni éxito ficticio; recorrido React de botones | Ninguna para la corrección; smoke HTTPS en T12 |
| T02 | PASS | Menú perdido propio coincide con AlertModal; rutas ES/EN post/lugar/alerta verificadas | Ninguna para la corrección |
| T03 | PASS | `notificationSource.ts`, rescue mapper, modal y App: fuente tipada; solo sighting abre detalle; filtros Todas/Avistamientos; care oculto | Ninguna; T18 intacta |
| T04 | PASS | `HomeView.tsx`: Para ti/For you sobre Feed mixto; algoritmo/paginación intactos, fake door cercana localizada | Ninguna para la corrección |
| T05 | BLOQUEADO | Vercel protegido/READY inicial; URL pública Supabase explícita solo RC Preview y clave pública cotejada con proyecto; Mapbox ausente; protegido devuelve 403 | Acceso del conector al contenido protegido y clave pública Mapbox autorizada; comprobar mapa/lugares/3D real |
| T06 | BLOQUEADO | Callback origin + recovery; revisión del código sin localhost fijo | Acceso configuración Auth SITE_URL/allowlist y cuenta controlada designada para una recuperación HTTPS |
| T07 | BLOQUEADO | RPC/ACL presentes; flag Preview OFF; soporte directo en PetView; E2E histórico preservado | Designar operador/cola atendida antes de activar intake |
| T08 | BLOQUEADO | Historial F14 recuperado; SQL pendiente no aplicado; vía manual y verificador READ ONLY preparados en `PAZO_MVP_CLOSURE_OPERATIONS_20261010.md` | Elegir ruta y autorizar ensayo de un medio NUEVO; ruta A requiere acceso PostgreSQL schema-only fiel |
| T09 | BLOQUEADO | Tests PWA estáticos PASS; manifest/iconos/zoom/SW network-only; checklist Android/iOS preparada | Preview accesible y dos dispositivos reales |
| T10 | BLOQUEADO | ES/EN reconcilia operación manual; PostHog OFF, fecha null, mailto aprobado; docs reconciliadas | Operador/canal efectivo y revisión PO de operación; sin certificación legal/runtime |
| T11 | DECISIÓN PO | Inventario agregado READ ONLY y preflight/rollback/respaldo en runbook de cierre | Revisar plan, respaldo/restore efectivo; gates separados datos/main/dominio/release |
| T12 | BLOQUEADO | Smoke dirigido React/servicios, gobernanza/build PASS local; CI exacto requerido tras push | Smoke HTTPS, Mapbox/Auth y PWA esenciales aún pendientes |
| T13 | PASS | App pasa nombre/especie activos; demo neutra; dos mascotas sintéticas y ES/EN probadas | Ninguna para la corrección |
| T14 | PASS | Onboarding A01–A05 localizado; recorrido EN verifica payload de especie/intereses canónicos en español | Ninguna para la corrección |
| T15 | PASS | Guardas cuenta/demo en App, Crear y edición; modales de escritura cerrados sin cuenta, Feed demo sin señales de escritura | Ninguna para la corrección; no equivale a Auth HTTPS |
| T16 | PASS | DELETE verifica fila/ruta servidor; nunca borra Storage con evidencia incompleta; upload incierto conserva referencia y frena reenvío. Inventario SQL real + fallo sintético del servicio | Revisión periódica del operador y gate de retirada física separado en T08; no hay purga certificada |
| T17 | BLOQUEADO | Código fail-closed probado: falta/mal URL/proyecto ajeno/clave privada bloquean, pantalla anterior a import App; config correcta aceptada y URL explícita RC Preview | Confirmar login real en último Preview; 403 impide completar DoD de release |

Pruebas dirigidas reproducibles: `npm run test:closure` (**16 PASS**), incluidas en `test:governance`/GitHub Actions. Componentes renderizados con React en Node y dependencias Auth/DB sintéticas, **sin navegador, hosted writes ni declaración de PASS PostgreSQL**. El renderer emite aviso de deprecación, no fallo; no tiene dependencia runtime. Gobernanza PASS, `test:pwa` 3 PASS, build PASS, `git diff --check` PASS. Lint completo: **105 errores/6 avisos heredados**, no PASS; comparación con HEAD inicial en archivos tocados: **cero nuevos por regla**, mapper rescue reduce uno; helpers y componentes sin deuda pasan lint dirigido. App conserva 13 errores/5 avisos heredados; no hubo limpieza global. Bundle App ~593 kB mantiene warning >500 kB.

Inventario actual: 6 Auth, 1 profile, 1 pet, 0 posts/communities/community posts, 1 objeto pet-avatars, 1 grant moderador, 0 held claims, 1 solicitud completed/0 abiertas. Sin UUID de usuarios/objetos en Git. 55 FK hacia Auth/pets; no limpiar por conteo. `20261010222006` no figura aplicada. Primera tarea no cerrada: **T05**, continuar desde sus accesos/configuración sin reaudiar módulos aprobados. **F13 no iniciada**; los P0 runtime/operativos todavía impiden afirmar cierre técnico integral.


**Fecha de corte:** 2026-10-10  
**Decisión vigente del Product Owner:** terminar primero los pendientes técnicos/funcionales, dejar **F13 (rediseño visual) para el final**, y solo entonces decidir GO/NO-GO de beta pública.  
**Repositorio:** `DigitalAppcorp/pazo-app`  
**Rama exclusiva de trabajo:** `release/mvp-beta-fast-track-20261010`  
**Baseline auditado de código:** `2161825571647e62106b5c44edc2def1b17686d1`, GitHub Actions **#676 SUCCESS**.  
**Alcance de esta subhoja:** terminar y certificar lo imprescindible del MVP existente; **no** ampliar el producto.  
**Estado del lanzamiento:** **NO-GO público hasta cerrar los gates de esta hoja**. Preview `READY` no significa que cada flujo funcione en un navegador/dispositivo.

## 0. Cómo continuar sin releer toda la aplicación

1. Leer `AGENTS.md`, **esta subhoja** y únicamente los archivos enumerados en la tarea que vaya a ejecutarse; consultar `docs/PAZO_ACTIVE_HANDOFF.md` por cambios posteriores.
2. Comprobar SHA remoto y `git status` antes de escribir. Si algún archivo cambió después del baseline, revisar **solo su diff** y reconciliar el estado de su tarea; no aplicar estas líneas como órdenes ciegas.
3. Ejecutar **T01–T04 y micropendientes P1 T13–T17** primero, después **T05–T11** y al final **T12**. Registrar T18–T20 (P2) y resolverlos solo si son de bajo riesgo y no amplían alcance. Sin repetir QA de módulos aprobados salvo regresión.
4. Para cada tarea: verificar causa, producir cambio mínimo si hace falta, ejecutar pruebas dirigidas, registrar evidencia, actualizar su fila de estado, commit y push **solo a RC**. Los gates humanos no se sortean.
5. Mantener **F13 para después del cierre técnico**: es exclusivamente una colaboración del Product Owner y ChatGPT; nadie debe tomar decisiones estéticas por él.
6. Esta subhoja es un **índice operativo de pendientes**. El roadmap maestro mantiene el scope y las reglas de fase; los SOP privados y contratos SQL conservan su autoridad técnica. Ante contradicción, no inferir permisos de un documento más reciente: pedir el gate correcto.

**Estados:** `POR HACER` (defecto o tarea confirmada), `POR VERIFICAR` (código existe, falta ejecución real), `BLOQUEADO` (dependencia/acceso concretos), `DECISIÓN PO` (requiere una elección/permiso), `PASS` (evidencia y criterio de cierre cumplidos), `POSBETA` (no bloquear).  
**Priorización:** P0 = riesgo o requisito de salida; P1 = inconsistencia funcional/UX que debe corregirse antes de rediseño; P2 = optimización o producto futuro.

## 1. Baseline: qué ya funciona y NO se vuelve a construir

- El Product Owner ya probó Auth, creación de mascotas, Feed/interacciones/comentarios, Comunidades, Cuidados, Lugares, perfiles y navegación local. Conservar esa evidencia; no rehacer flujos completos sin regresión.
- Eliminación **manual** de una cuenta QA descartable: E2E `requested → processing → completed` **PASS**. No repetir ni borrar otras cuentas. `docs/PAZO_CODEX_PENDING_QA_20261010.md`, `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`.
- Moderación: reportar/descartar/despublicar y ocultar contenido por RLS tienen implementación y pruebas; la retirada **física** de imágenes es independiente (T08). No activar Edge global por implicación.
- PWA: `manifest.webmanifest`, iconos, `sw.js` network-only y registro están implementados; CI y pruebas locales PASS. Falta instalación real HTTPS (T09).
- Mapbox: existe implementación de mapas y modelos GLTF 3D por categoría, y el PO reportó mapa local funcionando; no confundir con token presente en el Preview (T05).
- `PostHog` está **OFF en código** mediante `isObservabilityEnabled() => false`, intencional para beta. No activarlo.
- La rama RC está por delante de `main`; ningún PASS de RC sustituye merge, configuración real ni autorización final.
- GitHub Actions `#676` en baseline `216182557`: SUCCESS de instalación, gobernanza y build; **no** prueba SQL PostgreSQL, navegador Preview, instalación física o purga Storage.

## 2. Pendientes funcionales verificables en el código (hacer ANTES de F13)

### T01 — «Crear Encuentro» ejecuta una acción diferente
- **Prioridad/estado:** **P1 / PASS**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/components/modals/CreateModal.tsx:116-136` muestra «Crear Encuentro»; con `onSelectOption` llama `onSelectOption('comunidad')`. `src/App.tsx:1935-1952` interpreta `comunidad` como abrir **crear comunidad**, no crear encuentro. El subflujo alternativo no montado de `CreateModal.tsx:300-349` tiene un `alert('¡Encuentro publicado!')` **sin persistencia**.
- **Alcance mínimo:** hacer veraz la CTA. No implementar calendarios/eventos F10+; si es una fake door, rotularla expresamente como «en desarrollo» y enviar a un experimento ya aprobado, o retirarla del menú principal si no existe tal ruta. Corregir/eliminar el falso mensaje de «publicado» en el subflujo muerto para que no quede una promesa engañosa.
- **DoD:** ninguna acción visible sugiere que un encuentro fue creado sin registro real; CTA/etiquetas/ruta coherentes en ES/EN; prueba dirigida de selección. **No** tocar diseño F13.

### T02 — CTA de «Pérdida o Hallazgo» solo abre pérdida propia
- **Prioridad/estado:** **P1 / PASS**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/components/modals/CreateModal.tsx:163-174` anuncia «Alerta de Pérdida o Hallazgo» y emite `alerta`; `src/App.tsx:1938-1952` abre `AlertModal` para la **mascota activa**; `src/components/modals/AlertModal.tsx:23-121` ejecuta `activateLostPetAlert(pet.id)` o resuelve su alerta. Avistamientos de otras mascotas ya tienen flujo aparte (`PublicRescueView` / `submit_pet_sighting`).
- **Alcance mínimo:** corregir la promesa a «Reportar mi mascota perdida» o conectar a un flujo de hallazgo **existente y probado** si verdaderamente corresponde. No crear un segundo sistema de rescate.
- **DoD:** una persona sabe cuándo comunica pérdida propia y cuándo avista a otra mascota; no hay etiquetas engañosas; contrato de alerta conservado.

### T03 — Filtros y apertura de notificaciones no corresponden a sus datos
- **Prioridad/estado:** **P1 / PASS**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/components/modals/NotificationsModal.tsx:26-32,65-95` ofrece filtro «Cuidados»; `src/services/rescueService.ts:190-200` mapea `type='sighting'` a `category='comunidad'` y otros a `'todas'`: no asigna `'cuidados'`. `NotificationsModal.tsx:104-113` habilita apertura para cualquier `'comunidad'` con `sourceId`; `src/App.tsx:1343-1368` envía `sourceId` a `SightingDetailModal` sin validar el tipo.
- **Alcance mínimo:** corroborar qué `type` existen realmente en `notifications` (solo lectura); si no hay cuidados persistentes como notificación, no ofrecer filtro vacío como si existieran. Enlazar apertura únicamente a fuentes compatibles (por ejemplo, `sighting`). No implementar notificaciones push ni un sistema general nuevo.
- **DoD:** filtros representan categorías existentes o se ocultan honradamente; ningún registro de tipo diferente se interpreta como avistamiento; pruebas sobre tipos presentes/ausentes.

### T04 — «Siguiendo» no excluye recomendados
- **Prioridad/estado:** **P1 / PASS**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/components/views/HomeView.tsx:157-174`: `displayedPosts = posts.filter(post => feedFilter === 'following' ? true : !post.isRecommended)`. En estado `following` muestra **todos los posts**, incluidos recomendados. `src/features/feed/selectFeedPage.ts` y `src/App.tsx:385-472` mezclan deliberadamente fuentes seguidas y recomendadas.
- **Decisión de producto que se debe preservar:** el Feed mixto recomendado + seguido forma parte del MVP. No eliminar recomendaciones para satisfacer una etiqueta incorrecta.
- **Alcance mínimo:** ajustar texto/estado visible para reflejar el Feed mixto (p. ej. «Para ti») y mantener la fake door «Cerca de mí» explícitamente futura, salvo decisión PO distinta.
- **DoD:** no se presenta un Feed mixto como exclusivamente «Siguiendo»; paginación e interacciones siguen íntegras; prueba dirigida.

## 3. Pendientes de configuración, seguridad y salida (NO son módulos nuevos)

### T05 — Preview HTTPS, Mapbox y configuración pública
- **Prioridad/estado:** **P0 / BLOQUEADO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/features/places/map/MapboxMap.tsx:132-143` requiere `VITE_MAPBOX_ACCESS_TOKEN` y muestra error si falta. Lectura de Vercel el 2026-10-10: proyecto `pazo-app-t83r`, ID `prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH`; el Preview `216182557` está `READY` y la protección de acceso del proyecto está **activada**. En la lista de nombres de variables Preview figuran Supabase URL/clave pública y otras; **no** `VITE_MAPBOX_ACCESS_TOKEN`.
- **Acción:** con acceso autorizado, configurar una **clave pública** Mapbox en Preview, con restricciones de origen adecuadas; jamás añadir secretos al repo. Confirmar URL efectiva y que realmente carga el mapa, lista de lugares, modelos 3D y errores HTTP/consola. Usar solo un proyecto Vercel y evitar deployments repetidos. Producción y dominio oficial requieren gate PO.
- **DoD:** Preview protegido correspondiente al SHA de prueba, app cargando realmente, Mapbox funcional, configuración de Supabase pública válida, sin secretos privados `VITE_*`, capturas/logs de errores sin datos sensibles.

### T06 — Redirecciones Auth y correo real en entorno de salida
- **Prioridad/estado:** **P0 / BLOQUEADO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/context/AuthContext.tsx` y `src/features/auth/PasswordRecoveryView.tsx` implementan login/recuperación; el PO ya aceptó QA local, pero la allowlist real del dominio Preview/final y entrega de emails no se ha certificado por HTTPS para el SHA de salida.
- **Acción:** comprobar URL de callback, `SITE_URL` y redirects autorizados de Supabase Auth; verificar en el entorno de prueba **una** recuperación/confirmación real con cuenta controlada si el cambio de entorno lo exige, sin repetir la batería Auth anterior. No abrir redirects comodín inseguros ni publicar claves.
- **DoD:** enlace real de recuperación vuelve a la PWA del entorno correcto y permite completar el flujo; sin redireccionar a localhost; SOP de soporte conocido.

### T07 — Solicitud pública de baja y operador
- **Prioridad/estado:** **P0 / BLOQUEADO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/components/views/PetView.tsx:61-63,630-644`: `requestEnabled = import.meta.env.DEV || VITE_F14_DELETION_REQUESTS_ENABLED === 'true'`. En build público está apagado por defecto; `src/features/account/deletionRequestService.ts` usa `pazo_deletion_request`, `pazo_deletion_status` y `pazo_deletion_cancel`. E2E de baja manual fue PASS, **no repetirlo**.
- **Acción:** confirmar operador y canal de atención; comprobar flag en entorno final; activarlo **solo** con SOP y cola atendibles; ensayo **no destructivo** de visibilidad/estado según gate. Si no se activa, mantener contacto de soporte accesible y conciliar texto legal; no afirmar que el botón público funciona.
- **DoD:** canal real de solicitud y respuesta operativos; tratamiento conforme a la política publicada; sin borrar cuentas existentes; protección del último moderador intacta.

### T08 — Retirada física segura de medios moderados
- **Prioridad/estado:** **P0 / BLOQUEADO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `supabase/functions/f14-moderation-purge/index.ts` mantiene `F14_MEDIA_PURGE_RELEASE_APPROVED=false`; `supabase/migrations/20261010222006_f14_media_purge_retry_reconciliation.sql` **no aplicada** (historial alojado consultado hasta baseline). Las pruebas de código de reintento/claim no sustituyen PostgreSQL ni Storage real. `supabase/history/f14_applied/README.md` archiva 17 migraciones aplicadas; 15 SQL ausentes recuperados, una entrada de ensayo redactada y una ya versionada. Falta estructura base reproducible (sin `pg_dump` autorizado). No hay evidencia de retirada física real.
- **Rutas admisibles sin expandir A3:** **A)** cierre del rollout acotado: snapshot `schema-only` obtenido con acceso autorizado, PostgreSQL aislado, pruebas sobre claims/ACL/idempotencia, autorización específica de migración hosted y prueba de **un medio nuevo descartable**; mantener Edge OFF salvo el ensayo exacto aprobado. **B)** si el PO opta por posponer automatización: documentar y verificar **un procedimiento administrativo manual** de retirada del objeto exacto de Storage y de enlaces accesibles, identificación de propietario/referencias, bitácora y manejo de fallos. El procedimiento debe ser operable, no simplemente texto. Requiere gate destructivo acotado para cualquier ensayo real.
- **DoD beta:** existe **un método real, seguro y practicable** de actuar ante medios denunciados; no queda una URL pública activa ignorada tras afirmar retirada. No prometer purga total CDN, backups ni enlaces ya replicados. Si ninguna vía se verifica, **NO-GO público**. No reactivar A3 automatizado amplio ni ejecutar migraciones sin autorización.

### T09 — PWA realmente instalable y segura en HTTPS
- **Prioridad/estado:** **P0 / BLOQUEADO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `public/manifest.webmanifest`, `public/sw.js`, `src/features/pwa/registerPwa.ts`, `scripts/pwa-check.mjs` implementados y comprobados localmente. `sw.js` es network-only, sin precaché de datos autenticados. No consta instalación física Android Chrome/iOS Safari del SHA vigente.
- **Acción:** desde el Preview HTTPS que carga de verdad, comprobar manifest/iconos/SW. Instalar en Android Chrome e iOS Safari (Añadir a pantalla de inicio), abrir en standalone, recargar, salir/entrar, alternar cuenta de prueba cuando sea lícito, comprobar que no aparece contenido privado ajeno y que la navegación funciona. La emulación no sustituye teléfonos.
- **DoD:** evidencia explícita PASS de Android y de iOS (o gate técnico documentado si un dispositivo no está disponible), sin exposición de datos de sesión; la PWA instalable es **obligatoria** para MVP según PO.

### T10 — Política, soporte, moderación operativa y límites de servicio
- **Prioridad/estado:** **P0 / BLOQUEADO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/features/legal/legalCopy.ts:9-35` tiene `LEGAL_RELEASE_READY=true` (solo texto), `PAZO_LEGAL_EFFECTIVE_DATE=null`, Privacy/Terms ES/EN preparadas; describe baja manual, GPS voluntario, terceros y limitaciones de medios/backups. `PostHog` OFF por decisión PO.
- **Acción:** reconciliar versión legal con comportamiento real, contacto de soporte y administración de denuncias; fijar fecha **solo al publicar**; confirmar links visibles sin login donde corresponda y versión ES/EN. No inventar dirección, plazos de retención ni obligaciones legales no verificadas. Determinar cobertura real de contraseña filtrada en plan Free y mitigación sin pago automático.
- **DoD:** texto y operación coinciden, fechas correctas al release, operador puede atender solicitudes y moderación, links públicos accesibles.

### T11 — Preflight de publicación, datos de prueba y rollback
- **Prioridad/estado:** **P0 / DECISIÓN PO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `docs/PAZO_F14_TEST_DATA_RESET_20261010.md` y handoff describen datos prebeta y deseo de limpiar al salir. `main` no contiene todavía la rama RC. CI PASSED no es autorización para lanzar.
- **Acción:** inventario READ-ONLY de cuentas/perfiles/posts/archivos y dependencias; preparar un plan preciso de conservación y eliminación de **datos de prueba**, evitando borrar el único moderador o infraestructura. Solicitar autorización separada para operaciones irreversibles. Preparar release commit, CI exacto, respaldos/restauración/rollback del frontend y de las acciones alojadas.
- **DoD:** plan de limpieza revisado; ningún borrado accidental; GO/NO-GO explícito del PO antes de merge `main`, dominio y publicación. No modificar pago/costos ni automatizar el lanzamiento sin aprobación.

### T12 — Smoke final de integración (una sola pasada, no repetir pruebas viejas)
- **Prioridad/estado:** **P0 / BLOQUEADO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Acción:** verificar HEAD RC + GitHub Actions SUCCESS sobre el mismo SHA; desde HTTPS probar solo rutas tocadas T01–T11 y micropendientes T13–T20 efectivamente modificados, login/recovery/carga, mapa, alta/baja visible, denuncia y navegación de PWA; comparar con módulos aprobados para detectar regresión de alto impacto. Registrar PASS/FAIL con evidencias mínimas, redacciones privadas y rollback.
- **DoD:** ninguna regresión crítica atribuible a cambios recientes; lista real de bloqueos remanentes; RC aprobable por PO para pasar a F13. `npm run lint` completo presenta deuda heredada (~106 errores/6 avisos), y bundle de build ~813 kB: no declarar ambos PASS ni bloquear solo por warnings sin impacto demostrado; exigir lint dirigido en archivos modificados y métricas de carga razonables.

## 3A. Micropendientes de comportamiento, datos y texto (registrados para NO releer código)

Estas tareas provienen de inspección puntual del RC y se separan de F13. **P1** exige arreglo funcional o decisión de alcance antes del smoke final; **P2** queda en el inventario, se resuelve si es trivial y seguro, pero no se convierte automáticamente en bloqueador de beta. Trabajar T13–T20 junto con T01–T04 **antes** de T12, sin repetir QA completo de módulos no tocados.

### T13 — Menú Crear muestra nombre genérico en lugar de mascota activa
- **Prioridad/estado:** **P1 / PASS**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/components/modals/CreateModal.tsx:24-30,105-112` usa `activePetName='Mascota'` como valor por defecto y presenta «Compartir una foto o momento de {activePetName}». El montaje real `src/App.tsx:1935-1954` pasa `onSelectOption` y `lang`, **no** `activePetName` ni especie: con una mascota real sigue diciendo «Mascota».
- **Acción mínima:** pasar la identidad de `currentPet` al modal o mostrar copy neutro sin simulación de identidad. Conservar selectores, posts y navegación. No rediseñar.
- **DoD:** abrir Crear con dos mascotas diferentes refleja la mascota seleccionada; estado demo no muestra una identidad real inexistente; ES/EN coherentes; prueba dirigida.

### T14 — Idioma EN incompleto en registro y onboarding
- **Prioridad/estado:** **P1 / PASS**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/components/views/OnboardingView.tsx:175-237` permite alternar `lang`, pero cabecera, promesa de bienvenida y CTA («Su mundo, más cerca», «Comenzar», «Ya tengo una cuenta») están escritos directamente en español. `OnboardingView.tsx:243-264,285-301,365-640` conserva en español etiquetas, progreso, especies, privacidad, zona e intereses en pasos A02–A05. `src/components/views/HomeView.tsx:185-205` tiene texto español incluso en la rama inglesa de «Cerca de mí».
- **Acción mínima:** completar textos ES/EN de los flujos de alta/primer uso y fake door cercana; conservar valores internos de especies/intereses y su persistencia, sin modificar identificadores/semántica por traducir solo etiquetas.
- **DoD:** alternar ES/EN desde bienvenida hasta completar alta no deja CTA/instrucciones críticas en idioma incorrecto; no cambia payload ni dato guardado; prueba dirigida. No requiere rediseño F13.

### T15 — Modo demo permite iniciar acciones que requieren cuenta real
- **Prioridad/estado:** **P1 / PASS**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/App.tsx:1516-1517` considera `isDemoUser` una superficie autenticada a efectos de render; `App.tsx:1935-1960` ofrece el menú Crear y abre `CreatePostModal` sin condicionar `user`. `src/components/modals/CreatePostModal.tsx:85-116` intenta `supabase.auth.getUser()` y rechaza si no hay sesión real. En cambio Comunidades y Lugares sí se protegen con `Boolean(user?.id) && !isDemoUser`.
- **Acción mínima:** inspeccionar interacciones de demo (crear post, pérdida, subir archivo, sugerir lugar, abrir cuidados/documentos), impedir operaciones reales sin sesión y presentar «inicia sesión» o modo demostración no persistente, **sin** registros ficticios en la cuenta real.
- **DoD:** ninguna CTA de demo promete publicar datos que terminarán en error `No active session`; no existe escritura anónima no autorizada; usuarios reales conservan acciones; una prueba dirigida recorre el menú Crear en modo demo.

### T16 — Eliminación de post de Comunidad puede dejar foto pública huérfana
- **Prioridad/estado:** **P1 / PASS**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/services/communityService.ts:467-488` elimina primero el registro `community_posts`; luego intenta `storage.from(COMMUNITY_POST_BUCKET).remove([post.photoStoragePath])`. Si Storage falla, solo registra `console.error('Post eliminado; limpieza de imagen pendiente')`: no hay reintento persistente identificado en esa ruta. También `communityService.ts:418-464` intenta limpiar upload fallido y solo registra fallo si la limpieza falla. La foto podría seguir accesible por su URL mientras el post ya no existe.
- **Acción mínima:** auditar restricciones de Storage y flujo de usuario/propietario; definir reconciliación/cola administrativa verificable para errores parciales sin quitar permisos ni relajar RLS. Evitar false positives de `purged` o borrados de contenido de terceros. La retirada moderadora F14 T08 es un contrato separado.
- **DoD:** si falla la limpieza, el operador conserva referencia inequívoca y estado accionable; no se afirma eliminación física antes de comprobar ausencia; pruebas simuladas de fallo sin borrar medios actuales; cualquier operación destructiva requiere gate.

### T17 — Fallback silencioso de Supabase en el frontend
- **Prioridad/estado:** **P1 / BLOQUEADO**. Estado vigente y evidencia en el delta de ejecución al inicio.
- **Evidencia:** `src/services/supabaseClient.ts:3-12` usa URL y **publishable key pública** del proyecto alojado como fallback cuando faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_PUBLISHABLE_KEY`; el error de configuración posterior queda efectivamente inalcanzable. Es una clave pública, **no** `service_role`, pero un build mal configurado puede conectarse al proyecto incorrecto sin advertirlo.
- **Acción mínima:** revisar compatibilidad con entornos, y exigir que Preview/producción seleccionen explícitamente el proyecto esperado por variable de build; considerar fail-closed en builds de lanzamiento. Nunca sustituir la clave pública por un secreto ni cambiar el backend sin gate.
- **DoD:** faltan variables esenciales → build o pantalla indica configuración inválida en lugar de conectarse silenciosamente a otro proyecto; Preview sigue pudiendo iniciar sesión con publishable key correcta; prueba de configuración ausente y correcta.

### T18 — Tiempo relativo de notificaciones no calculado
- **Prioridad/estado:** **P2 / POR HACER CUANDO SE TOQUE T03**.
- **Evidencia:** `src/services/rescueService.ts:190-200` asigna `timeAgo: 'Reciente'` a **todas** las notificaciones aunque cada fila tiene `created_at`; `src/components/modals/NotificationsModal.tsx:139-143` lo muestra tal cual incluso con idioma EN. Una alerta antigua seguiría diciendo «Reciente».
- **Acción mínima:** derivar fecha legible real con localización ES/EN en componente o formatter; evitar depender de strings de UI fijos en DTO si son multilingües.
- **DoD:** notificación antigua muestra antigüedad/fecha honesta, EN no conserva «Reciente», y orden/paginación/sighting no cambian. Cerrar junto con T03 si es de bajo riesgo.

### T19 — Código duplicado e interfaces prototipo no utilizadas
- **Prioridad/estado:** **P2 / INVENTARIO, NO BLOQUEADOR AUTOMÁTICO**.
- **Evidencia:** existe `src/components/modals/CreateModal - copia.tsx`, definición histórica duplicada de `CreatePostModal`; `src/components/modals/CreateModal.tsx:35-67,190-349` contiene ramas internas `post` y `event` no usadas por el montaje actual que siempre pasa `onSelectOption` desde `App.tsx:1935-1954`. La rama `event` muestra éxito mediante `alert` sin guardar nada; `handlePublish` de la rama `post` usa una imagen Unsplash de fallback aunque no exista archivo.
- **Acción mínima:** tras verificar importaciones, retirar o neutralizar rutas muertas potencialmente engañosas, preservando `CreatePostModal.tsx` real y sin refactor extenso. T01 gobierna la promesa visible «Crear Encuentro».
- **DoD:** ningún fallback/prototipo puede anunciar publicación inexistente si se reutiliza; no se rompe menú actual; el duplicate solo se elimina después de comprobar no importación; lint dirigido y build PASS.

### T20 — Ubicación hardcodeada al crear publicaciones
- **Prioridad/estado:** **P2 / DECISIÓN DE ALCANCE, SIN CAMBIO AUTOMÁTICO**.
- **Evidencia:** `src/components/modals/CreatePostModal.tsx:140-150` fija `location: 'Los Ángeles, CA'` en el payload de cada publicación. La audiencia inicial de PAZO es Los Ángeles; **no implica por sí solo defecto en el MVP local**. Diferenciar de coordenadas privadas GPS: no añadir captura de ubicación involuntaria.
- **Acción mínima:** confirmar si esa etiqueta debe representar el área de lanzamiento o la zona general opcional de la mascota. No derivar ubicación exacta ni añadir tracking sin decisión PO y gobierno de privacidad.
- **DoD:** texto visible y dato persistido no afirman una ubicación individual falsa; tratamiento explícito conforme al scope LA; si se mantiene como localidad de comunidad, documentarlo.

## 4. ÚLTIMA fase de implementación antes de decidir beta

### F13 — Rediseño visual (RESERVADO AL PRODUCT OWNER)
- **Estado:** **PLANIFICADA; explícitamente pospuesta hasta después de T01–T12 por decisión PO**.
- **Alcance:** espaciado, tipografía, jerarquía, experiencia móvil, branding, iconografía y consistencia visual; revisar pantalla por pantalla **con el PO**. Puede usar Codex para ejecutar cambios visuales aprobados, pero nadie inventa decisiones estéticas.
- **Regla inamovible de `AGENTS.md`:** cero bordes/contornos/outlines/rings decorativos; excepción justificada solo para un campo de texto específico. Preservar contratos de dominio/DB, navegación y comportamiento.
- **DoD:** aprobación visual del PO sobre pantallas finales y smoke de regresión focalizado. Recién después solicitar GO/NO-GO final, merge/deploy público/fecha legal y acciones de datos expresamente autorizadas.

## 5. No abrir antes del lanzamiento (POSBETA, NO defectos del MVP)

- Mensajes privados reales (`MessagesModal.tsx` informa honestamente «en desarrollo» para cuentas reales; demo tiene muestras).
- Creación y asistencia a eventos/encuentros completos; **T01 solo corrige la falsa promesa del menú**.
- Feed geográfico real «Cerca de mí»; hoy es experimento de interés con aviso visible; **T04 solo corrige la etiqueta de Feed mixto**.
- Google/Apple OAuth (`OnboardingView.tsx` muestra botones deshabilitados y «próximamente»).
- Funciones premium y fake doors de Comunidades/Lugares, monetización, matching, adopciones, profesionales, tiendas.
- PostHog, automatizaciones avanzadas F14 A3, purga masiva y expansiones de infraestructura.
- Reescritura de `src/App.tsx` de >2.000 líneas, eliminación masiva de errores lint heredados, chunk splitting preventivo del bundle >500 kB; atender antes solo si una regresión real de seguridad/rendimiento lo justifica.
- La reparación estética/visual pertenece a **F13 al final**, no a los cambios técnicos T01–T12.

## 6. Orden operativa, responsables y cierre

| Orden | Tarea | Responsable primario | Condición de cierre |
| --- | --- | --- | --- |
| 1 | T01 CTA encuentro | Codex/ChatGPT | No anuncia creación falsa; pruebas dirigidas |
| 2 | T02 CTA rescate | Codex/ChatGPT | Etiqueta/ruta coherentes; sin modificar rescate |
| 3 | T03 notificaciones | Codex/ChatGPT | Filtros reales y apertura tipada |
| 4 | T04 Feed mixto | Codex/ChatGPT, decisión copy PO si afecta producto | Etiqueta honesta + paginación intacta |
| 4a | **T13–T17 micropendientes P1** | Codex/ChatGPT; PO en decisiones | copy funcional, demo, archivos y entorno verificables |
| 4b | **T18–T20 registro P2** | Codex/ChatGPT | incluir en cambios dirigidos solo si es seguro; no expandir beta |
| 5 | T05 Preview/Mapbox | ChatGPT + PO para credenciales, Codex si habilitado | HTTPS/mapa/modelos operativos en SHA |
| 6 | T06 Auth entorno | ChatGPT + PO | recovery/callback real sin localhost |
| 7 | T07 intake baja | ChatGPT + operador + PO | solicitud pública solo cuando atendible |
| 8 | T08 medios moderados | ChatGPT/Codex + gate PO | método físico seguro verificado |
| 9 | T09 PWA móvil | PO (teléfonos) + ChatGPT | Android/iOS standalone PASS |
| 10 | T10 legal/operación | ChatGPT + PO | textos/soporte/fecha de release correctos |
| 11 | T11 preflight y datos | ChatGPT + PO | checklist, autorización de borrados/merge |
| 12 | T12 smoke RC final | ChatGPT/Codex + PO | CI y regresión focalizada PASS |
| **Último** | **F13 visual** | **PO + ChatGPT** | aprobación explícita del diseño |
| **GO/NO-GO** | beta pública | **solo PO** | autorización de merge, dominio, datos y publicación |

### Condiciones generales de ejecución
- **No** actualizar `main`, borrar datos/Storage, activar purga global, aplicar SQL hosted o desplegar producción basándose solo en esta subhoja. Cada operación necesita autorización específica.
- No exponer claves en frontend que no sean **publishable/public**; no escribir secretos en Git, prompts, logs ni documentación.
- Antes de cada commit: `npm run test:governance`, `npm run build`, pruebas dirigidas relevantes, `git diff --check`; comprobar CI remoto del nuevo SHA. `npm run lint` completo se informa aunque esté en deuda, y los archivos modificados deben pasar su lint dirigido.
- Este archivo debe ser actualizado por **deltas** tras cada tarea: cambiar estado + referencia de commit/CI/prueba/gate; no duplicar handoffs kilométricos ni copiar datos privados.
- El handoff y el roadmap **enlazan aquí**. En la siguiente conversación basta abrir esta subhoja, revisar el HEAD y leer solo los archivos de la próxima tarea; no rehacer auditoría transversal.
